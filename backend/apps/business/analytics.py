from datetime import timedelta
from decimal import Decimal

from django.db.models import Sum, Count, Avg, Q, F, DecimalField, ExpressionWrapper
from django.db.models.functions import TruncDate
from django.utils import timezone

from .models import Order, OrderItem, Product, Customer, Workspace, Expense


PERIOD_DAYS = {
    "7D": 7,
    "30D": 30,
    "3M": 90,
    "6M": 180,
    "1Y": 365,
}

PERIOD_LABELS = {
    "7D": "7 дней",
    "30D": "30 дней",
    "3M": "3 месяца",
    "6M": "6 месяцев",
    "1Y": "1 год",
}


def _period_bounds(period: str):
    days = PERIOD_DAYS.get(period, 30)
    end = timezone.now()
    start = end - timedelta(days=days)
    prev_start = start - timedelta(days=days)
    return start, end, prev_start


def _paid_orders_qs(workspace, start, end):
    """Revenue: paid orders that are not cancelled."""
    return Order.objects.filter(
        workspace=workspace,
        payment_status=Order.PaymentStatus.PAID,
        created_at__gte=start,
        created_at__lt=end,
    ).exclude(status=Order.Status.CANCELLED)


def _cancelled_orders_qs(workspace, start, end):
    return Order.objects.filter(
        workspace=workspace,
        status=Order.Status.CANCELLED,
        created_at__gte=start,
        created_at__lt=end,
    )


def dashboard_summary(workspace: Workspace, period: str = "30D") -> dict:
    start, end, prev_start = _period_bounds(period)

    current_orders = _paid_orders_qs(workspace, start, end)
    prev_orders = _paid_orders_qs(workspace, prev_start, start)

    revenue = current_orders.aggregate(t=Sum("total"))["t"] or Decimal("0")
    prev_revenue = prev_orders.aggregate(t=Sum("total"))["t"] or Decimal("0")

    orders_count = (
        Order.objects.filter(
            workspace=workspace,
            created_at__gte=start,
            created_at__lt=end,
        )
        .exclude(status=Order.Status.CANCELLED)
        .count()
    )

    prev_orders_count = (
        Order.objects.filter(
            workspace=workspace,
            created_at__gte=prev_start,
            created_at__lt=start,
        )
        .exclude(status=Order.Status.CANCELLED)
        .count()
    )

    cancelled_qs = _cancelled_orders_qs(workspace, start, end)
    cancelled_count = cancelled_qs.count()
    cancelled_amount = cancelled_qs.aggregate(t=Sum("total"))["t"] or Decimal("0")
    prev_cancelled_amount = (
        _cancelled_orders_qs(workspace, prev_start, start).aggregate(t=Sum("total"))["t"]
        or Decimal("0")
    )

    customers_count = Customer.objects.filter(
        workspace=workspace,
        created_at__gte=start,
        created_at__lt=end,
    ).count()
    prev_customers = Customer.objects.filter(
        workspace=workspace,
        created_at__gte=prev_start,
        created_at__lt=start,
    ).count()

    expenses_qs = Expense.objects.filter(
        workspace=workspace,
        date__gte=start.date(),
        date__lt=end.date(),
    )
    prev_expenses_qs = Expense.objects.filter(
        workspace=workspace,
        date__gte=prev_start.date(),
        date__lt=start.date(),
    )
    expenses = expenses_qs.aggregate(t=Sum("amount"))["t"] or Decimal("0")
    prev_expenses = prev_expenses_qs.aggregate(t=Sum("amount"))["t"] or Decimal("0")

    net_profit = revenue - expenses
    prev_net = prev_revenue - prev_expenses

    aov = (
        current_orders.aggregate(a=Avg("total"))["a"] or Decimal("0")
        if current_orders.exists()
        else Decimal("0")
    )

    def pct_change(current, previous):
        if previous == 0:
            return 100.0 if current > 0 else 0.0
        return round(float((current - previous) / previous * 100), 1)

    return {
        "period": period,
        "period_label": PERIOD_LABELS.get(period, period),
        "revenue": str(revenue),
        "revenue_change": pct_change(revenue, prev_revenue),
        "orders": orders_count,
        "orders_change": pct_change(orders_count, prev_orders_count),
        "customers": customers_count,
        "customers_change": pct_change(customers_count, prev_customers),
        "expenses": str(expenses),
        "expenses_change": pct_change(expenses, prev_expenses),
        "net_profit": str(net_profit),
        "net_profit_change": pct_change(net_profit, prev_net),
        "average_order_value": str(round(aov, 2)),
        "cancelled_orders": cancelled_count,
        "cancelled_amount": str(cancelled_amount),
        "cancelled_amount_change": pct_change(cancelled_amount, prev_cancelled_amount),
        "conversion_rate": 0.0,
    }


def revenue_series(workspace: Workspace, period: str = "30D") -> list:
    start, end, _ = _period_bounds(period)
    days = PERIOD_DAYS.get(period, 30)
    qs = (
        _paid_orders_qs(workspace, start, end)
        .annotate(day=TruncDate("created_at"))
        .values("day")
        .annotate(value=Sum("total"))
        .order_by("day")
    )
    by_day = {row["day"]: float(row["value"] or 0) for row in qs}
    series = []
    for i in range(days):
        d = (start + timedelta(days=i)).date()
        series.append({"date": d.isoformat(), "value": by_day.get(d, 0.0)})
    return series


def orders_series(workspace: Workspace, period: str = "30D") -> list:
    start, end, _ = _period_bounds(period)
    days = PERIOD_DAYS.get(period, 30)
    qs = (
        Order.objects.filter(
            workspace=workspace,
            created_at__gte=start,
            created_at__lt=end,
        )
        .exclude(status=Order.Status.CANCELLED)
        .annotate(day=TruncDate("created_at"))
        .values("day")
        .annotate(value=Count("id"))
        .order_by("day")
    )
    by_day = {row["day"]: row["value"] for row in qs}
    series = []
    for i in range(days):
        d = (start + timedelta(days=i)).date()
        series.append({"date": d.isoformat(), "value": by_day.get(d, 0)})
    return series


def top_products(workspace: Workspace, period: str = "30D", limit: int = 5) -> list:
    start, end, _ = _period_bounds(period)
    rows = (
        OrderItem.objects.filter(
            order__workspace=workspace,
            order__payment_status=Order.PaymentStatus.PAID,
            order__created_at__gte=start,
            order__created_at__lt=end,
        )
        .exclude(order__status=Order.Status.CANCELLED)
        .annotate(
            line_revenue=ExpressionWrapper(
                F("quantity") * F("unit_price"),
                output_field=DecimalField(max_digits=14, decimal_places=2),
            )
        )
        .values("product_name")
        .annotate(
            quantity=Sum("quantity"),
            revenue=Sum("line_revenue"),
        )
        .order_by("-revenue")[:limit]
    )
    return [
        {
            "name": row["product_name"],
            "quantity": row["quantity"] or 0,
            "revenue": str(row["revenue"] or 0),
        }
        for row in rows
    ]


def recent_orders(workspace: Workspace, limit: int = 8) -> list:
    orders = (
        Order.objects.filter(workspace=workspace)
        .select_related("customer")
        .order_by("-created_at")[:limit]
    )
    return [
        {
            "id": order.id,
            "customer_name": order.customer.name if order.customer else None,
            "status": order.status,
            "payment_status": order.payment_status,
            "total": str(order.total),
            "created_at": order.created_at.isoformat(),
        }
        for order in orders
    ]


def expenses_series(workspace: Workspace, period: str = "30D") -> list:
    start, end, _ = _period_bounds(period)
    days = PERIOD_DAYS.get(period, 30)
    qs = (
        Expense.objects.filter(
            workspace=workspace,
            date__gte=start.date(),
            date__lt=end.date(),
        )
        .values("date")
        .annotate(value=Sum("amount"))
        .order_by("date")
    )
    by_day = {row["date"]: float(row["value"] or 0) for row in qs}
    series = []
    for i in range(days):
        d = (start + timedelta(days=i)).date()
        series.append({"date": d.isoformat(), "value": by_day.get(d, 0.0)})
    return series


def expenses_by_category(workspace: Workspace, period: str = "30D") -> list:
    start, end, _ = _period_bounds(period)
    rows = (
        Expense.objects.filter(
            workspace=workspace,
            date__gte=start.date(),
            date__lt=end.date(),
        )
        .values("category")
        .annotate(total=Sum("amount"))
        .order_by("-total")
    )
    labels = dict(Expense.Category.choices)
    return [
        {
            "category": row["category"],
            "label": labels.get(row["category"], row["category"]),
            "total": str(row["total"] or 0),
        }
        for row in rows
    ]
