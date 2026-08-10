import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { confirmPasswordReset } from "@/services/auth";

const schema = z
  .object({
    new_password: z.string().min(8, "Минимум 8 символов"),
    password_confirm: z.string(),
  })
  .refine((d) => d.new_password === d.password_confirm, {
    message: "Пароли не совпадают",
    path: ["password_confirm"],
  });

type FormData = z.infer<typeof schema>;

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const uid = searchParams.get("uid") || "";
  const token = searchParams.get("token") || "";
  const [serverError, setServerError] = useState("");
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setServerError("");
    if (!uid || !token) {
      setServerError("Недействительная ссылка для сброса пароля.");
      return;
    }
    try {
      await confirmPasswordReset(uid, token, data.new_password);
      setSuccess(true);
      setTimeout(() => navigate("/login"), 2000);
    } catch {
      setServerError("Недействительная или устаревшая ссылка.");
    }
  };

  if (success) {
    return (
      <AuthLayout title="Пароль изменён" subtitle="Теперь вы можете войти">
        <p className="text-sm text-muted">Перенаправляем на страницу входа...</p>
        <Link to="/login" className="mt-4 block">
          <Button className="w-full">Войти</Button>
        </Link>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Новый пароль"
      subtitle="Придумайте новый пароль для аккаунта"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {serverError && (
          <div className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
            {serverError}
          </div>
        )}
        <Input
          label="Новый пароль"
          type="password"
          autoComplete="new-password"
          placeholder="Минимум 8 символов"
          error={errors.new_password?.message}
          {...register("new_password")}
        />
        <Input
          label="Повторите пароль"
          type="password"
          autoComplete="new-password"
          placeholder="••••••••"
          error={errors.password_confirm?.message}
          {...register("password_confirm")}
        />
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Сохранение..." : "Сохранить пароль"}
        </Button>
      </form>
    </AuthLayout>
  );
}
