import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useAuthStore } from "@/stores/auth";

const schema = z
  .object({
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    email: z.string().email("Введите корректный email"),
    password: z.string().min(8, "Минимум 8 символов"),
    password_confirm: z.string(),
  })
  .refine((d) => d.password === d.password_confirm, {
    message: "Пароли не совпадают",
    path: ["password_confirm"],
  });

type FormData = z.infer<typeof schema>;

export default function RegisterPage() {
  const navigate = useNavigate();
  const registerUser = useAuthStore((s) => s.register);
  const [serverError, setServerError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setServerError("");
    try {
      await registerUser({
        email: data.email,
        password: data.password,
        password_confirm: data.password_confirm,
        first_name: data.first_name,
        last_name: data.last_name,
      });
      navigate("/dashboard", { replace: true });
    } catch (err: unknown) {
      const data = (err as { response?: { data?: Record<string, string[] | string> } })
        ?.response?.data;
      if (data) {
        const first =
          typeof data === "object"
            ? Object.values(data).flat()[0]
            : String(data);
        setServerError(String(first) || "Не удалось создать аккаунт");
      } else {
        setServerError("Не удалось создать аккаунт");
      }
    }
  };

  return (
    <AuthLayout
      title="Создать аккаунт"
      subtitle="Начните управлять бизнесом за пару минут"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {serverError && (
          <div className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
            {serverError}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Имя"
            placeholder="Иван"
            error={errors.first_name?.message}
            {...register("first_name")}
          />
          <Input
            label="Фамилия"
            placeholder="Петров"
            error={errors.last_name?.message}
            {...register("last_name")}
          />
        </div>

        <Input
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="you@company.com"
          error={errors.email?.message}
          {...register("email")}
        />

        <Input
          label="Пароль"
          type="password"
          autoComplete="new-password"
          placeholder="Минимум 8 символов"
          error={errors.password?.message}
          {...register("password")}
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
          {isSubmitting ? "Создание..." : "Зарегистрироваться"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        Уже есть аккаунт?{" "}
        <Link to="/login" className="font-medium text-accent hover:underline">
          Войти
        </Link>
      </p>
    </AuthLayout>
  );
}
