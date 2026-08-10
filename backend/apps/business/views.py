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
