from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    AnalyticsSummaryView,
    AnalyticsRevenueView,
    AnalyticsOrdersSeriesView,
    AnalyticsTopProductsView,
    AnalyticsRecentOrdersView,
    WorkspaceViewSet,
    ProductViewSet,
    CustomerViewSet,
    OrderViewSet,
    EnsureWorkspaceView,
)

router = DefaultRouter()
router.register("workspaces", WorkspaceViewSet, basename="workspace")
router.register("products", ProductViewSet, basename="product")
router.register("customers", CustomerViewSet, basename="customer")
router.register("orders", OrderViewSet, basename="order")

urlpatterns = [
    path("workspaces/ensure/", EnsureWorkspaceView.as_view(), name="ensure-workspace"),
    path("analytics/summary/", AnalyticsSummaryView.as_view(), name="analytics-summary"),
    path("analytics/revenue/", AnalyticsRevenueView.as_view(), name="analytics-revenue"),
    path("analytics/orders-series/", AnalyticsOrdersSeriesView.as_view(), name="analytics-orders-series"),
    path("analytics/top-products/", AnalyticsTopProductsView.as_view(), name="analytics-top-products"),
    path("analytics/recent-orders/", AnalyticsRecentOrdersView.as_view(), name="analytics-recent-orders"),
    path("", include(router.urls)),
]
