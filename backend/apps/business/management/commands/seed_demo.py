from decimal import Decimal
from datetime import timedelta
import random

from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.utils.text import slugify

from apps.business.models import (
    Workspace,
    WorkspaceMember,
    Product,
    Customer,
    Order,
    OrderItem,
    Expense,
    Notification,
)

User = get_user_model()

# Fixed account for local development
SEED_EMAIL = "ignatevm601@gmail.com"
SEED_PASSWORD = "PT4_zwuS_gv3Ly2"
SEED_FIRST = "Максим"
SEED_LAST = "Игнатьев"

PRODUCTS = [
    ("Беспроводные наушники Pro", "WH-PRO-01", "Электроника", "129.00", "65.00", 48),
    ("Механическая клавиатура", "KB-MECH-02", "Электроника", "89.00", "42.00", 35),
    ("USB-C хаб 7-в-1", "HUB-7IN1", "Аксессуары", "49.00", "18.00", 120),
    ("Коврик для мыши XL", "PAD-XL", "Аксессуары", "24.00", "8.00", 200),
    ("Монитор 27\" 144Hz", "MON-27-144", "Электроника", "299.00", "180.00", 22),
    ("Веб-камера 1080p", "CAM-1080", "Электроника", "59.00", "28.00", 60),
    ("Подставка для ноутбука", "STAND-NB", "Аксессуары", "39.00", "14.00", 85),
    ("Рюкзак для ноутбука", "BAG-15", "Аксессуары", "69.00", "30.00", 40),
    ("Зарядка GaN 65W", "CHG-65W", "Аксессуары", "45.00", "16.00", 95),
    ("Кабель USB-C 2м", "CABLE-C2", "Аксессуары", "12.00", "3.50", 300),
]

CUSTOMERS = [
    ("Анна Смирнова", "anna.smirnova@email.com", "+7 900 111-22-33", "Design Studio"),
    ("Игорь Козлов", "igor.kozlov@email.com", "+7 900 222-33-44", "TechStart"),
    ("Мария Иванова", "maria.ivanova@email.com", "+7 900 333-44-55", ""),
    ("Дмитрий Орлов", "d.orlov@email.com", "+7 900 444-55-66", "Orlov Labs"),
    ("Елена Соколова", "e.sokolova@email.com", "+7 900 555-66-77", "Sokol Media"),
    ("Павел Новиков", "p.novikov@email.com", "+7 900 666-77-88", ""),
    ("Ольга Морозова", "o.morozova@email.com", "+7 900 777-88-99", "Moroz Group"),
    ("Сергей Волков", "s.volkov@email.com", "+7 900 888-99-00", "Volkov IT"),
]


class Command(BaseCommand):
    help = "Create seed user, workspace, products, customers and orders"

    def handle(self, *args, **options):
        user, created = User.objects.get_or_create(
            email=SEED_EMAIL,
            defaults={
                "first_name": SEED_FIRST,
                "last_name": SEED_LAST,
                "is_staff": True,
            },
        )
        user.first_name = SEED_FIRST
        user.last_name = SEED_LAST
        user.set_password(SEED_PASSWORD)
        user.is_staff = True
        user.save()
        self.stdout.write(
            self.style.SUCCESS(
                f"{'Created' if created else 'Updated'} user: {SEED_EMAIL}"
            )
        )

        workspace, ws_created = Workspace.objects.get_or_create(
            slug="nexora-demo-store",
            defaults={
                "name": "NEXORA Demo Store",
                "owner": user,
                "is_demo": True,
            },
        )
        if not ws_created:
            workspace.owner = user
            workspace.is_demo = True
            workspace.save()
        WorkspaceMember.objects.get_or_create(
            workspace=workspace,
            user=user,
            defaults={"role": WorkspaceMember.Role.OWNER},
        )
        self.stdout.write(self.style.SUCCESS(f"Workspace: {workspace.name}"))

        # Clear previous demo data for idempotent re-runs
        OrderItem.objects.filter(order__workspace=workspace).delete()
        Order.objects.filter(workspace=workspace).delete()
        Product.objects.filter(workspace=workspace).delete()
        Customer.objects.filter(workspace=workspace).delete()
        Expense.objects.filter(workspace=workspace).delete()

        products = []
        for name, sku, category, price, cost, stock in PRODUCTS:
            p = Product.objects.create(
                workspace=workspace,
                name=name,
                sku=sku,
                category=category,
                price=Decimal(price),
                cost=Decimal(cost),
                stock=stock,
                is_active=True,
            )
            products.append(p)
        self.stdout.write(self.style.SUCCESS(f"Products: {len(products)}"))

        customers = []
        for name, email, phone, company in CUSTOMERS:
            c = Customer.objects.create(
                workspace=workspace,
                name=name,
                email=email,
                phone=phone,
                company=company,
            )
            customers.append(c)
        self.stdout.write(self.style.SUCCESS(f"Customers: {len(customers)}"))

        statuses = [
            Order.Status.PENDING,
            Order.Status.PROCESSING,
            Order.Status.SHIPPED,
            Order.Status.DELIVERED,
            Order.Status.DELIVERED,
            Order.Status.DELIVERED,
            Order.Status.CANCELLED,
        ]
        payment_for_status = {
            Order.Status.PENDING: Order.PaymentStatus.UNPAID,
            Order.Status.PROCESSING: Order.PaymentStatus.PAID,
            Order.Status.SHIPPED: Order.PaymentStatus.PAID,
            Order.Status.DELIVERED: Order.PaymentStatus.PAID,
            Order.Status.CANCELLED: Order.PaymentStatus.REFUNDED,
        }

        now = timezone.now()
        order_count = 0
        for days_ago in range(90, -1, -1):
            # 0–3 orders per day with higher weight on recent days
            n = random.choices([0, 1, 2, 3], weights=[4, 5, 3, 1])[0]
            if days_ago > 60:
                n = random.choices([0, 1], weights=[7, 3])[0]
            for _ in range(n):
                customer = random.choice(customers)
                status = random.choice(statuses)
                order = Order.objects.create(
                    workspace=workspace,
                    customer=customer,
                    status=status,
                    payment_status=payment_for_status[status],
                    notes="",
                    created_at=now - timedelta(days=days_ago, hours=random.randint(8, 20)),
                )
                # 1–3 items
                chosen = random.sample(products, k=random.randint(1, min(3, len(products))))
                for product in chosen:
                    qty = random.randint(1, 3)
                    OrderItem.objects.create(
                        order=order,
                        product=product,
                        product_name=product.name,
                        quantity=qty,
                        unit_price=product.price,
                    )
                order.recalculate_total()
                # Preserve historical created_at
                Order.objects.filter(pk=order.pk).update(
                    created_at=now - timedelta(days=days_ago, hours=random.randint(8, 20))
                )
                order_count += 1

        self.stdout.write(self.style.SUCCESS(f"Orders: {order_count}"))
        # Expenses over last 90 days
        expense_templates = [
            ("Реклама Google Ads", Expense.Category.MARKETING, "450", 12),
            ("Реклама VK", Expense.Category.MARKETING, "280", 18),
            ("Зарплата менеджера", Expense.Category.SALARY, "1200", 30),
            ("Аренда офиса", Expense.Category.RENT, "800", 30),
            ("Подписка Notion", Expense.Category.SOFTWARE, "20", 30),
            ("Подписка Figma", Expense.Category.SOFTWARE, "15", 30),
            ("Доставка СДЭК", Expense.Category.LOGISTICS, "90", 7),
            ("Упаковка", Expense.Category.LOGISTICS, "40", 14),
            ("Налог УСН", Expense.Category.TAXES, "350", 30),
            ("Канцтовары", Expense.Category.OTHER, "25", 20),
        ]
        expense_count = 0
        for days_ago in range(90, -1, -1):
            for title, category, amount, every_n in expense_templates:
                if days_ago % every_n == 0:
                    Expense.objects.create(
                        workspace=workspace,
                        title=title,
                        category=category,
                        amount=Decimal(amount),
                        date=(now - timedelta(days=days_ago)).date(),
                        notes="",
                    )
                    expense_count += 1
        self.stdout.write(self.style.SUCCESS(f"Expenses: {expense_count}"))


        # Sample notifications
        Notification.objects.filter(workspace=workspace).delete()
        sample_notifications = [
            (Notification.Type.ORDER, "Новый заказ", "Поступил заказ от клиента.", "/orders"),
            (Notification.Type.PAYMENT, "Оплата получена", "Заказ успешно оплачен.", "/orders"),
            (Notification.Type.STOCK, "Низкий остаток", "У некоторых товаров заканчивается склад.", "/products"),
            (Notification.Type.TEAM, "Участник добавлен", "В команду добавлен новый сотрудник.", "/team"),
            (Notification.Type.REPORT, "Месячный отчёт готов", "Сводка за месяц доступна в аналитике.", "/analytics"),
        ]
        for ntype, title, message, link in sample_notifications:
            Notification.objects.create(
                workspace=workspace,
                user=user,
                type=ntype,
                title=title,
                message=message,
                link=link,
                is_read=False,
            )
        self.stdout.write(self.style.SUCCESS(f"Notifications: {len(sample_notifications)}"))

        self.stdout.write(self.style.SUCCESS("Seed complete. Login with:"))
        self.stdout.write(f"  email:    {SEED_EMAIL}")
        self.stdout.write(f"  password: {SEED_PASSWORD}")
