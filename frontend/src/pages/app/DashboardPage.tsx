import { useEffect } from "react";
import { useAuthStore } from "@/stores/auth";
import { useWorkspaceStore } from "@/stores/workspace";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/Button";

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const { workspace, ensure, isLoading } = useWorkspaceStore();

  useEffect(() => {
    ensure().catch(() => {});
  }, [ensure]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Дашборд</h1>
        <p className="mt-1 text-sm text-muted">
          Добро пожаловать
          {user?.first_name ? `, ${user.first_name}` : ""}!
          {workspace && (
            <span className="ml-1">
              Workspace: <span className="font-medium text-foreground">{workspace.name}</span>
            </span>
          )}
        </p>
      </div>

      {isLoading && (
        <p className="text-sm text-muted">Подготовка workspace...</p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {["Выручка", "Заказы", "Клиенты", "Прибыль"].map((label) => (
          <div key={label} className="rounded-xl border border-border bg-surface p-5">
            <p className="text-xs text-muted">{label}</p>
            <p className="mt-2 text-2xl font-semibold tracking-tight text-muted">—</p>
            <p className="mt-1 text-xs text-muted">Данные появятся на этапе аналитики</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <Link to="/products">
          <div className="rounded-xl border border-border bg-surface p-4 transition-colors hover:border-border-strong">
            <p className="text-sm font-medium">Товары</p>
            <p className="mt-1 text-xs text-muted">Добавить и управлять каталогом</p>
          </div>
        </Link>
        <Link to="/customers">
          <div className="rounded-xl border border-border bg-surface p-4 transition-colors hover:border-border-strong">
            <p className="text-sm font-medium">Клиенты</p>
            <p className="mt-1 text-xs text-muted">База клиентов</p>
          </div>
        </Link>
        <Link to="/orders">
          <div className="rounded-xl border border-border bg-surface p-4 transition-colors hover:border-border-strong">
            <p className="text-sm font-medium">Заказы</p>
            <p className="mt-1 text-xs text-muted">Создать заказ</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
