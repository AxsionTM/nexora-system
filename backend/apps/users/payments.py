"""YooKassa payment integration for wallet top-ups."""
from __future__ import annotations

import json
import logging
import uuid
from decimal import Decimal

from django.conf import settings
from django.db import transaction

from .billing import credit_balance
from .models import User, WalletTransaction

logger = logging.getLogger(__name__)


def _shop_id() -> str:
    return getattr(settings, "YOOKASSA_SHOP_ID", "") or ""


def _secret_key() -> str:
    return getattr(settings, "YOOKASSA_SECRET_KEY", "") or ""


def is_configured() -> bool:
    return bool(_shop_id() and _secret_key())


def create_topup_payment(user: User, amount: Decimal, return_url: str) -> dict:
    """
    Create YooKassa payment. Returns checkout_url.
    Amount is in USD-equivalent units for display; YooKassa uses RUB by default —
    we charge amount as RUB for simplicity in TEST mode (document in .env).
    """
    amount = Decimal(amount)
    if amount <= 0:
        raise ValueError("Сумма должна быть больше 0")

    if not is_configured():
        # Dev fallback: instant credit when credentials missing (explicit)
        if getattr(settings, "YOOKASSA_DEV_AUTO_CREDIT", False):
            tx = credit_balance(
                user,
                amount,
                type=WalletTransaction.Type.DEPOSIT,
                description=f"DEV auto top-up ${amount}",
                created_by=user,
            )
            return {
                "mode": "dev_auto",
                "checkout_url": None,
                "payment_id": f"dev_{tx.id}",
                "message": f"DEV: баланс пополнен на ${amount} (YOOKASSA не настроен)",
                "balance": str(user.balance),
            }
        raise ValueError(
            "Платежи не настроены. Добавьте YOOKASSA_SHOP_ID и YOOKASSA_SECRET_KEY в .env"
        )

    import base64
    import urllib.request

    payment_id = str(uuid.uuid4())
    payload = {
        "amount": {"value": f"{amount:.2f}", "currency": "RUB"},
        "confirmation": {"type": "redirect", "return_url": return_url},
        "capture": True,
        "description": f"NEXORA wallet top-up user#{user.id}",
        "metadata": {
            "user_id": str(user.id),
            "type": "wallet_topup",
            "amount": str(amount),
        },
    }
    data = json.dumps(payload).encode("utf-8")
    auth = base64.b64encode(f"{_shop_id()}:{_secret_key()}".encode()).decode()
    req = urllib.request.Request(
        "https://api.yookassa.ru/v3/payments",
        data=data,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Basic {auth}",
            "Idempotence-Key": payment_id,
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            result = json.loads(resp.read().decode("utf-8"))
    except Exception as exc:
        logger.exception("YooKassa create payment failed")
        raise ValueError("Не удалось создать платёж. Попробуйте позже.") from exc

    conf = result.get("confirmation") or {}
    return {
        "mode": "yookassa",
        "checkout_url": conf.get("confirmation_url"),
        "payment_id": result.get("id"),
        "status": result.get("status"),
    }


def process_yookassa_webhook(body: dict) -> dict:
    """Handle payment.succeeded — credit wallet once."""
    event = body.get("event")
    obj = body.get("object") or {}
    if event != "payment.succeeded":
        return {"handled": False, "reason": event}

    meta = obj.get("metadata") or {}
    if meta.get("type") != "wallet_topup":
        return {"handled": False, "reason": "not_topup"}

    user_id = meta.get("user_id")
    amount_str = meta.get("amount") or (obj.get("amount") or {}).get("value")
    payment_id = obj.get("id")
    if not user_id or not amount_str:
        return {"handled": False, "reason": "missing_meta"}

    # Idempotency: skip if already credited for this payment
    existing = WalletTransaction.objects.filter(
        description__contains=f"yk:{payment_id}"
    ).exists()
    if existing:
        return {"handled": True, "duplicate": True}

    try:
        user = User.objects.get(pk=int(user_id))
    except User.DoesNotExist:
        return {"handled": False, "reason": "user_not_found"}

    amount = Decimal(str(amount_str))
    with transaction.atomic():
        credit_balance(
            user,
            amount,
            type=WalletTransaction.Type.DEPOSIT,
            description=f"Пополнение картой (yk:{payment_id})",
        )
    return {"handled": True, "user_id": user_id, "amount": str(amount)}
