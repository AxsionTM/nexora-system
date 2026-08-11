from django.db.models import Q
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Workspace, WorkspaceMember, Product, Customer, Order, Expense, Notification
from .serializers import (
    WorkspaceSerializer,
    ProductSerializer,
    CustomerSerializer,
    OrderSerializer,
    ExpenseSerializer,
)


def get_user_workspaces(user):
    return Workspace.objects.filter(
        Q(owner=user) | Q(members__user=user)
    ).distinct()


class WorkspaceViewSet(viewsets.ModelViewSet):
    serializer_class = WorkspaceSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ["get", "post", "patch", "head", "options"]

    def get_queryset(self):
        return get_user_workspaces(self.request.user)

    def perform_create(self, serializer):
        from apps.users.plans import get_plan_limits
        from .models import Workspace
        from rest_framework.exceptions import PermissionDenied

        limits = get_plan_limits(self.request.user)
        owned = Workspace.objects.filter(owner=self.request.user).count()
        max_ws = limits.get("max_workspaces") or 1
        if owned >= max_ws:
            raise PermissionDenied(
                f"Лимит workspace по тарифу «{limits.get('name')}»: {max_ws}. "
                "Улучшите подписку в Настройках → Биллинг."
            )
        serializer.save()


class CurrentWorkspaceMixin:
    def get_workspace(self):
        workspace_id = self.request.query_params.get("workspace") or self.request.headers.get(
            "X-Workspace-Id"
        )
        qs = get_user_workspaces(self.request.user)
        if workspace_id:
            return qs.filter(pk=workspace_id).first()
        return qs.first()


class ProductViewSet(CurrentWorkspaceMixin, viewsets.ModelViewSet):
    serializer_class = ProductSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        workspace = self.get_workspace()
        if not workspace:
            return Product.objects.none()
        qs = Product.objects.filter(workspace=workspace)
        search = self.request.query_params.get("search")
        if search:
            qs = qs.filter(
                Q(name__icontains=search)
                | Q(sku__icontains=search)
                | Q(category__icontains=search)
            )
        category = self.request.query_params.get("category")
        if category:
            qs = qs.filter(category__iexact=category)
        return qs

    def perform_create(self, serializer):
        workspace = self.get_workspace()
        if not workspace:
            raise ValueError("Workspace not found")
        serializer.save(workspace=workspace)


class CustomerViewSet(CurrentWorkspaceMixin, viewsets.ModelViewSet):
    serializer_class = CustomerSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        workspace = self.get_workspace()
        if not workspace:
            return Customer.objects.none()
        qs = Customer.objects.filter(workspace=workspace)
        search = self.request.query_params.get("search")
        if search:
            qs = qs.filter(
                Q(name__icontains=search)
                | Q(email__icontains=search)
                | Q(phone__icontains=search)
                | Q(company__icontains=search)
            )
        return qs

    def perform_create(self, serializer):
        workspace = self.get_workspace()
        if not workspace:
            raise ValueError("Workspace not found")
        serializer.save(workspace=workspace)


class OrderViewSet(CurrentWorkspaceMixin, viewsets.ModelViewSet):
    serializer_class = OrderSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        workspace = self.get_workspace()
        if not workspace:
            return Order.objects.none()
        qs = Order.objects.filter(workspace=workspace).select_related("customer").prefetch_related("items")
        status_filter = self.request.query_params.get("status")
        if status_filter:
            qs = qs.filter(status=status_filter)
        search = self.request.query_params.get("search")
        if search:
            qs = qs.filter(
                Q(customer__name__icontains=search) | Q(notes__icontains=search)
            )
        return qs

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx["workspace"] = self.get_workspace()
        return ctx

    def perform_create(self, serializer):
        workspace = self.get_workspace()
        if not workspace:
            raise ValueError("Workspace not found")
        serializer.save()


class EnsureWorkspaceView(APIView):
    """Create a default workspace for the user if none exists."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        existing = get_user_workspaces(request.user).first()
        if existing:
            return Response(WorkspaceSerializer(existing).data)
        name = request.data.get("name") or f"Бизнес {request.user.first_name or request.user.email.split('@')[0]}"
        serializer = WorkspaceSerializer(data={"name": name}, context={"request": request})
        serializer.is_valid(raise_exception=True)
        workspace = serializer.save()
        return Response(WorkspaceSerializer(workspace).data, status=status.HTTP_201_CREATED)


class AnalyticsSummaryView(CurrentWorkspaceMixin, APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from .analytics import dashboard_summary

        workspace = self.get_workspace()
        if not workspace:
            return Response({"detail": "Workspace not found"}, status=status.HTTP_404_NOT_FOUND)
        period = request.query_params.get("period", "30D")
        return Response(dashboard_summary(workspace, period))


class AnalyticsRevenueView(CurrentWorkspaceMixin, APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from .analytics import revenue_series

        workspace = self.get_workspace()
        if not workspace:
            return Response({"detail": "Workspace not found"}, status=status.HTTP_404_NOT_FOUND)
        period = request.query_params.get("period", "30D")
        return Response(revenue_series(workspace, period))


class AnalyticsOrdersSeriesView(CurrentWorkspaceMixin, APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from .analytics import orders_series

        workspace = self.get_workspace()
        if not workspace:
            return Response({"detail": "Workspace not found"}, status=status.HTTP_404_NOT_FOUND)
        period = request.query_params.get("period", "30D")
        return Response(orders_series(workspace, period))


class AnalyticsTopProductsView(CurrentWorkspaceMixin, APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from .analytics import top_products

        workspace = self.get_workspace()
        if not workspace:
            return Response({"detail": "Workspace not found"}, status=status.HTTP_404_NOT_FOUND)
        period = request.query_params.get("period", "30D")
        return Response(top_products(workspace, period))


class AnalyticsRecentOrdersView(CurrentWorkspaceMixin, APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from .analytics import recent_orders

        workspace = self.get_workspace()
        if not workspace:
            return Response({"detail": "Workspace not found"}, status=status.HTTP_404_NOT_FOUND)
        return Response(recent_orders(workspace))



class ExpenseViewSet(CurrentWorkspaceMixin, viewsets.ModelViewSet):
    serializer_class = ExpenseSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        workspace = self.get_workspace()
        if not workspace:
            return Expense.objects.none()
        qs = Expense.objects.filter(workspace=workspace)
        category = self.request.query_params.get("category")
        if category:
            qs = qs.filter(category=category)
        search = self.request.query_params.get("search")
        if search:
            qs = qs.filter(Q(title__icontains=search) | Q(notes__icontains=search))
        return qs

    def perform_create(self, serializer):
        workspace = self.get_workspace()
        if not workspace:
            raise ValueError("Workspace not found")
        serializer.save(workspace=workspace)



class AnalyticsExpensesSeriesView(CurrentWorkspaceMixin, APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from .analytics import expenses_series

        workspace = self.get_workspace()
        if not workspace:
            return Response({"detail": "Workspace not found"}, status=status.HTTP_404_NOT_FOUND)
        period = request.query_params.get("period", "30D")
        return Response(expenses_series(workspace, period))


class AnalyticsExpensesByCategoryView(CurrentWorkspaceMixin, APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from .analytics import expenses_by_category

        workspace = self.get_workspace()
        if not workspace:
            return Response({"detail": "Workspace not found"}, status=status.HTTP_404_NOT_FOUND)
        period = request.query_params.get("period", "30D")
        return Response(expenses_by_category(workspace, period))


ROLE_RANK = {
    "owner": 4,
    "admin": 3,
    "manager": 2,
    "employee": 1,
}


def _member_role(workspace, user):
    if workspace.owner_id == user.id:
        return WorkspaceMember.Role.OWNER
    m = WorkspaceMember.objects.filter(workspace=workspace, user=user).first()
    return m.role if m else None


class TeamMemberViewSet(CurrentWorkspaceMixin, viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    def list(self, request):
        from .serializers import WorkspaceMemberSerializer

        workspace = self.get_workspace()
        if not workspace:
            return Response({"detail": "Workspace not found"}, status=status.HTTP_404_NOT_FOUND)
        members = WorkspaceMember.objects.filter(workspace=workspace).select_related("user")
        return Response(WorkspaceMemberSerializer(members, many=True).data)

    def create(self, request):
        """Invite member by email. Only owner/admin can invite; cannot grant higher/equal role than self."""
        from django.contrib.auth import get_user_model
        from .serializers import InviteMemberSerializer, WorkspaceMemberSerializer
        from .models import Notification

        User = get_user_model()
        workspace = self.get_workspace()
        if not workspace:
            return Response({"detail": "Workspace not found"}, status=status.HTTP_404_NOT_FOUND)

        actor_role = _member_role(workspace, request.user)
        if actor_role not in (WorkspaceMember.Role.OWNER, WorkspaceMember.Role.ADMIN):
            return Response(
                {"detail": "Приглашать участников могут только владелец и админ."},
                status=status.HTTP_403_FORBIDDEN,
            )
        from apps.users.plans import get_plan_limits
        limits = get_plan_limits(request.user)
        max_team = limits.get("max_team_members")
        if max_team is not None:
            current = WorkspaceMember.objects.filter(workspace=workspace).count()
            if current >= max_team:
                return Response(
                    {"detail": f"Лимит команды по тарифу: {max_team}."},
                    status=status.HTTP_403_FORBIDDEN,
                )

        serializer = InviteMemberSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data["email"].lower()
        role = serializer.validated_data["role"]

        if role == WorkspaceMember.Role.OWNER:
            return Response(
                {"role": ["Нельзя назначить роль владельца через приглашение."]},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Cannot assign a role >= own rank (admin cannot create another admin)
        if ROLE_RANK.get(role, 0) >= ROLE_RANK.get(actor_role, 0) and actor_role != WorkspaceMember.Role.OWNER:
            return Response(
                {"role": ["Нельзя назначить роль равную или выше своей."]},
                status=status.HTTP_403_FORBIDDEN,
            )
        if actor_role == WorkspaceMember.Role.ADMIN and role == WorkspaceMember.Role.ADMIN:
            return Response(
                {"role": ["Админ не может назначать других админов."]},
                status=status.HTTP_403_FORBIDDEN,
            )

        user, created = User.objects.get_or_create(
            email=email,
            defaults={"first_name": email.split("@")[0]},
        )
        if created:
            user.set_unusable_password()
            user.save()

        if user.id == request.user.id:
            return Response(
                {"email": ["Нельзя пригласить самого себя."]},
                status=status.HTTP_400_BAD_REQUEST,
            )

        member, member_created = WorkspaceMember.objects.get_or_create(
            workspace=workspace,
            user=user,
            defaults={"role": role},
        )
        if not member_created:
            return Response(
                {"email": ["Этот пользователь уже в команде."]},
                status=status.HTTP_400_BAD_REQUEST,
            )

        Notification.objects.create(
            workspace=workspace,
            user=request.user,
            type=Notification.Type.TEAM,
            title="Новый участник команды",
            message=f"{email} добавлен с ролью «{member.get_role_display()}».",
            link="/team",
        )
        return Response(
            WorkspaceMemberSerializer(member).data,
            status=status.HTTP_201_CREATED,
        )

    def partial_update(self, request, pk=None):
        from .serializers import WorkspaceMemberSerializer

        workspace = self.get_workspace()
        if not workspace:
            return Response({"detail": "Workspace not found"}, status=status.HTTP_404_NOT_FOUND)
        try:
            member = WorkspaceMember.objects.get(pk=pk, workspace=workspace)
        except WorkspaceMember.DoesNotExist:
            return Response({"detail": "Not found"}, status=status.HTTP_404_NOT_FOUND)

        actor_role = _member_role(workspace, request.user)
        if actor_role not in (WorkspaceMember.Role.OWNER, WorkspaceMember.Role.ADMIN):
            return Response(
                {"detail": "Менять роли могут только владелец и админ."},
                status=status.HTTP_403_FORBIDDEN,
            )

        if member.role == WorkspaceMember.Role.OWNER:
            return Response(
                {"role": ["Роль владельца нельзя изменить."]},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Cannot change own role (prevent self-promotion / self-demotion games)
        if member.user_id == request.user.id:
            return Response(
                {"role": ["Нельзя изменить свою собственную роль."]},
                status=status.HTTP_403_FORBIDDEN,
            )

        # Admin cannot modify another admin
        if (
            actor_role == WorkspaceMember.Role.ADMIN
            and member.role == WorkspaceMember.Role.ADMIN
        ):
            return Response(
                {"role": ["Админ не может менять роль другого админа."]},
                status=status.HTTP_403_FORBIDDEN,
            )

        role = request.data.get("role")
        if role and role in dict(WorkspaceMember.Role.choices):
            if role == WorkspaceMember.Role.OWNER:
                return Response(
                    {"role": ["Нельзя назначить роль владельца."]},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if ROLE_RANK.get(role, 0) >= ROLE_RANK.get(actor_role, 0) and actor_role != WorkspaceMember.Role.OWNER:
                return Response(
                    {"role": ["Нельзя назначить роль равную или выше своей."]},
                    status=status.HTTP_403_FORBIDDEN,
                )
            if actor_role == WorkspaceMember.Role.ADMIN and role == WorkspaceMember.Role.ADMIN:
                return Response(
                    {"role": ["Админ не может назначать других админов."]},
                    status=status.HTTP_403_FORBIDDEN,
                )
            member.role = role
            member.save(update_fields=["role"])
        return Response(WorkspaceMemberSerializer(member).data)

    def destroy(self, request, pk=None):
        workspace = self.get_workspace()
        if not workspace:
            return Response({"detail": "Workspace not found"}, status=status.HTTP_404_NOT_FOUND)
        try:
            member = WorkspaceMember.objects.get(pk=pk, workspace=workspace)
        except WorkspaceMember.DoesNotExist:
            return Response({"detail": "Not found"}, status=status.HTTP_404_NOT_FOUND)

        actor_role = _member_role(workspace, request.user)
        if actor_role not in (WorkspaceMember.Role.OWNER, WorkspaceMember.Role.ADMIN):
            return Response(
                {"detail": "Удалять участников могут только владелец и админ."},
                status=status.HTTP_403_FORBIDDEN,
            )

        if member.role == WorkspaceMember.Role.OWNER:
            return Response(
                {"detail": "Нельзя удалить владельца."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if member.user_id == request.user.id:
            return Response(
                {"detail": "Нельзя удалить самого себя."},
                status=status.HTTP_403_FORBIDDEN,
            )
        if (
            actor_role == WorkspaceMember.Role.ADMIN
            and ROLE_RANK.get(member.role, 0) >= ROLE_RANK["admin"]
        ):
            return Response(
                {"detail": "Админ не может удалить другого админа."},
                status=status.HTTP_403_FORBIDDEN,
            )
        member.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class NotificationViewSet(CurrentWorkspaceMixin, viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    http_method_names = ["get", "patch", "head", "options"]

    def get_queryset(self):
        from .models import Notification

        workspace = self.get_workspace()
        if not workspace:
            return Notification.objects.none()
        return Notification.objects.filter(
            workspace=workspace
        ).filter(
            Q(user=self.request.user) | Q(user__isnull=True)
        )

    def get_serializer_class(self):
        from .serializers import NotificationSerializer
        return NotificationSerializer

    def partial_update(self, request, *args, **kwargs):
        notification = self.get_object()
        if "is_read" in request.data:
            notification.is_read = bool(request.data["is_read"])
            notification.save(update_fields=["is_read"])
        from .serializers import NotificationSerializer
        return Response(NotificationSerializer(notification).data)

    def list(self, request, *args, **kwargs):
        qs = self.get_queryset()
        from .serializers import NotificationSerializer
        unread = qs.filter(is_read=False).count()
        data = NotificationSerializer(qs[:50], many=True).data
        return Response({"unread_count": unread, "results": data})


class MarkAllNotificationsReadView(CurrentWorkspaceMixin, APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        from .models import Notification

        workspace = self.get_workspace()
        if not workspace:
            return Response({"detail": "Workspace not found"}, status=status.HTTP_404_NOT_FOUND)
        updated = Notification.objects.filter(
            workspace=workspace, is_read=False
        ).filter(
            Q(user=request.user) | Q(user__isnull=True)
        ).update(is_read=True)
        return Response({"marked": updated})


INTEGRATION_META = {
    "telegram": {
        "description": "Уведомления о заказах и низких остатках в Telegram (бесплатно через Bot API).",
        "free": True,
    },
    "email": {
        "description": "Письма клиентам и команде через ваш SMTP (Gmail, Yandex и др.).",
        "free": True,
    },
    "webhook": {
        "description": "Исходящие webhook при новом заказе / оплате — для n8n, Make, своих скриптов.",
        "free": True,
    },
    "google_sheets": {
        "description": "Выгрузка заказов и товаров в Google Таблицы (бесплатный API Google).",
        "free": True,
    },
    "csv_export": {
        "description": "Быстрый экспорт данных workspace в CSV без сторонних сервисов.",
        "free": True,
    },
    "discord": {
        "description": "Алерты в канал Discord через Incoming Webhook (бесплатно).",
        "free": True,
    },
    "slack": {
        "description": "Уведомления в Slack workspace (бесплатный план Slack).",
        "free": True,
    },
    "google_analytics": {
        "description": "Связка метрик сайта с бизнес-KPI (GA4 Measurement Protocol).",
        "free": True,
    },
}


class IntegrationListView(CurrentWorkspaceMixin, APIView):
    """List all known providers with connection status for the workspace."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        from .models import Integration
        from .serializers import IntegrationSerializer

        workspace = self.get_workspace()
        if not workspace:
            return Response({"detail": "Workspace not found"}, status=status.HTTP_404_NOT_FOUND)

        existing = {
            i.provider: i
            for i in Integration.objects.filter(workspace=workspace)
        }
        result = []
        for value, label in Integration.Provider.choices:
            if value == "discord":
                continue
            meta = INTEGRATION_META.get(value, {})
            if value in existing:
                data = IntegrationSerializer(existing[value]).data
            else:
                data = {
                    "id": None,
                    "provider": value,
                    "provider_display": label,
                    "status": Integration.Status.DISCONNECTED,
                    "status_display": "Отключено",
                    "connected_at": None,
                    "updated_at": None,
                }
            data["description"] = meta.get("description", "")
            data["is_free"] = meta.get("free", True)
            result.append(data)
        return Response(result)


class IntegrationConnectView(CurrentWorkspaceMixin, APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, provider: str):
        from .models import Integration, Notification
        from .serializers import IntegrationSerializer
        from django.utils import timezone
        from django.conf import settings as dj_settings

        workspace = self.get_workspace()
        if not workspace:
            return Response({"detail": "Workspace not found"}, status=status.HTTP_404_NOT_FOUND)

        # Discord skipped by product decision
        if provider == "discord":
            return Response(
                {"detail": "Discord не поддерживается в этой версии."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        valid = {c[0] for c in Integration.Provider.choices}
        if provider not in valid:
            return Response({"detail": "Unknown provider"}, status=status.HTTP_400_BAD_REQUEST)

        config = request.data.get("config") or {}
        if not isinstance(config, dict):
            config = {}

        # Required fields per provider
        if provider == Integration.Provider.TELEGRAM:
            if not (config.get("chat_id") or "").strip():
                return Response(
                    {"detail": "Укажите chat_id Telegram (куда слать уведомления)."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if not getattr(dj_settings, "TELEGRAM_BOT_TOKEN", ""):
                return Response(
                    {"detail": "TELEGRAM_BOT_TOKEN не задан в .env сервера."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        if provider == Integration.Provider.EMAIL:
            if not (config.get("to_email") or config.get("email") or "").strip():
                return Response(
                    {"detail": "Укажите email для уведомлений (to_email)."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if not getattr(dj_settings, "EMAIL_HOST", ""):
                return Response(
                    {"detail": "SMTP не настроен (EMAIL_HOST в .env)."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        if provider == Integration.Provider.WEBHOOK:
            if not (config.get("url") or "").strip():
                return Response(
                    {"detail": "Укажите URL webhook."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        if provider == Integration.Provider.SLACK:
            if not (config.get("webhook_url") or "").strip():
                return Response(
                    {"detail": "Укажите Slack Incoming Webhook URL."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        # Never store bot tokens in config — only workspace targets
        safe_config = {k: v for k, v in config.items() if k not in ("bot_token", "password", "api_key")}
        safe_config["connected_by"] = request.user.email

        integration, _ = Integration.objects.get_or_create(
            workspace=workspace,
            provider=provider,
        )
        integration.status = Integration.Status.CONNECTED
        integration.connected_at = timezone.now()
        integration.config = safe_config
        integration.save()

        Notification.objects.create(
            workspace=workspace,
            user=request.user,
            type=Notification.Type.SYSTEM,
            title=f"Интеграция {integration.get_provider_display()} подключена",
            message="Канал готов к отправке уведомлений.",
            link="/settings",
        )
        data = IntegrationSerializer(integration).data
        # do not expose full secrets
        return Response(data)


class IntegrationDisconnectView(CurrentWorkspaceMixin, APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, provider: str):
        from .models import Integration
        from .serializers import IntegrationSerializer

        workspace = self.get_workspace()
        if not workspace:
            return Response({"detail": "Workspace not found"}, status=status.HTTP_404_NOT_FOUND)

        try:
            integration = Integration.objects.get(workspace=workspace, provider=provider)
        except Integration.DoesNotExist:
            return Response({"detail": "Not connected"}, status=status.HTTP_404_NOT_FOUND)

        integration.status = Integration.Status.DISCONNECTED
        integration.connected_at = None
        integration.config = {}
        integration.save()
        return Response(IntegrationSerializer(integration).data)


class PaymentListView(CurrentWorkspaceMixin, APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from .models import Payment
        from .serializers import PaymentSerializer

        workspace = self.get_workspace()
        if not workspace:
            return Response({"detail": "Workspace not found"}, status=status.HTTP_404_NOT_FOUND)
        payments = Payment.objects.filter(workspace=workspace)[:50]
        return Response(PaymentSerializer(payments, many=True).data)


class SandboxPaymentView(CurrentWorkspaceMixin, APIView):
    """Simulate a payment without real money."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        import uuid
        from decimal import Decimal
        from .models import Payment, Order, Notification
        from .serializers import SandboxPaymentSerializer, PaymentSerializer

        workspace = self.get_workspace()
        if not workspace:
            return Response({"detail": "Workspace not found"}, status=status.HTTP_404_NOT_FOUND)

        serializer = SandboxPaymentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        order = None
        order_id = data.get("order_id")
        if order_id:
            order = Order.objects.filter(pk=order_id, workspace=workspace).first()

        simulate = data.get("simulate", "success")
        status_map = {
            "success": Payment.Status.SUCCESS,
            "failed": Payment.Status.FAILED,
            "pending": Payment.Status.PENDING,
        }
        pay_status = status_map.get(simulate, Payment.Status.SUCCESS)

        payment = Payment.objects.create(
            workspace=workspace,
            order=order,
            amount=data["amount"],
            status=pay_status,
            provider="sandbox",
            external_id=f"test_{uuid.uuid4().hex[:12]}",
            is_test=True,
            metadata={"simulated": simulate},
        )

        if order and pay_status == Payment.Status.SUCCESS:
            order.payment_status = Order.PaymentStatus.PAID
            order.save(update_fields=["payment_status", "updated_at"])
        elif order and pay_status == Payment.Status.FAILED:
            order.payment_status = Order.PaymentStatus.UNPAID
            order.save(update_fields=["payment_status", "updated_at"])

        notif_title = {
            Payment.Status.SUCCESS: "Платёж успешен",
            Payment.Status.FAILED: "Платёж не прошёл",
            Payment.Status.PENDING: "Платёж в обработке",
        }.get(pay_status, "Платёж")

        Notification.objects.create(
            workspace=workspace,
            user=request.user,
            type=Notification.Type.PAYMENT,
            title=notif_title,
            message=f"Sandbox: ${data['amount']} — {payment.get_status_display()} (тест).",
            link="/settings",
        )

        return Response(PaymentSerializer(payment).data, status=status.HTTP_201_CREATED)


class SandboxRefundView(CurrentWorkspaceMixin, APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, payment_id: int):
        from .models import Payment, Order, Notification
        from .serializers import PaymentSerializer

        workspace = self.get_workspace()
        if not workspace:
            return Response({"detail": "Workspace not found"}, status=status.HTTP_404_NOT_FOUND)

        try:
            payment = Payment.objects.get(pk=payment_id, workspace=workspace)
        except Payment.DoesNotExist:
            return Response({"detail": "Not found"}, status=status.HTTP_404_NOT_FOUND)

        if payment.status != Payment.Status.SUCCESS:
            return Response(
                {"detail": "Возврат возможен только для успешного платежа."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        payment.status = Payment.Status.REFUNDED
        payment.save(update_fields=["status", "updated_at"])

        if payment.order:
            payment.order.payment_status = Order.PaymentStatus.REFUNDED
            payment.order.save(update_fields=["payment_status", "updated_at"])

        Notification.objects.create(
            workspace=workspace,
            user=request.user,
            type=Notification.Type.PAYMENT,
            title="Возврат выполнен",
            message=f"Sandbox refund: ${payment.amount} (тест).",
            link="/settings",
        )
        return Response(PaymentSerializer(payment).data)


class AIChatView(CurrentWorkspaceMixin, APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        from .serializers import AIChatSerializer, AIMessageSerializer
        from .models import AIConversation, AIMessage
        from .ai_service import answer_question

        workspace = self.get_workspace()
        if not workspace:
            return Response({"detail": "Workspace not found"}, status=status.HTTP_404_NOT_FOUND)

        from apps.users.plans import get_plan_limits
        limits = get_plan_limits(request.user)
        if not limits.get("ai_enabled"):
            return Response(
                {"detail": "AI-ассистент доступен на тарифах Pro и Бизнес. Оформите подписку в Настройках → Биллинг."},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = AIChatSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        message = data["message"].strip()
        period = data.get("period") or "30D"
        conv_id = data.get("conversation_id")

        if conv_id:
            conversation = AIConversation.objects.filter(
                pk=conv_id, workspace=workspace, user=request.user
            ).first()
            if not conversation:
                return Response({"detail": "Conversation not found"}, status=status.HTTP_404_NOT_FOUND)
        else:
            title = message[:60] + ("…" if len(message) > 60 else "")
            conversation = AIConversation.objects.create(
                workspace=workspace,
                user=request.user,
                title=title,
            )

        AIMessage.objects.create(
            conversation=conversation,
            role=AIMessage.Role.USER,
            content=message,
        )

        history = [
            {"role": m.role, "content": m.content}
            for m in conversation.messages.exclude(role=AIMessage.Role.SYSTEM)
        ]

        result = answer_question(workspace, message, history=history[:-1], period=period)

        assistant_msg = AIMessage.objects.create(
            conversation=conversation,
            role=AIMessage.Role.ASSISTANT,
            content=result["answer"],
        )
        conversation.save(update_fields=["updated_at"])

        return Response(
            {
                "conversation_id": conversation.id,
                "message": AIMessageSerializer(assistant_msg).data,
                "provider": result["provider"],
                "error": result.get("error"),
                "insights": result["insights"],
                "context_generated_at": result.get("context_generated_at"),
            }
        )


class AIInsightsView(CurrentWorkspaceMixin, APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from .ai_service import generate_insights

        workspace = self.get_workspace()
        if not workspace:
            return Response({"detail": "Workspace not found"}, status=status.HTTP_404_NOT_FOUND)
        period = request.query_params.get("period", "30D")
        return Response({"insights": generate_insights(workspace=workspace, period=period)})


class AIConversationListView(CurrentWorkspaceMixin, APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from .models import AIConversation
        from .serializers import AIConversationSerializer

        workspace = self.get_workspace()
        if not workspace:
            return Response({"detail": "Workspace not found"}, status=status.HTTP_404_NOT_FOUND)
        convs = AIConversation.objects.filter(
            workspace=workspace, user=request.user
        ).prefetch_related("messages")[:20]
        # list without full messages for sidebar
        data = [
            {
                "id": c.id,
                "title": c.title,
                "created_at": c.created_at.isoformat(),
                "updated_at": c.updated_at.isoformat(),
            }
            for c in convs
        ]
        return Response(data)


class AIConversationDetailView(CurrentWorkspaceMixin, APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk: int):
        from .models import AIConversation
        from .serializers import AIConversationSerializer

        workspace = self.get_workspace()
        if not workspace:
            return Response({"detail": "Workspace not found"}, status=status.HTTP_404_NOT_FOUND)
        conv = AIConversation.objects.filter(
            pk=pk, workspace=workspace, user=request.user
        ).prefetch_related("messages").first()
        if not conv:
            return Response({"detail": "Not found"}, status=status.HTTP_404_NOT_FOUND)
        return Response(AIConversationSerializer(conv).data)



class IntegrationTestView(CurrentWorkspaceMixin, APIView):
    """Send a test notification to a connected channel."""

    permission_classes = [IsAuthenticated]

    def post(self, request, provider: str):
        from .notify import notify_event, send_telegram, send_email, send_webhook, send_slack
        from .models import Integration

        workspace = self.get_workspace()
        if not workspace:
            return Response({"detail": "Workspace not found"}, status=status.HTTP_404_NOT_FOUND)

        title = "NEXORA: тестовое уведомление"
        message = f"Проверка канала «{provider}» для workspace «{workspace.name}»."
        ok = False
        if provider == "telegram":
            ok = send_telegram(workspace, f"{title}\n{message}")
        elif provider == "email":
            ok = send_email(workspace, title, message)
        elif provider == "webhook":
            ok = send_webhook(workspace, {"event": "test", "title": title, "message": message})
        elif provider == "slack":
            ok = send_slack(workspace, f"{title}\n{message}")
        elif provider == "csv_export":
            ok = True
        else:
            return Response({"detail": "Тест для этого канала не поддерживается"}, status=status.HTTP_400_BAD_REQUEST)

        if not ok:
            return Response(
                {"detail": "Не удалось отправить. Проверьте настройки канала и .env."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response({"ok": True, "message": "Тестовое уведомление отправлено"})


class CsvExportView(CurrentWorkspaceMixin, APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        import csv
        import io
        from django.http import HttpResponse
        from .models import Product, Order, Customer

        workspace = self.get_workspace()
        if not workspace:
            return Response({"detail": "Workspace not found"}, status=status.HTTP_404_NOT_FOUND)

        kind = request.query_params.get("type", "orders")
        buffer = io.StringIO()
        writer = csv.writer(buffer)

        if kind == "products":
            writer.writerow(["id", "name", "sku", "price", "cost", "stock", "is_active"])
            for p in Product.objects.filter(workspace=workspace):
                writer.writerow([p.id, p.name, p.sku, p.price, p.cost, p.stock, p.is_active])
            filename = "products.csv"
        elif kind == "customers":
            writer.writerow(["id", "name", "email", "phone", "company"])
            for c in Customer.objects.filter(workspace=workspace):
                writer.writerow([c.id, c.name, c.email, c.phone, c.company])
            filename = "customers.csv"
        else:
            writer.writerow(["id", "customer", "status", "payment_status", "total", "created_at"])
            for o in Order.objects.filter(workspace=workspace).select_related("customer"):
                writer.writerow([
                    o.id,
                    o.customer.name if o.customer else "",
                    o.status,
                    o.payment_status,
                    o.total,
                    o.created_at.isoformat(),
                ])
            filename = "orders.csv"

        resp = HttpResponse(buffer.getvalue().encode("utf-8-sig"), content_type="text/csv; charset=utf-8")
        resp["Content-Disposition"] = f'attachment; filename="{filename}"'
        return resp
