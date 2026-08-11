from decimal import Decimal

from django.contrib import admin, messages
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils import timezone

from .models import User, WalletTransaction, SubscriptionHistory
from .billing import credit_balance, admin_set_plan
from .plans import PLANS


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = (
        "email",
        "first_name",
        "last_name",
        "balance",
        "plan",
        "plan_expires_at",
        "is_staff",
        "is_active",
        "date_joined",
    )
    list_filter = ("is_staff", "is_active", "plan")
    search_fields = ("email", "first_name", "last_name")
    ordering = ("-date_joined",)
    actions = ["grant_100_usd", "grant_pro_1m", "grant_business_1m", "set_free"]

    fieldsets = (
        (None, {"fields": ("email", "password")}),
        ("Personal", {"fields": ("first_name", "last_name")}),
        ("Кошелёк и подписка", {"fields": ("balance", "plan", "plan_expires_at")}),
        ("Permissions", {"fields": ("is_active", "is_staff", "is_superuser", "groups", "user_permissions")}),
        ("Dates", {"fields": ("date_joined", "updated_at")}),
    )
    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": ("email", "password1", "password2", "is_staff", "is_superuser"),
            },
        ),
    )
    readonly_fields = ("date_joined", "updated_at")
    filter_horizontal = ("groups", "user_permissions")

    @admin.action(description="Пополнить кошелёк +$100")
    def grant_100_usd(self, request, queryset):
        for user in queryset:
            credit_balance(
                user,
                Decimal("100"),
                type=WalletTransaction.Type.ADJUSTMENT,
                description="Пополнение администратором (+$100)",
                created_by=request.user,
            )
        self.message_user(request, f"Пополнено: {queryset.count()} польз.", messages.SUCCESS)

    @admin.action(description="Выдать Pro на 1 месяц")
    def grant_pro_1m(self, request, queryset):
        for user in queryset:
            admin_set_plan(user, "pro", months=1, note="Admin: Pro 1м", created_by=request.user)
        self.message_user(request, f"Pro выдан: {queryset.count()}", messages.SUCCESS)

    @admin.action(description="Выдать Бизнес на 1 месяц")
    def grant_business_1m(self, request, queryset):
        for user in queryset:
            admin_set_plan(user, "business", months=1, note="Admin: Business 1м", created_by=request.user)
        self.message_user(request, f"Бизнес выдан: {queryset.count()}", messages.SUCCESS)

    @admin.action(description="Сбросить на Бесплатный")
    def set_free(self, request, queryset):
        for user in queryset:
            admin_set_plan(user, "free", note="Admin: reset free", created_by=request.user)
        self.message_user(request, f"Сброшено: {queryset.count()}", messages.SUCCESS)


@admin.register(WalletTransaction)
class WalletTransactionAdmin(admin.ModelAdmin):
    list_display = ("user", "type", "amount", "balance_after", "description", "created_at")
    list_filter = ("type",)
    search_fields = ("user__email", "description")
    readonly_fields = ("created_at",)


@admin.register(SubscriptionHistory)
class SubscriptionHistoryAdmin(admin.ModelAdmin):
    list_display = ("user", "plan", "price", "starts_at", "ends_at", "note", "created_at")
    list_filter = ("plan",)
    search_fields = ("user__email",)
