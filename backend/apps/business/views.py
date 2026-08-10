from django.db.models import Q
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Workspace, WorkspaceMember, Product, Customer, Order
from .serializers import (
    WorkspaceSerializer,
    ProductSerializer,
    CustomerSerializer,
    OrderSerializer,
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
