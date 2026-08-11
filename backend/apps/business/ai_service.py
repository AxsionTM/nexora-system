"""
AI Business Assistant — Google Gemini.

Context is rebuilt from the database on every request (never cached).
"""
from __future__ import annotations

import json
import logging
import os
from datetime import datetime
from decimal import Decimal

from django.conf import settings
from django.utils import timezone

from .analytics import dashboard_summary, top_products, recent_orders, expenses_by_category
from .models import Workspace, Expense, Product, Order, Customer

logger = logging.getLogger(__name__)

def _clean_ai_text(text: str) -> str:
    """Remove markdown emphasis so UI does not show raw **."""
    if not text:
        return text
    import re
    text = text.replace("**", "")
    text = text.replace("__", "")
    text = re.sub(r"`+", "", text)
    text = re.sub(r"^#{1,6}\s*", "", text, flags=re.M)
    return text.strip()



def build_business_context(workspace: Workspace, period: str = "30D") -> dict:
    """Always live data from DB — no cache."""
    summary = dashboard_summary(workspace, period)
    tops = top_products(workspace, period, limit=8)
    recent = recent_orders(workspace, limit=10)
    expense_breakdown = expenses_by_category(workspace, period)

    # Low stock: any product with stock <= 10, active or not
    low_stock = list(
        Product.objects.filter(workspace=workspace, stock__lte=10)
        .order_by("stock")
        .values("name", "stock", "sku", "is_active", "price")[:15]
    )

    all_products = list(
        Product.objects.filter(workspace=workspace)
        .order_by("-stock")
        .values("name", "stock", "sku", "is_active", "price", "cost")[:30]
    )

    products_count = Product.objects.filter(workspace=workspace).count()
    customers_total = Customer.objects.filter(workspace=workspace).count()
    orders_total = Order.objects.filter(workspace=workspace).count()

    return {
        "generated_at": timezone.now().isoformat(),
        "workspace": workspace.name,
        "period": period,
        "period_label": summary.get("period_label", period),
        "kpis": {
            "revenue": summary["revenue"],
            "revenue_change_pct": summary["revenue_change"],
            "orders": summary["orders"],
            "orders_change_pct": summary["orders_change"],
            "customers_new_in_period": summary["customers"],
            "customers_total": customers_total,
            "expenses": summary["expenses"],
            "expenses_change_pct": summary["expenses_change"],
            "net_profit": summary["net_profit"],
            "net_profit_change_pct": summary["net_profit_change"],
            "average_order_value": summary["average_order_value"],
            "cancelled_orders": summary.get("cancelled_orders", 0),
            "cancelled_amount": summary.get("cancelled_amount", "0"),
            "products_count": products_count,
            "orders_total_all_time": orders_total,
        },
        "expenses_by_category": expense_breakdown,
        "top_products": tops,
        "recent_orders": recent,
        "low_stock_products": low_stock,
        "products_snapshot": all_products,
    }


def _format_context_for_prompt(ctx: dict) -> str:
    return json.dumps(ctx, ensure_ascii=False, indent=2, default=str)


def _call_gemini(
    system_prompt: str,
    question: str,
    history: list[dict] | None,
    api_key: str,
    model: str,
) -> tuple[str | None, str | None]:
    """
    Call Google Gemini generateContent.
    Returns (answer_text, error_message).
    """
    try:
        import urllib.request
        import urllib.error

        contents = []
        for h in (history or [])[-8:]:
            role = "user" if h.get("role") == "user" else "model"
            contents.append({"role": role, "parts": [{"text": h.get("content", "")}]})
        contents.append({"role": "user", "parts": [{"text": question}]})

        body = json.dumps(
            {
                "system_instruction": {"parts": [{"text": system_prompt}]},
                "contents": contents,
                "generationConfig": {
                    "temperature": 0.4,
                    "maxOutputTokens": 2048,
                    "topP": 0.95,
                },
            }
        ).encode("utf-8")

        url = (
            "https://generativelanguage.googleapis.com/v1beta/models/"
            f"{model}:generateContent?key={api_key}"
        )
        req = urllib.request.Request(
            url,
            data=body,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=60) as resp:
            data = json.loads(resp.read().decode("utf-8"))

        # Blocked / safety
        if data.get("promptFeedback", {}).get("blockReason"):
            reason = data["promptFeedback"]["blockReason"]
            return None, f"Запрос заблокирован моделью: {reason}"

        candidates = data.get("candidates") or []
        if not candidates:
            return None, f"Gemini не вернул ответ: {json.dumps(data)[:300]}"

        cand = candidates[0]
        if cand.get("finishReason") in ("SAFETY", "RECITATION"):
            return None, f"Ответ отклонён ({cand.get('finishReason')})"

        parts = cand.get("content", {}).get("parts") or []
        text = "".join(part.get("text", "") for part in parts).strip()
        if not text:
            return None, "Пустой ответ от Gemini"
        return text, None

    except urllib.error.HTTPError as exc:
        try:
            body = exc.read().decode("utf-8")[:500]
        except Exception:
            body = str(exc)
        logger.exception("Gemini HTTP error")
        return None, f"Ошибка Gemini HTTP {exc.code}: {body}"
    except Exception as exc:
        logger.exception("Gemini call failed")
        return None, f"Ошибка связи с Gemini: {exc}"


def answer_question(
    workspace: Workspace,
    question: str,
    history: list[dict] | None = None,
    period: str = "30D",
) -> dict:
    # Fresh snapshot every time
    ctx = build_business_context(workspace, period)
    context_text = _format_context_for_prompt(ctx)

    system_prompt = (
        "Ты — умный AI-ассистент платформы NEXORA для владельца бизнеса.\n"
        "Тебе переданы АКТУАЛЬНЫЕ данные из базы (поле generated_at — момент сбора).\n"
        "Правила:\n"
        "1) Используй ТОЛЬКО цифры из JSON ниже — не выдумывай.\n"
        "2) Отвечай на русском, ясно, по делу. НЕ используй markdown (**жирный**, # заголовки, `код`). Простой текст и списки через • или 1.\n"
        "3) Если спрашивают про остатки — смотри low_stock_products и products_snapshot.\n"
        "4) Выручка считается только по оплаченным неотменённым заказам.\n"
        "5) Отменённые заказы — это потери (cancelled_*), не доход.\n"
        "6) Если данных мало — честно скажи об этом.\n"
        "7) Не ссылайся на «прошлый ответ», если цифры в JSON другие — бери JSON.\n\n"
        f"ДАННЫЕ НА {ctx['generated_at']}:\n{context_text}"
    )

    api_key = (
        os.environ.get("GEMINI_API_KEY")
        or getattr(settings, "GEMINI_API_KEY", "")
        or ""
    ).strip()
    model = (
        os.environ.get("GEMINI_MODEL")
        or getattr(settings, "GEMINI_MODEL", "")
        or "gemini-2.5-flash"
    ).strip()

    answer = None
    provider = "gemini"
    error = None

    if not api_key:
        answer = (
            "⚠️ Не настроен GEMINI_API_KEY.\n\n"
            "Добавьте ключ Google AI Studio в файл `.env`:\n"
            "GEMINI_API_KEY=ваш_ключ\n"
            "GEMINI_MODEL=gemini-2.5-flash\n\n"
            "Затем перезапустите backend. "
            "Без ключа нейросеть не может отвечать — формульные ответы отключены."
        )
        provider = "error"
        error = "missing_api_key"
    else:
        answer, err = _call_gemini(system_prompt, question, history, api_key, model)
        if err:
            error = err
            answer = (
                f"Не удалось получить ответ от Gemini.\n\n"
                f"Причина: {err}\n\n"
                f"Проверьте ключ, модель ({model}) и доступ в интернет на сервере."
            )
            provider = "error"
        else:
            provider = "gemini"

    insights = generate_insights(ctx)

    return {
        "answer": _clean_ai_text(answer) if answer else answer,
        "provider": provider,
        "error": error,
        "insights": insights,
        "period": period,
        "context_generated_at": ctx["generated_at"],
    }


def generate_insights(
    ctx: dict | None = None,
    workspace: Workspace | None = None,
    period: str = "30D",
) -> list[str]:
    if ctx is None and workspace is not None:
        ctx = build_business_context(workspace, period)
    if not ctx:
        return []

    k = ctx["kpis"]
    insights = []

    rev_ch = float(k.get("revenue_change_pct") or 0)
    if rev_ch > 0:
        insights.append(f"Выручка выросла на {rev_ch}% за выбранный период.")
    elif rev_ch < 0:
        insights.append(
            f"Выручка снизилась на {abs(rev_ch)}% — стоит проверить воронку и трафик."
        )

    profit_ch = float(k.get("net_profit_change_pct") or 0)
    if profit_ch > 0:
        insights.append(
            f"Чистая прибыль выросла на {profit_ch}% (сейчас ${k['net_profit']})."
        )
    elif float(k.get("net_profit") or 0) < 0:
        insights.append("Чистая прибыль отрицательная: расходы превышают выручку.")

    exp_ch = float(k.get("expenses_change_pct") or 0)
    if exp_ch > 10:
        insights.append(f"Расходы выросли на {exp_ch}% — проверьте категории.")

    tops = ctx.get("top_products") or []
    if tops:
        insights.append(
            f"Лидер продаж: «{tops[0]['name']}» (${tops[0]['revenue']})."
        )

    low = ctx.get("low_stock_products") or []
    if low:
        insights.append(
            f"Низкий остаток у {len(low)} товар(ов), например «{low[0]['name']}» "
            f"({low[0]['stock']} шт.)."
        )

    cancelled = int(k.get("cancelled_orders") or 0)
    if cancelled > 0:
        insights.append(
            f"Отменённых заказов: {cancelled} на сумму ${k.get('cancelled_amount', 0)}."
        )

    if not insights:
        insights.append(
            "Недостаточно динамики для автоматических выводов — накопите больше данных."
        )

    return insights[:6]
