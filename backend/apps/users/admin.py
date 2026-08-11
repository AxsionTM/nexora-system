from decimal import Decimal
from datetime import timedelta

from django import forms
from django.contrib import admin, messages
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils import timezone

from .models import User, WalletTransaction, SubscriptionHistory
from .billing import credit_balance, admin_set_plan
from .plans import PLANS


class GrantSubscriptionForm(forms.Form):
    plan = forms.ChoiceField(
        label="Тариф",
        choices=[(k, v["name"]) for k, v in PLANS.items()],
    )
    months = forms.ChoiceField(
        label="Период",
        choices=[
            ("1", "1 месяц"),
            ("3", "3 месяца"),
            ("6", "6 месяцев"),
            ("12", "12 месяцев"),
        ],
        initial="1",
    )


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
        ("Личные данные", {"fields": ("first_name", "last_name")}),
        ("Кошелёк и подписка", {"fields": ("balance", "plan", "plan_expires_at")}),
        (
            "Права доступа",
            {
                "fields": (
                    "is_active",
                    "is_staff",
                    "is_superuser",
                    "groups",
                    "user_permissions",
                )
            },
        ),
        ("Даты", {"fields": ("date_joined", "updated_at")}),
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
    list_filter = ("type", "created_at")
    search_fields = ("user__email", "description")
    readonly_fields = ("created_at", "balance_after")
    ordering = ("-created_at",)


class SubscriptionHistoryAdminForm(forms.ModelForm):
    months = forms.ChoiceField(
        label="Период",
        choices=[
            ("1", "1 месяц"),
            ("3", "3 месяца"),
            ("6", "6 месяцев"),
            ("12", "12 месяцев"),
        ],
        initial="1",
        required=True,
    )

    class Meta:
        model = SubscriptionHistory
        fields = ("user", "plan", "note")

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields["plan"].widget = forms.Select(
            choices=[(k, v["name"]) for k, v in PLANS.items()]
        )
        self.fields["plan"].label = "Тариф"
        self.fields["user"].label = "Пользователь"
        self.fields["note"].label = "Комментарий"


@admin.register(SubscriptionHistory)
class SubscriptionHistoryAdmin(admin.ModelAdmin):
    form = SubscriptionHistoryAdminForm
    list_display = ("user", "plan", "price", "starts_at", "ends_at", "note", "created_at")
    list_filter = ("plan",)
    search_fields = ("user__email",)
    readonly_fields = ("price", "starts_at", "ends_at", "created_at")

    def save_model(self, request, obj, form, change):
        if not change:
            months = int(form.cleaned_data.get("months") or 1)
            plan = form.cleaned_data["plan"]
            user = form.cleaned_data["user"]
            note = form.cleaned_data.get("note") or "Выдано через админку"
            admin_set_plan(user, plan, months=months, note=note, created_by=request.user)
            messages.success(
                request,
                f"Пользователю {user.email} выдан тариф «{PLANS.get(plan, {}).get('name', plan)}» на {months} мес.",
            )
            # Mark so we don't double-insert; attach fake pk of latest history
            latest = SubscriptionHistory.objects.filter(user=user).order_by("-id").first()
            if latest:
                obj.pk = latest.pk
            return
        super().save_model(request, obj, form, change)

    def has_change_permission(self, request, obj=None):
        return False
