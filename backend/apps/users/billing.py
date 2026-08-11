from decimal import Decimal
from datetime import timedelta
from django.db import transaction
from django.utils import timezone

from .models import User, WalletTransaction, SubscriptionHistory
from .plans import PLANS, get_effective_plan, get_plan_limits


def credit_balance(user: User, amount: Decimal, *, type: str, description: str = "", created_by=None) -> WalletTransaction:
    amount = Decimal(amount)
    if amount == 0:
        raise ValueError("Сумма не может быть 0")
    with transaction.atomic():
        user = User.objects.select_for_update().get(pk=user.pk)
        user.balance = (user.balance or Decimal("0")) + amount
        user.save(update_fields=["balance", "updated_at"])
        return WalletTransaction.objects.create(
            user=user,
            type=type,
            amount=amount,
            balance_after=user.balance,
            description=description,
            created_by=created_by,
        )


def debit_balance(user: User, amount: Decimal, *, type: str, description: str = "", created_by=None) -> WalletTransaction:
    amount = Decimal(amount)
    if amount <= 0:
        raise ValueError("Сумма списания должна быть > 0")
    with transaction.atomic():
        user = User.objects.select_for_update().get(pk=user.pk)
        if (user.balance or Decimal("0")) < amount:
            raise ValueError("Недостаточно средств на кошельке")
        user.balance = user.balance - amount
        user.save(update_fields=["balance", "updated_at"])
        return WalletTransaction.objects.create(
            user=user,
            type=type,
            amount=-amount,
            balance_after=user.balance,
            description=description,
            created_by=created_by,
        )


def purchase_plan(user: User, plan_code: str, months: int = 1) -> dict:
    if plan_code not in PLANS or plan_code == "free":
        raise ValueError("Нельзя купить этот план")
    plan = PLANS[plan_code]
    price = Decimal(plan["price"]) * months
    with transaction.atomic():
        debit_balance(
            user,
            price,
            type=WalletTransaction.Type.PURCHASE,
            description=f"Подписка {plan['name']} на {months} мес.",
        )
        user = User.objects.select_for_update().get(pk=user.pk)
        now = timezone.now()
        start = now
        # extend if already on same plan
        if user.plan == plan_code and user.plan_expires_at and user.plan_expires_at > now:
            start = user.plan_expires_at
        ends = start + timedelta(days=30 * months)
        user.plan = plan_code
        user.plan_expires_at = ends
        user.save(update_fields=["plan", "plan_expires_at", "updated_at"])
        SubscriptionHistory.objects.create(
            user=user,
            plan=plan_code,
            price=price,
            starts_at=start,
            ends_at=ends,
            note=f"Покупка на {months} мес.",
        )
    return {
        "plan": plan_code,
        "expires_at": ends.isoformat(),
        "paid": str(price),
        "balance": str(user.balance),
    }


def admin_set_plan(user: User, plan_code: str, months: int = 1, note: str = "", created_by=None):
    if plan_code not in PLANS:
        raise ValueError("Неизвестный план")
    now = timezone.now()
    ends = None if plan_code == "free" else now + timedelta(days=30 * months)
    user.plan = plan_code
    user.plan_expires_at = ends
    user.save(update_fields=["plan", "plan_expires_at", "updated_at"])
    SubscriptionHistory.objects.create(
        user=user,
        plan=plan_code,
        price=Decimal("0"),
        starts_at=now,
        ends_at=ends,
        note=note or "Выдано администратором",
    )
    return user
