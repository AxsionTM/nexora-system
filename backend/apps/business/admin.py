from django.contrib import admin
from .models import Workspace, WorkspaceMember, Product, Customer, Order, OrderItem


class WorkspaceMemberInline(admin.TabularInline):
    model = WorkspaceMember
    extra = 0


@admin.register(Workspace)
class WorkspaceAdmin(admin.ModelAdmin):
    list_display = ("name", "slug", "owner", "is_demo", "created_at")
    search_fields = ("name", "slug")
    inlines = [WorkspaceMemberInline]


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ("name", "workspace", "sku", "price", "stock", "is_active")
    list_filter = ("is_active", "workspace")
    search_fields = ("name", "sku")


@admin.register(Customer)
class CustomerAdmin(admin.ModelAdmin):
    list_display = ("name", "email", "phone", "workspace", "created_at")
    search_fields = ("name", "email")


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ("id", "workspace", "customer", "status", "payment_status", "total", "created_at")
    list_filter = ("status", "payment_status")
    inlines = [OrderItemInline]
