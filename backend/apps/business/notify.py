"""
Outbound notifications to connected channels (Telegram, Email, Webhook, Slack).
Credentials for Telegram bot and SMTP live in .env only.
Per-workspace targets (chat_id, email to, webhook url) live in Integration.config.
"""
from __future__ import annotations

import json
import logging
import smtplib
import urllib.request
from email.mime.text import MIMEText
from typing import Any

from django.conf import settings

from .models import Integration, Workspace

logger = logging.getLogger(__name__)


def _get_integration(workspace: Workspace, provider: str) -> Integration | None:
    try:
        integ = Integration.objects.get(workspace=workspace, provider=provider)
    except Integration.DoesNotExist:
        return None
    if integ.status != Integration.Status.CONNECTED:
        return None
    return integ


def send_telegram(workspace: Workspace, text: str) -> bool:
    token = getattr(settings, "TELEGRAM_BOT_TOKEN", "") or ""
    if not token:
        logger.warning("TELEGRAM_BOT_TOKEN not set")
        return False
    integ = _get_integration(workspace, Integration.Provider.TELEGRAM)
    if not integ:
        return False
    chat_id = (integ.config or {}).get("chat_id")
    if not chat_id:
        logger.warning("Telegram connected but chat_id missing")
        return False
    try:
        url = f"https://api.telegram.org/bot{token}/sendMessage"
        body = json.dumps(
            {"chat_id": str(chat_id), "text": text, "disable_web_page_preview": True}
        ).encode("utf-8")
        req = urllib.request.Request(
            url, data=body, headers={"Content-Type": "application/json"}, method="POST"
        )
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read().decode("utf-8"))
        return bool(data.get("ok"))
    except Exception:
        logger.exception("Telegram send failed")
        return False


def send_email(workspace: Workspace, subject: str, body: str) -> bool:
    host = getattr(settings, "EMAIL_HOST", "") or ""
    port = int(getattr(settings, "EMAIL_PORT", 587) or 587)
    user = getattr(settings, "EMAIL_HOST_USER", "") or ""
    password = getattr(settings, "EMAIL_HOST_PASSWORD", "") or ""
    use_tls = getattr(settings, "EMAIL_USE_TLS", True)
    from_email = getattr(settings, "DEFAULT_FROM_EMAIL", user) or user

    if not host or not user:
        logger.warning("SMTP not configured")
        return False

    integ = _get_integration(workspace, Integration.Provider.EMAIL)
    if not integ:
        return False
    to_email = (integ.config or {}).get("to_email") or (integ.config or {}).get("email")
    if not to_email:
        logger.warning("Email integration without to_email")
        return False

    try:
        msg = MIMEText(body, "plain", "utf-8")
        msg["Subject"] = subject
        msg["From"] = from_email
        msg["To"] = to_email
        with smtplib.SMTP(host, port, timeout=20) as smtp:
            if use_tls:
                smtp.starttls()
            if password:
                smtp.login(user, password)
            smtp.sendmail(from_email, [to_email], msg.as_string())
        return True
    except Exception:
        logger.exception("Email send failed")
        return False


def send_webhook(workspace: Workspace, payload: dict[str, Any]) -> bool:
    integ = _get_integration(workspace, Integration.Provider.WEBHOOK)
    if not integ:
        return False
    url = (integ.config or {}).get("url")
    if not url:
        return False
    secret = (integ.config or {}).get("secret") or ""
    try:
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        headers = {"Content-Type": "application/json"}
        if secret:
            headers["X-Nexora-Secret"] = secret
        req = urllib.request.Request(url, data=body, headers=headers, method="POST")
        with urllib.request.urlopen(req, timeout=15) as resp:
            resp.read()
        return True
    except Exception:
        logger.exception("Webhook send failed")
        return False


def send_slack(workspace: Workspace, text: str) -> bool:
    integ = _get_integration(workspace, Integration.Provider.SLACK)
    if not integ:
        return False
    webhook_url = (integ.config or {}).get("webhook_url")
    if not webhook_url:
        return False
    try:
        body = json.dumps({"text": text}).encode("utf-8")
        req = urllib.request.Request(
            webhook_url, data=body, headers={"Content-Type": "application/json"}, method="POST"
        )
        with urllib.request.urlopen(req, timeout=15) as resp:
            resp.read()
        return True
    except Exception:
        logger.exception("Slack send failed")
        return False


def notify_event(
    workspace: Workspace,
    *,
    title: str,
    message: str,
    event: str = "system",
    extra: dict | None = None,
) -> dict[str, bool]:
    """Fan-out to all connected channels. Returns per-channel success flags."""
    text = f"{title}\n{message}".strip()
    results = {
        "telegram": send_telegram(workspace, text),
        "email": send_email(workspace, title, message),
        "webhook": send_webhook(
            workspace,
            {
                "event": event,
                "title": title,
                "message": message,
                "workspace": workspace.name,
                **(extra or {}),
            },
        ),
        "slack": send_slack(workspace, text),
    }
    return results
