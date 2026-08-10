import { useAuthStore } from "@/stores/auth";

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Дашборд</h1>
        <p className="mt-1 text-sm text-muted">
          Добро пожаловать
          {user?.first_name ? `, ${user.first_name}` : ""}! Здесь появится
          аналитика вашего бизнеса.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {["Выручка", "Заказы", "Клиенты", "Прибыль"].map((label) => (
          <div
            key={label}
            className="rounded-xl border border-border bg-surface p-5"
          >
            <p className="text-xs text-muted">{label}</p>
            <p className="mt-2 text-2xl font-semibold tracking-tight text-muted">
              —
            </p>
            <p className="mt-1 text-xs text-muted">Данные появятся позже</p>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-xl border border-dashed border-border bg-surface/50 px-6 py-12 text-center">
        <p className="text-sm text-muted">
          Полноценный дашборд с графиками и KPI будет добавлен на этапе 5.
        </p>
      </div>
    </div>
  );
}
