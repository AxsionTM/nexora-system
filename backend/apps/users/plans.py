"""Subscription plan definitions and limits."""
from decimal import Decimal
from django.utils import timezone

PLANS = {
    "free": {
        "name": "Бесплатный",
        "price": Decimal("0"),
        "max_workspaces": 1,
        "max_team_members": 2,
        "max_orders_per_month": 50,
        "ai_enabled": False,
        "features": ["1 workspace", "До 50 заказов / мес", "Базовая аналитика"],
    },
    "pro": {
        "name": "Pro",
        "price": Decimal("29"),
        "max_workspaces": 3,
        "max_team_members": 5,
        "max_orders_per_month": None,  # unlimited
        "ai_enabled": True,
        "features": [
            "До 3 workspace",
            "Безлимитные заказы",
            "Команда до 5",
            "AI-ассистент",
            "Интеграции",
        ],
    },
    "business": {
        "name": "Бизнес",
        "price": Decimal("79"),
        "max_workspaces": 10,
        "max_team_members": None,
        "max_orders_per_month": None,
        "ai_enabled": True,
        "features": [
            "До 10 workspace",
            "Безлимитная команда",
            "Роли и права",
            "AI-ассистент",
            "Приоритетная поддержка",
        ],
    },
}


def get_effective_plan(user) -> str:
    """Return active plan code; expired paid plans fall back to free."""
    plan = getattr(user, "plan", None) or "free"
    expires = getattr(user, "plan_expires_at", None)
    if plan != "free" and expires and expires < timezone.now():
        return "free"
    if plan not in PLANS:
        return "free"
    return plan


def get_plan_limits(user) -> dict:
    code = get_effective_plan(user)
    data = PLANS[code].copy()
    data["code"] = code
    return data
