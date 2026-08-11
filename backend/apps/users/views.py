from rest_framework import status
from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView

from rest_framework.permissions import IsAdminUser
from .models import WalletTransaction, SubscriptionHistory
from .plans import PLANS, get_plan_limits, get_effective_plan
from .billing import purchase_plan, credit_balance, admin_set_plan
from .serializers import (
    ChangePasswordSerializer,
    PasswordResetConfirmSerializer,
    PasswordResetRequestSerializer,
    RegisterSerializer,
    UserSerializer,
)

User = get_user_model()


class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(
            {
                "user": UserSerializer(user).data,
                "message": "Аккаунт успешно создан.",
            },
            status=status.HTTP_201_CREATED,
        )


class MeView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user


class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = request.user
        if not user.check_password(serializer.validated_data["old_password"]):
            return Response(
                {"old_password": ["Неверный текущий пароль."]},
                status=status.HTTP_400_BAD_REQUEST,
            )
        user.set_password(serializer.validated_data["new_password"])
        user.save()
        return Response({"message": "Пароль успешно изменён."})


class PasswordResetRequestView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data["email"].lower()
        try:
            user = User.objects.get(email__iexact=email)
        except User.DoesNotExist:
            # Do not reveal whether the email exists
            return Response(
                {
                    "message": "Если аккаунт с таким email существует, мы отправили инструкции по сбросу пароля."
                }
            )

        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = default_token_generator.make_token(user)

        # In development / portfolio mode we return the token so the UI can proceed
        # without requiring a real mail server.
        return Response(
            {
                "message": "Если аккаунт с таким email существует, мы отправили инструкции по сбросу пароля.",
                "debug": {
                    "uid": uid,
                    "token": token,
                    "reset_path": f"/reset-password?uid={uid}&token={token}",
                },
            }
        )


class PasswordResetConfirmView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        try:
            uid = force_str(urlsafe_base64_decode(data["uid"]))
            user = User.objects.get(pk=uid)
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            return Response(
                {"token": ["Недействительная или устаревшая ссылка."]},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not default_token_generator.check_token(user, data["token"]):
            return Response(
                {"token": ["Недействительная или устаревшая ссылка."]},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user.set_password(data["new_password"])
        user.save()
        return Response({"message": "Пароль успешно сброшен. Теперь вы можете войти."})




class WalletView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        limits = get_plan_limits(user)
        txs = WalletTransaction.objects.filter(user=user)[:30]
        subs = SubscriptionHistory.objects.filter(user=user)[:20]
        return Response(
            {
                "balance": str(user.balance),
                "plan": get_effective_plan(user),
                "plan_expires_at": user.plan_expires_at.isoformat() if user.plan_expires_at else None,
                "limits": {
                    "max_workspaces": limits["max_workspaces"],
                    "max_team_members": limits["max_team_members"],
                    "max_orders_per_month": limits["max_orders_per_month"],
                    "ai_enabled": limits["ai_enabled"],
                    "name": limits["name"],
                    "price": str(limits["price"]),
                    "features": limits["features"],
                },
                "transactions": [
                    {
                        "id": t.id,
                        "type": t.type,
                        "type_display": t.get_type_display(),
                        "amount": str(t.amount),
                        "balance_after": str(t.balance_after),
                        "description": t.description,
                        "created_at": t.created_at.isoformat(),
                    }
                    for t in txs
                ],
                "subscriptions": [
                    {
                        "id": s.id,
                        "plan": s.plan,
                        "price": str(s.price),
                        "starts_at": s.starts_at.isoformat(),
                        "ends_at": s.ends_at.isoformat() if s.ends_at else None,
                        "note": s.note,
                        "created_at": s.created_at.isoformat(),
                    }
                    for s in subs
                ],
            }
        )


class PlansListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(
            [
                {
                    "code": code,
                    "name": p["name"],
                    "price": str(p["price"]),
                    "max_workspaces": p["max_workspaces"],
                    "max_team_members": p["max_team_members"],
                    "max_orders_per_month": p["max_orders_per_month"],
                    "ai_enabled": p["ai_enabled"],
                    "features": p["features"],
                }
                for code, p in PLANS.items()
            ]
        )


class PurchasePlanView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        plan = request.data.get("plan")
        months = int(request.data.get("months") or 1)
        try:
            result = purchase_plan(request.user, plan, months=months)
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(result)


class AdminGrantView(APIView):
    """Staff-only: grant balance or plan by email. Also available via /admin UI."""

    permission_classes = [IsAuthenticated, IsAdminUser]

    def post(self, request):
        from django.contrib.auth import get_user_model
        from decimal import Decimal

        User = get_user_model()
        email = (request.data.get("email") or "").lower().strip()
        if not email:
            return Response({"detail": "Укажите email"}, status=status.HTTP_400_BAD_REQUEST)
        try:
            user = User.objects.get(email__iexact=email)
        except User.DoesNotExist:
            return Response({"detail": "Пользователь не найден"}, status=status.HTTP_404_NOT_FOUND)

        action = request.data.get("action")  # deposit | set_plan
        if action == "deposit":
            amount = Decimal(str(request.data.get("amount") or "0"))
            if amount <= 0:
                return Response({"detail": "Сумма должна быть > 0"}, status=status.HTTP_400_BAD_REQUEST)
            tx = credit_balance(
                user,
                amount,
                type=WalletTransaction.Type.ADJUSTMENT,
                description=request.data.get("description") or "Пополнение администратором",
                created_by=request.user,
            )
            return Response(
                {"email": user.email, "balance": str(user.balance), "tx_id": tx.id}
            )
        if action == "set_plan":
            plan = request.data.get("plan") or "free"
            months = int(request.data.get("months") or 1)
            try:
                admin_set_plan(user, plan, months=months, note="Admin API grant", created_by=request.user)
            except ValueError as e:
                return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
            user.refresh_from_db()
            return Response(
                {
                    "email": user.email,
                    "plan": user.plan,
                    "plan_expires_at": user.plan_expires_at.isoformat() if user.plan_expires_at else None,
                }
            )
        return Response({"detail": "action: deposit | set_plan"}, status=status.HTTP_400_BAD_REQUEST)


class TopUpView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        from decimal import Decimal
        from .payments import create_topup_payment

        try:
            amount = Decimal(str(request.data.get("amount") or "0"))
        except Exception:
            return Response({"detail": "Некорректная сумма"}, status=status.HTTP_400_BAD_REQUEST)

        return_url = request.data.get("return_url") or "http://localhost:5173/settings#billing"
        try:
            result = create_topup_payment(request.user, amount, return_url)
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(result)


class YooKassaWebhookView(APIView):
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        from .payments import process_yookassa_webhook
        import logging
        log = logging.getLogger(__name__)
        try:
            body = request.data if isinstance(request.data, dict) else {}
            result = process_yookassa_webhook(body)
            log.info("YooKassa webhook: %s", result)
            return Response({"ok": True, **result})
        except Exception:
            log.exception("Webhook error")
            return Response({"ok": False}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
