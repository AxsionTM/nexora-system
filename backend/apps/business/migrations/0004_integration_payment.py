from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("business", "0003_notification"),
    ]

    operations = [
        migrations.CreateModel(
            name="Integration",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                (
                    "provider",
                    models.CharField(
                        choices=[
                            ("stripe", "Stripe"),
                            ("shopify", "Shopify"),
                            ("paypal", "PayPal"),
                            ("woocommerce", "WooCommerce"),
                            ("google_analytics", "Google Analytics"),
                            ("slack", "Slack"),
                        ],
                        max_length=40,
                    ),
                ),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("connected", "Подключено"),
                            ("disconnected", "Отключено"),
                            ("error", "Ошибка"),
                        ],
                        default="disconnected",
                        max_length=20,
                    ),
                ),
                ("config", models.JSONField(blank=True, default=dict)),
                ("connected_at", models.DateTimeField(blank=True, null=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "workspace",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="integrations",
                        to="business.workspace",
                    ),
                ),
            ],
            options={"ordering": ["provider"], "unique_together": {("workspace", "provider")}},
        ),
        migrations.CreateModel(
            name="Payment",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("amount", models.DecimalField(decimal_places=2, max_digits=12)),
                ("currency", models.CharField(default="USD", max_length=3)),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("pending", "Ожидает"),
                            ("success", "Успешно"),
                            ("failed", "Ошибка"),
                            ("refunded", "Возврат"),
                        ],
                        default="pending",
                        max_length=20,
                    ),
                ),
                ("provider", models.CharField(default="sandbox", max_length=40)),
                ("external_id", models.CharField(blank=True, max_length=100)),
                ("is_test", models.BooleanField(default=True)),
                ("metadata", models.JSONField(blank=True, default=dict)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "order",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="payments",
                        to="business.order",
                    ),
                ),
                (
                    "workspace",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="payments",
                        to="business.workspace",
                    ),
                ),
            ],
            options={"ordering": ["-created_at"]},
        ),
    ]
