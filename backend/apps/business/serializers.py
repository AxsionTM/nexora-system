from django.utils.text import slugify
from rest_framework import serializers

from .models import Workspace, WorkspaceMember, Product, Customer, Order, OrderItem, Expense, Notification, Integration, Payment, AIConversation, AIMessage


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

    def validate(self, attrs):
        stock = attrs.get("stock")
        if stock is None and self.instance is not None:
            stock = self.instance.stock
        if stock is not None and int(stock) <= 0:
            attrs["is_active"] = False
            attrs["stock"] = max(0, int(stock))
        return attrs

    def create(self, validated_data):
        if validated_data.get("stock", 0) <= 0:
            validated_data["is_active"] = False
        return super().create(validated_data)

    def update(self, instance, validated_data):
        stock = validated_data.get("stock", instance.stock)
        if stock is not None and int(stock) <= 0:
            validated_data["is_active"] = False
            validated_data["stock"] = 0
        return super().update(instance, validated_data)


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

    def _apply_items(self, order, items_data, *, restore_stock=False):
        """Validate stock, create line items, decrement inventory."""
        # Optional: restore stock from previous items when editing
        if restore_stock:
            for old in order.items.select_related("product"):
                if old.product_id and old.product:
                    old.product.stock += old.quantity
                    old.product.is_active = True if old.product.stock > 0 else old.product.is_active
                    old.product.save(update_fields=["stock", "is_active"])
            order.items.all().delete()

        for item_data in items_data:
            product = item_data.get("product")
            qty = int(item_data.get("quantity") or 1)
            if qty < 1:
                raise serializers.ValidationError({"items": ["Количество должно быть не меньше 1."]})

            if product is not None:
                product.refresh_from_db()
                if product.stock < qty:
                    raise serializers.ValidationError(
                        {
                            "items": [
                                f"Недостаточно «{product.name}» на складе. "
                                f"Доступно: {product.stock}, запрошено: {qty}."
                            ]
                        }
                    )
                if not product.is_active and product.stock <= 0:
                    raise serializers.ValidationError(
                        {"items": [f"Товар «{product.name}» недоступен (нет остатка)."]}
                    )

            product_name = product.name if product else item_data.get("product_name", "Товар")
            unit_price = item_data.get("unit_price")
            if unit_price is None and product:
                unit_price = product.price

            OrderItem.objects.create(
                order=order,
                product=product,
                product_name=product_name,
                quantity=qty,
                unit_price=unit_price or 0,
            )
            if product:
                product.stock = max(0, product.stock - qty)
                # Zero stock → deactivate automatically
                fields = ["stock"]
                if product.stock == 0:
                    product.is_active = False
                    fields.append("is_active")
                product.save(update_fields=fields)

        order.recalculate_total()
        return order

    def create(self, validated_data):
        items_data = validated_data.pop("items")
        workspace = self.context["workspace"]
        # Cancelled orders do not reserve stock
        status = validated_data.get("status")
        order = Order.objects.create(workspace=workspace, **validated_data)
        if status == Order.Status.CANCELLED:
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
            order.recalculate_total()
            return order
        return self._apply_items(order, items_data)

    def update(self, instance, validated_data):
        items_data = validated_data.pop("items", None)
        old_status = instance.status
        new_status = validated_data.get("status", old_status)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        # Transition to cancelled: restore stock
        if old_status != Order.Status.CANCELLED and new_status == Order.Status.CANCELLED:
            for old in instance.items.select_related("product"):
                if old.product_id and old.product:
                    old.product.stock += old.quantity
                    if old.product.stock > 0:
                        old.product.is_active = True
                    old.product.save(update_fields=["stock", "is_active"])
            # Cancelled paid orders are not revenue (handled in analytics)
            if instance.payment_status == Order.PaymentStatus.PAID:
                instance.payment_status = Order.PaymentStatus.REFUNDED
                instance.save(update_fields=["payment_status", "updated_at"])
            return instance

        if items_data is not None and new_status != Order.Status.CANCELLED:
            return self._apply_items(instance, items_data, restore_stock=True)
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



class WorkspaceMemberSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(source="user.email", read_only=True)
    full_name = serializers.CharField(source="user.full_name", read_only=True)
    first_name = serializers.CharField(source="user.first_name", read_only=True)
    last_name = serializers.CharField(source="user.last_name", read_only=True)
    role_display = serializers.CharField(source="get_role_display", read_only=True)

    class Meta:
        model = WorkspaceMember
        fields = (
            "id", "email", "full_name", "first_name", "last_name",
            "role", "role_display", "joined_at",
        )
        read_only_fields = ("id", "joined_at")


class InviteMemberSerializer(serializers.Serializer):
    email = serializers.EmailField()
    role = serializers.ChoiceField(
        choices=WorkspaceMember.Role.choices,
        default=WorkspaceMember.Role.EMPLOYEE,
    )


class NotificationSerializer(serializers.ModelSerializer):
    type_display = serializers.CharField(source="get_type_display", read_only=True)

    class Meta:
        model = Notification
        fields = (
            "id", "type", "type_display", "title", "message",
            "is_read", "link", "created_at",
        )
        read_only_fields = ("id", "created_at")



class IntegrationSerializer(serializers.ModelSerializer):
    provider_display = serializers.CharField(source="get_provider_display", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = Integration
        fields = (
            "id", "provider", "provider_display", "status", "status_display",
            "connected_at", "updated_at",
        )
        read_only_fields = ("id", "connected_at", "updated_at")


class PaymentSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    order_id = serializers.PrimaryKeyRelatedField(source="order", read_only=True, allow_null=True)

    class Meta:
        model = Payment
        fields = (
            "id", "order", "order_id", "amount", "currency", "status", "status_display",
            "provider", "external_id", "is_test", "created_at", "updated_at",
        )
        read_only_fields = ("id", "external_id", "provider", "is_test", "created_at", "updated_at")


class SandboxPaymentSerializer(serializers.Serializer):
    amount = serializers.DecimalField(max_digits=12, decimal_places=2)
    order_id = serializers.IntegerField(required=False, allow_null=True)
    simulate = serializers.ChoiceField(
        choices=["success", "failed", "pending"],
        default="success",
    )


class AIChatSerializer(serializers.Serializer):
    message = serializers.CharField(max_length=2000)
    conversation_id = serializers.IntegerField(required=False, allow_null=True)
    period = serializers.ChoiceField(
        choices=["7D", "30D", "3M", "6M", "1Y"], default="30D", required=False
    )


class AIMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = AIMessage
        fields = ("id", "role", "content", "created_at")
        read_only_fields = fields


class AIConversationSerializer(serializers.ModelSerializer):
    messages = AIMessageSerializer(many=True, read_only=True)

    class Meta:
        model = AIConversation
        fields = ("id", "title", "created_at", "updated_at", "messages")
        read_only_fields = fields
