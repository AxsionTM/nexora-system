from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from .tokens import NexoraTokenObtainPairView
from .views import (
    WalletView,
    PlansListView,
    PurchasePlanView,
    AdminGrantView,
    ChangePasswordView,
    MeView,
    PasswordResetConfirmView,
    PasswordResetRequestView,
    RegisterView,
)

urlpatterns = [
    path("register/", RegisterView.as_view(), name="register"),
    path("login/", NexoraTokenObtainPairView.as_view(), name="login"),
    path("refresh/", TokenRefreshView.as_view(), name="token-refresh"),
    path("me/", MeView.as_view(), name="me"),
    path("change-password/", ChangePasswordView.as_view(), name="change-password"),
    path("password-reset/", PasswordResetRequestView.as_view(), name="password-reset"),
    path(
        "password-reset/confirm/",
        PasswordResetConfirmView.as_view(),
        name="password-reset-confirm",
    ),
    path("wallet/", WalletView.as_view(), name="wallet"),
    path("plans/", PlansListView.as_view(), name="plans"),
    path("plans/purchase/", PurchasePlanView.as_view(), name="plans-purchase"),
    path("admin/grant/", AdminGrantView.as_view(), name="admin-grant"),
]
