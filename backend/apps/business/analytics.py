from datetime import timedelta
from decimal import Decimal

from django.db.models import Sum, Count, Avg, Q, F
from django.db.models.functions import TruncDate, TruncMonth
from django.utils import timezone

from .models import Order, OrderItem, Product, Customer, Workspace, Expense


PERIOD_DAYS = {
    "7D": 7,
    "30D": 30,
    "3M": 90,
    "6M": 180,
    "1Y": 365,
}


def _period_bounds(period: str):
    days = PERIOD_DAYS.get(period, 30)
    end = timezone.now()
    start = end - timedelta(days=days)
    prev_start = start - timedelta(days=days)
    return start, end, prev_start


def _revenue_qs(workspace, start, end):
    return Order.objects.filter(
        workspace=workspace,
        payment_status=Order.PaymentStatus.PAID,
        created_at__gte=start,
        created_at__lt=end,
    )


def dashboard_summary(workspace: Workspace, period: str = "30D") -> dict:
    start, end, prev_start = _period_bounds(period)

    current_orders = _revenue_qs(workspace, start, end)
    prev_orders = _revenue_qs(workspace, prev_start, start)

    revenue = current_orders.aggregate(t=Sum("total"))["t"] or Decimal("0")
    prev_revenue = prev_orders.aggregate(t=Sum("total"))["t"] or Decimal("0")

    orders_count = current_orders.count()
    prev_orders_count = prev_orders.count()

    customers_count = Customer.objects.filter(
        workspace=workspace, created_at__gte=start, created_at__lt=end
    ).count()
    prev_customers = Customer.objects.filter(
        workspace=workspace, created_at__gte=prev_start, created_at__lt=start
    ).count()

    expenses_qs = Expense.objects.filter(
        workspace=workspace, date__gte=start.date(), date__lt=end.date()
    )
    prev_expenses_qs = Expense.objects.filter(
        workspace=workspace, date__gte=prev_start.date(), date__lt=start.date()
    )
    expenses = expenses_qs.aggregate(t=Sum("amount"))["t"] or Decimal("0")
    prev_expenses = prev_expenses_qs.aggregate(t=Sum("amount"))["t"] or Decimal("0")
    net_profit = revenue - expenses
    prev_net = prev_revenue - prev_expenses

    aov = (
        current_orders.aggregate(a=Avg("total"))["a"] or Decimal("0")
        if orders_count
        else Decimal("0")
    )

    def pct_change(current, previous):
        if previous == 0:
            return 100.0 if current > 0 else 0.0
        return round(float((current - previous) / previous * 100), 1)

    return {
        "period": period,
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
        "conversion_rate": 0.0,  # needs traffic data; placeholder
    }


def revenue_series(workspace: Workspace, period: str = "30D") -> list:
    start, end, _ = _period_bounds(period)
    days = PERIOD_DAYS.get(period, 30)

    qs = (
        _revenue_qs(workspace, start, end)
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
        Order.objects.filter(workspace=workspace, created_at__gte=start, created_at__lt=end)
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
        .values("product_name")
        .annotate(
            quantity=Sum("quantity"),
            revenue=Sum(F("quantity") * F("unit_price")),
        )
        .order_by("-revenue")[:limit]
    )
    return [
        {
            "name": r["product_name"],
            "quantity": r["quantity"] or 0,
            "revenue": str(r["revenue"] or 0),
        }
        for r in rows
    ]


def recent_orders(workspace: Workspace, limit: int = 8) -> list:
    orders = (
        Order.objects.filter(workspace=workspace)
        .select_related("customer")
        .order_by("-created_at")[:limit]
    )
    return [
        {
            "id": o.id,
            "customer_name": o.customer.name if o.customer else None,
            "status": o.status,
            "payment_status": o.payment_status,
            "total": str(o.total),
            "created_at": o.created_at.isoformat(),
        }
        for o in orders
    ]


def expenses_series(workspace: Workspace, period: str = "30D") -> list:
    start, end, _ = _period_bounds(period)
    days = PERIOD_DAYS.get(period, 30)

    qs = (
        Expense.objects.filter(
            workspace=workspace, date__gte=start.date(), date__lt=end.date()
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
            workspace=workspace, date__gte=start.date(), date__lt=end.date()
        )
        .values("category")
        .annotate(total=Sum("amount"))
        .order_by("-total")
    )
    labels = dict(Expense.Category.choices)
    return [
        {
            "category": r["category"],
            "label": labels.get(r["category"], r["category"]),
            "total": str(r["total"] or 0),
        }
        for r in rows
    ]
