from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
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
    path("", include(router.urls)),
]
