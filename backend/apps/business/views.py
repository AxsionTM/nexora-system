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
        """Invite member by email (creates user stub if needed, or links existing)."""
        from django.contrib.auth import get_user_model
        from .serializers import InviteMemberSerializer, WorkspaceMemberSerializer
        from .models import Notification

        User = get_user_model()
        workspace = self.get_workspace()
        if not workspace:
            return Response({"detail": "Workspace not found"}, status=status.HTTP_404_NOT_FOUND)

        serializer = InviteMemberSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data["email"].lower()
        role = serializer.validated_data["role"]

        if role == WorkspaceMember.Role.OWNER:
            return Response(
                {"role": ["Нельзя назначить роль владельца через приглашение."]},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user, created = User.objects.get_or_create(
            email=email,
            defaults={"first_name": email.split("@")[0]},
        )
        if created:
            user.set_unusable_password()
            user.save()

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

        if member.role == WorkspaceMember.Role.OWNER:
            return Response(
                {"role": ["Роль владельца нельзя изменить."]},
                status=status.HTTP_400_BAD_REQUEST,
            )
        role = request.data.get("role")
        if role and role in dict(WorkspaceMember.Role.choices):
            if role == WorkspaceMember.Role.OWNER:
                return Response(
                    {"role": ["Нельзя назначить роль владельца."]},
                    status=status.HTTP_400_BAD_REQUEST,
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

        if member.role == WorkspaceMember.Role.OWNER:
            return Response(
                {"detail": "Нельзя удалить владельца."},
                status=status.HTTP_400_BAD_REQUEST,
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


class IntegrationListView(CurrentWorkspaceMixin, APIView):
    """List all known providers with connection status for the workspace."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        from .models import Integration
        from .serializers import IntegrationSerializer
        from django.utils import timezone

        workspace = self.get_workspace()
        if not workspace:
            return Response({"detail": "Workspace not found"}, status=status.HTTP_404_NOT_FOUND)

        existing = {
            i.provider: i
            for i in Integration.objects.filter(workspace=workspace)
        }
        result = []
        for value, label in Integration.Provider.choices:
            if value in existing:
                result.append(IntegrationSerializer(existing[value]).data)
            else:
                result.append(
                    {
                        "id": None,
                        "provider": value,
                        "provider_display": label,
                        "status": Integration.Status.DISCONNECTED,
                        "status_display": "Отключено",
                        "connected_at": None,
                        "updated_at": None,
                    }
                )
        return Response(result)


class IntegrationConnectView(CurrentWorkspaceMixin, APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, provider: str):
        from .models import Integration, Notification
        from .serializers import IntegrationSerializer
        from django.utils import timezone

        workspace = self.get_workspace()
        if not workspace:
            return Response({"detail": "Workspace not found"}, status=status.HTTP_404_NOT_FOUND)

        valid = {c[0] for c in Integration.Provider.choices}
        if provider not in valid:
            return Response({"detail": "Unknown provider"}, status=status.HTTP_400_BAD_REQUEST)

        integration, _ = Integration.objects.get_or_create(
            workspace=workspace,
            provider=provider,
        )
        integration.status = Integration.Status.CONNECTED
        integration.connected_at = timezone.now()
        integration.config = {"mode": "sandbox", "connected_by": request.user.email}
        integration.save()

        Notification.objects.create(
            workspace=workspace,
            user=request.user,
            type=Notification.Type.SYSTEM,
            title=f"Интеграция {integration.get_provider_display()} подключена",
            message="Режим DEMO / TEST — реальные платежи не выполняются.",
            link="/settings",
        )
        return Response(IntegrationSerializer(integration).data)


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
                "insights": result["insights"],
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
