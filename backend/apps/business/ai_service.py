"""
AI Business Assistant service.

Builds a safe, scoped business context from the workspace and never
exposes raw ORM access or secrets to the model provider.
"""
from __future__ import annotations

import json
import logging
import os
import re
from decimal import Decimal

from django.conf import settings

from .analytics import dashboard_summary, top_products, recent_orders
from .models import Workspace, Expense, Product, Order

logger = logging.getLogger(__name__)


def build_business_context(workspace: Workspace, period: str = "30D") -> dict:
    summary = dashboard_summary(workspace, period)
    tops = top_products(workspace, period, limit=5)
    recent = recent_orders(workspace, limit=5)

    low_stock = list(
        Product.objects.filter(workspace=workspace, is_active=True, stock__lte=10)
        .values("name", "stock", "sku")[:5]
    )

    expense_cats = (
        Expense.objects.filter(workspace=workspace)
        .values("category")
        .order_by()
    )
    # lightweight category totals for last period are already in summary expenses

    return {
        "workspace": workspace.name,
        "period": period,
        "kpis": {
            "revenue": summary["revenue"],
            "revenue_change_pct": summary["revenue_change"],
            "orders": summary["orders"],
            "orders_change_pct": summary["orders_change"],
            "customers_new": summary["customers"],
            "expenses": summary["expenses"],
            "expenses_change_pct": summary["expenses_change"],
            "net_profit": summary["net_profit"],
            "net_profit_change_pct": summary["net_profit_change"],
            "average_order_value": summary["average_order_value"],
        },
        "top_products": tops,
        "recent_orders": recent,
        "low_stock": low_stock,
    }


def _format_context_for_prompt(ctx: dict) -> str:
    return json.dumps(ctx, ensure_ascii=False, indent=2)


def _fallback_answer(question: str, ctx: dict) -> str:
    """Rule-based answers when no AI API key is configured."""
    q = question.lower()
    k = ctx["kpis"]

    if any(w in q for w in ("прибыл", "profit", "марж")):
        return (
            f"Чистая прибыль за период {ctx['period']}: **${k['net_profit']}** "
            f"({k['net_profit_change_pct']:+.1f}% к прошлому периоду).\n\n"
            f"Выручка: ${k['revenue']}, расходы: ${k['expenses']}.\n"
            f"Прибыль = выручка − расходы."
        )

    if any(w in q for w in ("выручк", "revenue", "продаж")):
        return (
            f"Выручка за {ctx['period']}: **${k['revenue']}** "
            f"({k['revenue_change_pct']:+.1f}% к прошлому периоду).\n\n"
            f"Заказов: {k['orders']}, средний чек: ${k['average_order_value']}."
        )

    if any(w in q for w in ("расход", "expense", "трат")):
        return (
            f"Расходы за {ctx['period']}: **${k['expenses']}** "
            f"({k['expenses_change_pct']:+.1f}% к прошлому периоду).\n\n"
            f"Чистая прибыль после расходов: ${k['net_profit']}."
        )

    if any(w in q for w in ("товар", "product", "лучш", "топ")):
        lines = ["Топ товары по выручке:"]
        for i, p in enumerate(ctx.get("top_products") or [], 1):
            lines.append(f"{i}. {p['name']} — ${p['revenue']} ({p['quantity']} шт.)")
        if len(lines) == 1:
            lines.append("Пока недостаточно данных по продажам.")
        return "\n".join(lines)

    if any(w in q for w in ("остат", "склад", "stock", "мало")):
        items = ctx.get("low_stock") or []
        if not items:
            return "Товаров с критически низким остатком (≤10) сейчас нет."
        lines = ["Товары с низким остатком:"]
        for p in items:
            lines.append(f"• {p['name']} — {p['stock']} шт.")
        return "\n".join(lines)

    if any(w in q for w in ("заказ", "order")):
        lines = [
            f"Заказов за {ctx['period']}: **{k['orders']}** "
            f"({k['orders_change_pct']:+.1f}%).",
            "",
            "Последние заказы:",
        ]
        for o in ctx.get("recent_orders") or []:
            lines.append(
                f"• #{o['id']} — {o.get('customer_name') or '—'} — ${o['total']} ({o['status']})"
            )
        return "\n".join(lines)

    if any(w in q for w in ("сравн", "прошл", "измен", "динамик", "рост", "паден")):
        return (
            f"Сравнение с прошлым периодом ({ctx['period']}):\n"
            f"• Выручка: {k['revenue_change_pct']:+.1f}%\n"
            f"• Заказы: {k['orders_change_pct']:+.1f}%\n"
            f"• Расходы: {k['expenses_change_pct']:+.1f}%\n"
            f"• Чистая прибыль: {k['net_profit_change_pct']:+.1f}%\n\n"
            f"Текущая выручка ${k['revenue']}, прибыль ${k['net_profit']}."
        )

    # Generic overview
    return (
        f"Краткая сводка по «{ctx['workspace']}» за {ctx['period']}:\n\n"
        f"• Выручка: ${k['revenue']} ({k['revenue_change_pct']:+.1f}%)\n"
        f"• Заказы: {k['orders']} ({k['orders_change_pct']:+.1f}%)\n"
        f"• Расходы: ${k['expenses']}\n"
        f"• Чистая прибыль: ${k['net_profit']} ({k['net_profit_change_pct']:+.1f}%)\n"
        f"• Средний чек: ${k['average_order_value']}\n\n"
        f"Можете спросить подробнее: про прибыль, топ-товары, расходы или остатки."
    )


def _call_gemini(
    system_prompt: str,
    question: str,
    history: list[dict] | None,
    api_key: str,
    model: str,
) -> str | None:
    """Call Google Gemini generateContent API."""
    try:
        import urllib.request
        import urllib.error

        contents = []
        for h in (history or [])[-6:]:
            role = "user" if h["role"] == "user" else "model"
            contents.append({"role": role, "parts": [{"text": h["content"]}]})
        contents.append({"role": "user", "parts": [{"text": question}]})

        body = json.dumps(
            {
                "system_instruction": {"parts": [{"text": system_prompt}]},
                "contents": contents,
                "generationConfig": {
                    "temperature": 0.3,
                    "maxOutputTokens": 1024,
                },
            }
        ).encode("utf-8")

        url = (
            f"https://generativelanguage.googleapis.com/v1beta/models/"
            f"{model}:generateContent?key={api_key}"
        )
        req = urllib.request.Request(
            url,
            data=body,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=45) as resp:
            data = json.loads(resp.read().decode("utf-8"))

        candidates = data.get("candidates") or []
        if not candidates:
            logger.warning("Gemini returned no candidates: %s", data)
            return None
        parts = candidates[0].get("content", {}).get("parts") or []
        text = "".join(part.get("text", "") for part in parts).strip()
        return text or None
    except Exception as exc:
        logger.warning("Gemini call failed, using fallback: %s", exc)
        return None


def answer_question(
    workspace: Workspace,
    question: str,
    history: list[dict] | None = None,
    period: str = "30D",
) -> dict:
    ctx = build_business_context(workspace, period)
    context_text = _format_context_for_prompt(ctx)

    system_prompt = (
        "Ты — AI-ассистент платформы NEXORA для владельца малого бизнеса. "
        "Отвечай только на основе переданного JSON с бизнес-данными. "
        "Отвечай на русском, кратко и по делу. "
        "Не выдумывай цифры, которых нет в контексте. "
        "Если данных недостаточно — скажи об этом.\n\n"
        f"Данные workspace:\n{context_text}"
    )

    api_key = (
        os.environ.get("GEMINI_API_KEY")
        or getattr(settings, "GEMINI_API_KEY", "")
        or os.environ.get("OPENAI_API_KEY")  # backward-compatible env name
        or getattr(settings, "OPENAI_API_KEY", "")
    )
    model = (
        os.environ.get("GEMINI_MODEL")
        or getattr(settings, "GEMINI_MODEL", "")
        or "gemini-2.5-flash"
    )
    answer = None
    provider = "fallback"

    if api_key:
        answer = _call_gemini(system_prompt, question, history, api_key, model)
        if answer:
            provider = "gemini"

    if not answer:
        answer = _fallback_answer(question, ctx)
        provider = "fallback"

    insights = generate_insights(ctx)

    return {
        "answer": answer,
        "provider": provider,
        "insights": insights,
        "period": period,
    }


def generate_insights(ctx: dict | None = None, workspace: Workspace | None = None, period: str = "30D") -> list[str]:
    if ctx is None and workspace is not None:
        ctx = build_business_context(workspace, period)
    if not ctx:
        return []

    k = ctx["kpis"]
    insights = []

    rev_ch = k["revenue_change_pct"]
    if rev_ch > 0:
        insights.append(f"Выручка выросла на {rev_ch}% за выбранный период.")
    elif rev_ch < 0:
        insights.append(f"Выручка снизилась на {abs(rev_ch)}% — стоит проверить воронку и трафик.")

    if k["net_profit_change_pct"] > 0:
        insights.append(
            f"Чистая прибыль выросла на {k['net_profit_change_pct']}% "
            f"(сейчас ${k['net_profit']})."
        )
    elif float(k["net_profit"]) < 0:
        insights.append("Чистая прибыль отрицательная: расходы превышают выручку.")

    if k["expenses_change_pct"] > 10:
        insights.append(f"Расходы выросли на {k['expenses_change_pct']}% — проверьте категории.")

    tops = ctx.get("top_products") or []
    if tops:
        insights.append(f"Лидер продаж: «{tops[0]['name']}» (${tops[0]['revenue']}).")

    low = ctx.get("low_stock") or []
    if low:
        insights.append(f"Низкий остаток у {len(low)} товар(ов), например «{low[0]['name']}».")

    if not insights:
        insights.append("Недостаточно динамики для автоматических выводов — накопите больше данных.")

    return insights[:5]
