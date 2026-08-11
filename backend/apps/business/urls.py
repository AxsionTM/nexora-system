from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    AnalyticsSummaryView,
    AnalyticsRevenueView,
    AnalyticsOrdersSeriesView,
    AnalyticsTopProductsView,
    AnalyticsRecentOrdersView,
    AnalyticsExpensesSeriesView,
    AnalyticsExpensesByCategoryView,
    WorkspaceViewSet,
    ProductViewSet,
    CustomerViewSet,
    OrderViewSet,
    ExpenseViewSet,
    TeamMemberViewSet,
    NotificationViewSet,
    MarkAllNotificationsReadView,
    EnsureWorkspaceView,
    IntegrationListView,
    IntegrationConnectView,
    IntegrationDisconnectView,
    IntegrationTestView,
    CsvExportView,
    PaymentListView,
    SandboxPaymentView,
    SandboxRefundView,
    AIChatView,
    AIInsightsView,
    AIConversationListView,
    AIConversationDetailView,
)

router = DefaultRouter()
router.register("workspaces", WorkspaceViewSet, basename="workspace")
router.register("products", ProductViewSet, basename="product")
router.register("customers", CustomerViewSet, basename="customer")
router.register("orders", OrderViewSet, basename="order")
router.register("expenses", ExpenseViewSet, basename="expense")
router.register("team", TeamMemberViewSet, basename="team")
router.register("notifications", NotificationViewSet, basename="notification")

urlpatterns = [
    path("workspaces/ensure/", EnsureWorkspaceView.as_view(), name="ensure-workspace"),
    path("analytics/summary/", AnalyticsSummaryView.as_view(), name="analytics-summary"),
    path("analytics/revenue/", AnalyticsRevenueView.as_view(), name="analytics-revenue"),
    path("analytics/orders-series/", AnalyticsOrdersSeriesView.as_view(), name="analytics-orders-series"),
    path("analytics/top-products/", AnalyticsTopProductsView.as_view(), name="analytics-top-products"),
    path("analytics/recent-orders/", AnalyticsRecentOrdersView.as_view(), name="analytics-recent-orders"),
    path("analytics/expenses-series/", AnalyticsExpensesSeriesView.as_view(), name="analytics-expenses-series"),
    path("analytics/expenses-by-category/", AnalyticsExpensesByCategoryView.as_view(), name="analytics-expenses-by-category"),
    path("notifications/mark-all-read/", MarkAllNotificationsReadView.as_view(), name="notifications-mark-all-read"),
    path("integrations/", IntegrationListView.as_view(), name="integrations-list"),
    path("integrations/<str:provider>/connect/", IntegrationConnectView.as_view(), name="integrations-connect"),
    path("integrations/<str:provider>/disconnect/", IntegrationDisconnectView.as_view(), name="integrations-disconnect"),
    path("integrations/<str:provider>/test/", IntegrationTestView.as_view(), name="integrations-test"),
    path("export/csv/", CsvExportView.as_view(), name="export-csv"),
    path("payments/", PaymentListView.as_view(), name="payments-list"),
    path("payments/sandbox/", SandboxPaymentView.as_view(), name="payments-sandbox"),
    path("payments/<int:payment_id>/refund/", SandboxRefundView.as_view(), name="payments-refund"),
    path("ai/chat/", AIChatView.as_view(), name="ai-chat"),
    path("ai/insights/", AIInsightsView.as_view(), name="ai-insights"),
    path("ai/conversations/", AIConversationListView.as_view(), name="ai-conversations"),
    path("ai/conversations/<int:pk>/", AIConversationDetailView.as_view(), name="ai-conversation-detail"),
    path("", include(router.urls)),
]
