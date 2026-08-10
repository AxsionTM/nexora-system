from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("business", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="Expense",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("title", models.CharField(max_length=255)),
                (
                    "category",
                    models.CharField(
                        choices=[
                            ("marketing", "Маркетинг"),
                            ("salary", "Зарплата"),
                            ("rent", "Аренда"),
                            ("software", "ПО / Подписки"),
                            ("logistics", "Логистика"),
                            ("taxes", "Налоги"),
                            ("other", "Прочее"),
                        ],
                        default="other",
                        max_length=20,
                    ),
                ),
                ("amount", models.DecimalField(decimal_places=2, max_digits=12)),
                ("date", models.DateField()),
                ("notes", models.TextField(blank=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "workspace",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="expenses",
                        to="business.workspace",
                    ),
                ),
            ],
            options={
                "ordering": ["-date", "-created_at"],
            },
        ),
    ]
