from django.utils.text import slugify
from rest_framework import serializers

from .models import Workspace, WorkspaceMember, Product, Customer, Order, OrderItem, Expense


class WorkspaceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Workspace
        fields = ("id", "name", "slug", "is_demo", "created_at")
        read_only_fields = ("id", "slug", "is_demo", "created_at")

    def create(self, validated_data):
        user = self.context["request"].user
        name = validated_data["name"]
        base_slug = slugify(name) or "workspace"
        slug = base_slug
        counter = 1
        while Workspace.objects.filter(slug=slug).exists():
            slug = f"{base_slug}-{counter}"
            counter += 1
        workspace = Workspace.objects.create(owner=user, slug=slug, **validated_data)
        WorkspaceMember.objects.create(
            workspace=workspace, user=user, role=WorkspaceMember.Role.OWNER
        )
        return workspace


class ProductSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = (
            "id", "name", "sku", "description", "category",
            "price", "cost", "stock", "is_active", "created_at", "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")


class CustomerSerializer(serializers.ModelSerializer):
    total_orders = serializers.SerializerMethodField()
    total_spent = serializers.SerializerMethodField()

    class Meta:
        model = Customer
        fields = (
            "id", "name", "email", "phone", "company", "notes",
            "total_orders", "total_spent", "created_at", "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")

    def get_total_orders(self, obj):
        return obj.orders.count()

    def get_total_spent(self, obj):
        from django.db.models import Sum
        result = obj.orders.filter(payment_status=Order.PaymentStatus.PAID).aggregate(
            total=Sum("total")
        )
        return str(result["total"] or 0)


class OrderItemSerializer(serializers.ModelSerializer):
    subtotal = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)

    class Meta:
        model = OrderItem
        fields = ("id", "product", "product_name", "quantity", "unit_price", "subtotal")
        read_only_fields = ("id", "product_name", "subtotal")


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True)
    customer_name = serializers.CharField(source="customer.name", read_only=True, default=None)

    class Meta:
        model = Order
        fields = (
            "id", "customer", "customer_name", "status", "payment_status",
            "notes", "total", "items", "created_at", "updated_at",
        )
        read_only_fields = ("id", "total", "created_at", "updated_at")

    def create(self, validated_data):
        items_data = validated_data.pop("items")
        workspace = self.context["workspace"]
        order = Order.objects.create(workspace=workspace, **validated_data)
        for item_data in items_data:
            product = item_data.get("product")
            product_name = product.name if product else item_data.get("product_name", "Товар")
            unit_price = item_data.get("unit_price")
            if unit_price is None and product:
                unit_price = product.price
            OrderItem.objects.create(
                order=order,
                product=product,
                product_name=product_name,
                quantity=item_data.get("quantity", 1),
                unit_price=unit_price or 0,
            )
            if product and item_data.get("quantity"):
                product.stock = max(0, product.stock - item_data["quantity"])
                product.save(update_fields=["stock"])
        order.recalculate_total()
        return order

    def update(self, instance, validated_data):
        items_data = validated_data.pop("items", None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if items_data is not None:
            instance.items.all().delete()
            for item_data in items_data:
                product = item_data.get("product")
                product_name = product.name if product else item_data.get("product_name", "Товар")
                unit_price = item_data.get("unit_price")
                if unit_price is None and product:
                    unit_price = product.price
                OrderItem.objects.create(
                    order=instance,
                    product=product,
                    product_name=product_name,
                    quantity=item_data.get("quantity", 1),
                    unit_price=unit_price or 0,
                )
            instance.recalculate_total()
        return instance


class ExpenseSerializer(serializers.ModelSerializer):
    category_display = serializers.CharField(source="get_category_display", read_only=True)

    class Meta:
        model = Expense
        fields = (
            "id", "title", "category", "category_display",
            "amount", "date", "notes", "created_at", "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")
