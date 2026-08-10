import { useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { requestPasswordReset } from "@/services/auth";

const schema = z.object({
  email: z.string().email("Введите корректный email"),
});

type FormData = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [debugPath, setDebugPath] = useState<string | null>(null);
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
      const res = await requestPasswordReset(data.email);
      setSent(true);
      if (res.debug?.reset_path) {
        setDebugPath(res.debug.reset_path);
      }
    } catch {
      setServerError("Не удалось отправить запрос. Попробуйте позже.");
    }
  };

  if (sent) {
    return (
      <AuthLayout title="Проверьте почту" subtitle="Мы отправили инструкции">
        <p className="text-sm text-muted">
          Если аккаунт с таким email существует, вы получите письмо со ссылкой
          для сброса пароля.
        </p>
        {debugPath && (
          <div className="mt-4 rounded-lg border border-border bg-background p-3 text-xs">
            <p className="mb-1 font-medium text-muted">Режим разработки:</p>
            <Link to={debugPath} className="text-accent break-all hover:underline">
              {debugPath}
            </Link>
          </div>
        )}
        <Link to="/login" className="mt-6 block">
          <Button variant="secondary" className="w-full">
            Вернуться к входу
          </Button>
        </Link>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Сброс пароля"
      subtitle="Укажите email — мы пришлём ссылку для восстановления"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {serverError && (
          <div className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
            {serverError}
          </div>
        )}
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="you@company.com"
          error={errors.email?.message}
          {...register("email")}
        />
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Отправка..." : "Отправить ссылку"}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted">
        <Link to="/login" className="text-accent hover:underline">
          Вернуться к входу
        </Link>
      </p>
    </AuthLayout>
  );
}
