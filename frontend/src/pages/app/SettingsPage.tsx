import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import * as api from "@/services/business";
import * as authApi from "@/services/auth";
import { useWorkspaceStore } from "@/stores/workspace";
import { useAuthStore } from "@/stores/auth";
import { useThemeStore } from "@/stores/theme";
import type { Integration } from "@/types/business";
import { cn } from "@/lib/utils";

type Tab =
  | "profile"
  | "security"
  | "appearance"
  | "notifications"
  | "workspace"
  | "integrations"
  | "billing";

const TABS: { key: Tab; label: string }[] = [
  { key: "profile", label: "Профиль" },
  { key: "security", label: "Безопасность" },
  { key: "appearance", label: "Внешний вид" },
  { key: "notifications", label: "Уведомления" },
  { key: "workspace", label: "Workspace" },
  { key: "integrations", label: "Интеграции" },
  { key: "billing", label: "Биллинг" },
];

function WorkspacePanel() {
  const workspace = useWorkspaceStore((s) => s.workspace);
  const workspaces = useWorkspaceStore((s) => s.workspaces);
  const setWorkspace = useWorkspaceStore((s) => s.setWorkspace);
  const refreshList = useWorkspaceStore((s) => s.refreshList);
  const create = useWorkspaceStore((s) => s.create);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    refreshList().catch(() => {});
  }, [refreshList]);

  const onCreate = async () => {
    if (!name.trim()) return;
    setBusy(true);
    setError("");
    try {
      await create(name.trim());
      setName("");
    } catch (e: unknown) {
      const detail =
        (e as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail ||
        "Не удалось создать workspace (проверьте лимит тарифа)";
      setError(String(detail));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-surface p-5 sm:p-6">
        <h2 className="text-sm font-semibold">Ваши workspace</h2>
        <p className="mt-1 text-xs text-muted">
          Лимит числа компаний зависит от подписки (Настройки → Биллинг)
        </p>
        <ul className="mt-4 space-y-2">
          {(workspaces.length
            ? workspaces
            : workspace
              ? [workspace]
              : []
          ).map((w) => (
            <li
              key={w.id}
              className={cn(
                "flex items-center justify-between rounded-lg border px-3 py-2.5",
                workspace?.id === w.id
                  ? "border-accent/40 bg-accent/5"
                  : "border-border bg-background"
              )}
            >
              <div>
                <p className="text-sm font-medium">{w.name}</p>
                <p className="text-xs text-muted">{w.slug}</p>
              </div>
              {workspace?.id === w.id ? (
                <Badge variant="accent">Текущий</Badge>
              ) : (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setWorkspace(w)}
                >
                  Открыть
                </Button>
              )}
            </li>
          ))}
        </ul>
      </div>
      <div className="rounded-xl border border-border bg-surface p-5 sm:p-6">
        <h2 className="text-sm font-semibold">Новый workspace</h2>
        <div className="mt-4 max-w-md space-y-3">
          <Input
            label="Название компании / магазина"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Например, Мой магазин"
          />
          {error && <p className="text-sm text-danger">{error}</p>}
          <Button onClick={onCreate} disabled={busy || !name.trim()}>
            {busy ? "Создание..." : "Создать"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function BillingPanel() {
  const queryClient = useQueryClient();
  const loadUser = useAuthStore((s) => s.loadUser);
  const { data, isLoading } = useQuery({
    queryKey: ["wallet"],
    queryFn: () => authApi.fetchWallet(),
  });
  const plansQ = useQuery({
    queryKey: ["plans"],
    queryFn: () => authApi.fetchPlans(),
  });
  const [months, setMonths] = useState(1);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const buy = useMutation({
    mutationFn: (code: string) => authApi.purchasePlan(code, months),
    onSuccess: async (res) => {
      setMsg(
        `Подписка оформлена. Списано $${res.paid}. Баланс: $${res.balance}`
      );
      setErr("");
      await loadUser();
      queryClient.invalidateQueries({ queryKey: ["wallet"] });
    },
    onError: (e: unknown) => {
      const detail =
        (e as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail || "Недостаточно средств на кошельке.";
      setErr(String(detail));
      setMsg("");
    },
  });

  if (isLoading) return <p className="text-sm text-muted">Загрузка...</p>;
  if (!data)
    return <p className="text-sm text-danger">Не удалось загрузить кошелёк</p>;

  const planName =
    plansQ.data?.find((p) => p.code === data.plan)?.name ||
    data.limits?.name ||
    data.plan;

  return (
    <>
      <div className="rounded-xl border border-border bg-surface p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold">Кошелёк</h2>
            <p className="mt-2 text-3xl font-semibold tracking-tight">
              ${Number(data.balance).toLocaleString()}
            </p>
            <p className="mt-2 text-xs text-muted">
              Пополнение баланса выполняет администратор через /admin
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted">Текущий тариф</p>
            <p className="text-lg font-semibold">{planName}</p>
            {data.plan_expires_at && (
              <p className="text-xs text-muted">
                до {new Date(data.plan_expires_at).toLocaleDateString("ru-RU")}
              </p>
            )}
          </div>
        </div>
        <div className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
          <div className="rounded-lg border border-border bg-background p-3">
            <p className="text-xs text-muted">Workspace</p>
            <p className="mt-1 font-medium">до {data.limits.max_workspaces}</p>
          </div>
          <div className="rounded-lg border border-border bg-background p-3">
            <p className="text-xs text-muted">Команда</p>
            <p className="mt-1 font-medium">
              {data.limits.max_team_members == null
                ? "без лимита"
                : `до ${data.limits.max_team_members}`}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-background p-3">
            <p className="text-xs text-muted">AI-ассистент</p>
            <p className="mt-1 font-medium">
              {data.limits.ai_enabled ? "Да" : "Нет"}
            </p>
          </div>
        </div>
      </div>

      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-medium">Сменить план</p>
          <select
            className="h-9 rounded-lg border border-border bg-background px-2 text-sm"
            value={months}
            onChange={(e) => setMonths(Number(e.target.value))}
          >
            <option value={1}>1 месяц</option>
            <option value={3}>3 месяца</option>
            <option value={6}>6 месяцев</option>
            <option value={12}>12 месяцев</option>
          </select>
        </div>
        {msg && <p className="mb-2 text-sm text-success">{msg}</p>}
        {err && <p className="mb-2 text-sm text-danger">{err}</p>}
        <div className="grid gap-3 lg:grid-cols-3">
          {(plansQ.data || []).map((plan) => {
            const active = data.plan === plan.code;
            const total = Number(plan.price) * months;
            return (
              <div
                key={plan.code}
                className={cn(
                  "flex flex-col rounded-xl border p-5",
                  active
                    ? "border-accent/40 bg-surface"
                    : "border-border bg-surface"
                )}
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">{plan.name}</h3>
                  {active && <Badge variant="accent">Текущий</Badge>}
                </div>
                <p className="mt-2 text-2xl font-semibold">
                  ${plan.price}
                  {plan.code !== "free" && (
                    <span className="text-sm font-normal text-muted">/мес</span>
                  )}
                </p>
                <ul className="mt-4 flex-1 space-y-1.5 text-xs text-muted">
                  {plan.features.map((f) => (
                    <li key={f}>• {f}</li>
                  ))}
                </ul>
                <Button
                  className="mt-5 w-full"
                  variant={active ? "secondary" : "primary"}
                  size="sm"
                  disabled={plan.code === "free" || buy.isPending}
                  onClick={() => buy.mutate(plan.code)}
                >
                  {plan.code === "free"
                    ? "Базовый"
                    : active
                      ? `Продлить ($${total})`
                      : `Купить за $${total}`}
                </Button>
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-surface p-5">
        <p className="text-sm font-medium">История кошелька</p>
        {data.transactions.length === 0 ? (
          <p className="mt-2 text-sm text-muted">Пока пусто</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted">
                  <th className="pb-2 font-medium">Тип</th>
                  <th className="pb-2 font-medium">Сумма</th>
                  <th className="pb-2 font-medium">Баланс</th>
                  <th className="pb-2 font-medium">Дата</th>
                </tr>
              </thead>
              <tbody>
                {data.transactions.map((t) => (
                  <tr
                    key={t.id}
                    className="border-b border-border last:border-0"
                  >
                    <td className="py-2.5">
                      <span className="font-medium">{t.type_display}</span>
                      {t.description && (
                        <span className="block text-xs text-muted">
                          {t.description}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5">
                      {Number(t.amount) > 0 ? "+" : ""}
                      {t.amount}
                    </td>
                    <td className="py-2.5">${t.balance_after}</td>
                    <td className="py-2.5 text-muted">
                      {new Date(t.created_at).toLocaleString("ru-RU")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-border bg-surface p-5">
        <p className="text-sm font-medium">История подписок</p>
        {data.subscriptions.length === 0 ? (
          <p className="mt-2 text-sm text-muted">Пока пусто</p>
        ) : (
          <ul className="mt-3 space-y-2 text-sm">
            {data.subscriptions.map((s) => (
              <li
                key={s.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-background px-3 py-2"
              >
                <span className="font-medium">{s.plan}</span>
                <span className="text-muted">${s.price}</span>
                <span className="text-xs text-muted">
                  {new Date(s.starts_at).toLocaleDateString("ru-RU")}
                  {s.ends_at &&
                    ` → ${new Date(s.ends_at).toLocaleDateString("ru-RU")}`}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}

function ProfilePanel() {
  const { user } = useAuthStore();
  const [firstName, setFirstName] = useState(user?.first_name || "");
  const [lastName, setLastName] = useState(user?.last_name || "");
  const [profileMsg, setProfileMsg] = useState("");
  const setUser = useAuthStore((s) => s.setUser);

  useEffect(() => {
    setFirstName(user?.first_name || "");
    setLastName(user?.last_name || "");
  }, [user]);

  const walletQ = useQuery({
    queryKey: ["wallet"],
    queryFn: () => authApi.fetchWallet(),
  });
  const wsQ = useQuery({
    queryKey: ["workspaces-count"],
    queryFn: async () => {
      const list = await api.listWorkspaces();
      return list.length;
    },
  });

  const profileMutation = useMutation({
    mutationFn: () =>
      authApi.updateProfile({ first_name: firstName, last_name: lastName }),
    onSuccess: (u) => {
      setUser(u);
      setProfileMsg("Профиль сохранён");
      setTimeout(() => setProfileMsg(""), 2500);
    },
  });

  const w = walletQ.data;

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-surface p-5 sm:p-6">
        <h2 className="text-sm font-semibold">Профиль</h2>
        <p className="mt-1 text-xs text-muted">Имя и данные аккаунта</p>
        <div className="mt-5 max-w-md space-y-4">
          <Input label="Email" value={user?.email || ""} disabled />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Имя"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
            <Input
              label="Фамилия"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
          </div>
          {profileMsg && <p className="text-sm text-success">{profileMsg}</p>}
          <Button
            onClick={() => profileMutation.mutate()}
            disabled={profileMutation.isPending}
          >
            {profileMutation.isPending ? "Сохранение..." : "Сохранить"}
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-surface p-5 sm:p-6">
        <h2 className="text-sm font-semibold">Сводка аккаунта</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-lg border border-border bg-background p-3">
            <p className="text-xs text-muted">Регистрация</p>
            <p className="mt-1 text-sm font-medium">
              {user?.date_joined
                ? new Date(user.date_joined).toLocaleDateString("ru-RU")
                : "—"}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-background p-3">
            <p className="text-xs text-muted">Тариф</p>
            <p className="mt-1 text-sm font-medium">
              {w?.limits?.name || user?.plan || "free"}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-background p-3">
            <p className="text-xs text-muted">Окончание тарифа</p>
            <p className="mt-1 text-sm font-medium">
              {w?.plan_expires_at
                ? new Date(w.plan_expires_at).toLocaleDateString("ru-RU")
                : "—"}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-background p-3">
            <p className="text-xs text-muted">Workspace</p>
            <p className="mt-1 text-sm font-medium">{wsQ.data ?? "—"}</p>
          </div>
          <div className="rounded-lg border border-border bg-background p-3">
            <p className="text-xs text-muted">AI-ассистент</p>
            <p className="mt-1 text-sm font-medium">
              {w?.limits?.ai_enabled ? "Доступен" : "Недоступен"}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-background p-3">
            <p className="text-xs text-muted">Баланс</p>
            <p className="mt-1 text-sm font-medium">
              ${Number(w?.balance ?? user?.balance ?? 0).toLocaleString()}
            </p>
          </div>
        </div>
        <div className="mt-4">
          <Link to="/settings">
            <Button
              onClick={() => {
                /* parent can switch tab via hash - use location */
                window.location.hash = "billing";
              }}
            >
              Пополнить баланс
            </Button>
          </Link>
          <p className="mt-2 text-xs text-muted">
            Или откройте вкладку «Биллинг»
          </p>
        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const workspace = useWorkspaceStore((s) => s.workspace);
  const ensure = useWorkspaceStore((s) => s.ensure);
  const { theme, setTheme } = useThemeStore();
  const hashTab = (window.location.hash || "").replace("#", "") as Tab;
  const initialTab = TABS.some((t) => t.key === hashTab) ? hashTab : "profile";
  const [tab, setTab] = useState<Tab>(initialTab);

  useEffect(() => {
    if (hashTab && TABS.some((t) => t.key === hashTab)) setTab(hashTab);
  }, [hashTab]);

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [securityMsg, setSecurityMsg] = useState("");
  const [securityError, setSecurityError] = useState("");

  const NOTIF_KEY = "nexora-notif-prefs";
  const defaultNotif = {
    orders: true,
    payments: true,
    stock: true,
    team: true,
    reports: false,
  };
  const [notifPrefs, setNotifPrefs] = useState(() => {
    try {
      const raw = localStorage.getItem(NOTIF_KEY);
      if (raw) return { ...defaultNotif, ...JSON.parse(raw) };
    } catch {
      /* ignore */
    }
    return defaultNotif;
  });
  const [notifSaved, setNotifSaved] = useState(false);

  const integrationsQ = useQuery({
    queryKey: ["integrations", workspace?.id],
    queryFn: async () => {
      await ensure();
      return api.listIntegrations(workspace?.id);
    },
  });

  const [connectProvider, setConnectProvider] = useState<string | null>(null);
  const [connectConfig, setConnectConfig] = useState<Record<string, string>>({});
  const [connectError, setConnectError] = useState("");

  const connectM = useMutation({
    mutationFn: ({ provider, config }: { provider: string; config: Record<string, string> }) =>
      api.connectIntegration(provider, workspace?.id, config),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["integrations"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      setConnectProvider(null);
      setConnectConfig({});
      setConnectError("");
    },
    onError: (e: unknown) => {
      const detail =
        (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        "Не удалось подключить";
      setConnectError(String(detail));
    },
  });

  const testM = useMutation({
    mutationFn: (provider: string) => api.testIntegration(provider, workspace?.id),
  });

  const disconnectM = useMutation({
    mutationFn: (provider: string) =>
      api.disconnectIntegration(provider, workspace?.id),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["integrations"] }),
  });

  const passwordMutation = useMutation({
    mutationFn: () =>
      authApi.changePassword({
        old_password: oldPassword,
        new_password: newPassword,
      }),
    onSuccess: (res) => {
      setSecurityMsg(res.message || "Пароль изменён");
      setSecurityError("");
      setOldPassword("");
      setNewPassword("");
    },
    onError: () => {
      setSecurityError("Не удалось сменить пароль. Проверьте текущий пароль.");
      setSecurityMsg("");
    },
  });

  const integrations = integrationsQ.data || [];
  const connected = integrations.filter((i) => i.status === "connected");
  const available = integrations.filter((i) => i.status !== "connected");

  const switchTab = (t: Tab) => {
    setTab(t);
    window.location.hash = t;
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Настройки</h1>
        <p className="mt-1 text-sm text-muted">
          Профиль, безопасность, workspace, интеграции и биллинг
        </p>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        <nav className="flex shrink-0 gap-1 overflow-x-auto lg:w-48 lg:flex-col lg:overflow-visible">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => switchTab(t.key)}
              className={cn(
                "whitespace-nowrap rounded-lg px-3 py-2 text-left text-sm transition-colors",
                tab === t.key
                  ? "bg-accent/10 font-medium text-accent"
                  : "text-muted hover:bg-surface hover:text-foreground"
              )}
            >
              {t.label}
            </button>
          ))}
        </nav>

        <div className="min-w-0 flex-1">
          {tab === "profile" && <ProfilePanel />}

          {tab === "security" && (
            <div className="rounded-xl border border-border bg-surface p-5 sm:p-6">
              <h2 className="text-sm font-semibold">Безопасность</h2>
              <p className="mt-1 text-xs text-muted">Смена пароля</p>
              <div className="mt-5 max-w-md space-y-4">
                <Input
                  label="Текущий пароль"
                  type="password"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                />
                <Input
                  label="Новый пароль"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Минимум 8 символов"
                />
                {securityMsg && (
                  <p className="text-sm text-success">{securityMsg}</p>
                )}
                {securityError && (
                  <p className="text-sm text-danger">{securityError}</p>
                )}
                <Button
                  onClick={() => passwordMutation.mutate()}
                  disabled={
                    passwordMutation.isPending ||
                    !oldPassword ||
                    newPassword.length < 8
                  }
                >
                  {passwordMutation.isPending
                    ? "Сохранение..."
                    : "Сменить пароль"}
                </Button>
              </div>
            </div>
          )}

          {tab === "appearance" && (
            <div className="rounded-xl border border-border bg-surface p-5 sm:p-6">
              <h2 className="text-sm font-semibold">Внешний вид</h2>
              <p className="mt-1 text-xs text-muted">
                Тема интерфейса: тёмная, светлая или системная
              </p>
              <div className="mt-5 flex flex-wrap items-center gap-4">
                <ThemeToggle />
                <span className="text-sm text-muted">
                  Сейчас:{" "}
                  <span className="font-medium text-foreground">
                    {theme === "dark"
                      ? "Тёмная"
                      : theme === "light"
                        ? "Светлая"
                        : "Системная"}
                  </span>
                </span>
              </div>
              <div className="mt-6 grid gap-2 sm:grid-cols-3">
                {(
                  [
                    ["dark", "Тёмная"],
                    ["light", "Светлая"],
                    ["system", "Системная"],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setTheme(value)}
                    className={cn(
                      "rounded-xl border px-4 py-3 text-left text-sm transition-colors",
                      theme === value
                        ? "border-accent/40 bg-accent/10 text-accent"
                        : "border-border bg-background hover:border-border"
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {tab === "notifications" && (
            <div className="rounded-xl border border-border bg-surface p-5 sm:p-6">
              <h2 className="text-sm font-semibold">Уведомления</h2>
              <p className="mt-1 text-xs text-muted">
                Какие события показывать в колокольчике
              </p>
              <ul className="mt-5 max-w-md space-y-3">
                {(
                  [
                    ["orders", "Новые заказы", "Когда появляется новый заказ"],
                    ["payments", "Платежи", "Оплаты и возвраты"],
                    ["stock", "Склад", "Низкий остаток товара"],
                    ["team", "Команда", "Новые участники и роли"],
                    ["reports", "Отчёты", "Месячные сводки"],
                  ] as const
                ).map(([key, label, hint]) => (
                  <li
                    key={key}
                    className="flex items-center justify-between gap-4 rounded-xl border border-border bg-background px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-medium">{label}</p>
                      <p className="text-xs text-muted">{hint}</p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={notifPrefs[key]}
                      onClick={() =>
                        setNotifPrefs((p) => ({ ...p, [key]: !p[key] }))
                      }
                      className={cn(
                        "relative h-7 w-12 shrink-0 rounded-full transition-colors",
                        notifPrefs[key] ? "bg-accent" : "bg-border"
                      )}
                    >
                      <span
                        className={cn(
                          "absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform",
                          notifPrefs[key] && "translate-x-5"
                        )}
                      />
                    </button>
                  </li>
                ))}
              </ul>
              <div className="mt-5 flex items-center gap-3">
                <Button
                  type="button"
                  onClick={() => {
                    localStorage.setItem(NOTIF_KEY, JSON.stringify(notifPrefs));
                    setNotifSaved(true);
                    setTimeout(() => setNotifSaved(false), 2000);
                  }}
                >
                  Сохранить
                </Button>
                {notifSaved && (
                  <span className="text-sm text-success">Сохранено</span>
                )}
              </div>
              <p className="mt-2 text-xs text-muted">
                Настройки колокольчика хранятся в этом браузере.
              </p>
            </div>
          )}

          {tab === "workspace" && <WorkspacePanel />}

          {tab === "integrations" && (
            <div className="space-y-6">
              <div className="rounded-xl border border-border bg-surface/50 px-4 py-3 text-sm text-muted">
                Бесплатные интеграции для уведомлений и экспорта. Настройки
                каналов (токены) — в Части 2 доработки.
              </div>
              {connected.length > 0 && (
                <div>
                  <p className="mb-3 text-sm font-medium">Подключено</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {connected.map((i: Integration) => (
                      <div
                        key={i.provider}
                        className="flex items-center justify-between rounded-xl border border-border bg-surface p-4"
                      >
                        <div>
                          <p className="text-sm font-medium">
                            {i.provider_display}
                          </p>
                          {i.description && (
                            <p className="mt-1 text-xs text-muted line-clamp-2">
                              {i.description}
                            </p>
                          )}
                          <Badge variant="success" className="mt-1">
                            Подключено
                          </Badge>
                        </div>
                        <div className="flex flex-col gap-1">
                          {["telegram", "email", "webhook", "slack"].includes(i.provider) && (
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => testM.mutate(i.provider)}
                              disabled={testM.isPending}
                            >
                              Тест
                            </Button>
                          )}
                          {i.provider === "csv_export" && (
                            <a
                              className="text-xs text-accent hover:underline"
                              href={api.csvExportUrl("orders", workspace?.id)}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Скачать CSV
                            </a>
                          )}
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => disconnectM.mutate(i.provider)}
                            disabled={disconnectM.isPending}
                          >
                            Отключить
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <p className="mb-3 text-sm font-medium">Доступно</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {available.map((i: Integration) => (
                    <div
                      key={i.provider}
                      className="flex items-center justify-between rounded-xl border border-border bg-surface p-4"
                    >
                      <div>
                        <p className="text-sm font-medium">
                          {i.provider_display}
                        </p>
                        {i.description && (
                          <p className="mt-1 text-xs text-muted line-clamp-2">
                            {i.description}
                          </p>
                        )}
                      </div>
                      <Button
                        size="sm"
                        onClick={() => { setConnectProvider(i.provider); setConnectConfig({}); setConnectError(""); }}
                        disabled={connectM.isPending}
                      >
                        Подключить
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}


      {connectProvider && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-surface p-5 shadow-elevated">
            <h3 className="text-sm font-semibold">
              Подключение: {connectProvider}
            </h3>
            <p className="mt-1 text-xs text-muted">
              Токен бота и SMTP задаются в .env на сервере. Здесь — куда слать уведомления.
            </p>
            <div className="mt-4 space-y-3">
              {connectProvider === "telegram" && (
                <Input
                  label="Telegram chat_id"
                  placeholder="Например 123456789"
                  value={connectConfig.chat_id || ""}
                  onChange={(e) =>
                    setConnectConfig((c) => ({ ...c, chat_id: e.target.value }))
                  }
                />
              )}
              {connectProvider === "email" && (
                <Input
                  label="Email для уведомлений"
                  type="email"
                  placeholder="you@example.com"
                  value={connectConfig.to_email || ""}
                  onChange={(e) =>
                    setConnectConfig((c) => ({ ...c, to_email: e.target.value }))
                  }
                />
              )}
              {connectProvider === "webhook" && (
                <>
                  <Input
                    label="Webhook URL"
                    placeholder="https://..."
                    value={connectConfig.url || ""}
                    onChange={(e) =>
                      setConnectConfig((c) => ({ ...c, url: e.target.value }))
                    }
                  />
                  <Input
                    label="Секрет (опционально)"
                    value={connectConfig.secret || ""}
                    onChange={(e) =>
                      setConnectConfig((c) => ({ ...c, secret: e.target.value }))
                    }
                  />
                </>
              )}
              {connectProvider === "slack" && (
                <Input
                  label="Slack Incoming Webhook URL"
                  placeholder="https://hooks.slack.com/..."
                  value={connectConfig.webhook_url || ""}
                  onChange={(e) =>
                    setConnectConfig((c) => ({
                      ...c,
                      webhook_url: e.target.value,
                    }))
                  }
                />
              )}
              {connectProvider === "csv_export" && (
                <p className="text-sm text-muted">
                  CSV-экспорт не требует доп. настроек. После подключения появится ссылка на скачивание.
                </p>
              )}
              {connectProvider === "google_sheets" && (
                <p className="text-sm text-muted">
                  Для Google Sheets позже: service account JSON в .env. Пока можно подключить как метку.
                </p>
              )}
              {connectProvider === "google_analytics" && (
                <Input
                  label="GA4 Measurement ID (G-XXXX)"
                  value={connectConfig.measurement_id || ""}
                  onChange={(e) =>
                    setConnectConfig((c) => ({
                      ...c,
                      measurement_id: e.target.value,
                    }))
                  }
                />
              )}
              {connectError && (
                <p className="text-sm text-danger">{connectError}</p>
              )}
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button
                variant="secondary"
                onClick={() => {
                  setConnectProvider(null);
                  setConnectError("");
                }}
              >
                Отмена
              </Button>
              <Button
                disabled={connectM.isPending}
                onClick={() =>
                  connectM.mutate({
                    provider: connectProvider,
                    config: connectConfig,
                  })
                }
              >
                {connectM.isPending ? "Подключение..." : "Подключить"}
              </Button>
            </div>
          </div>
        </div>
      )}

          {tab === "billing" && (
            <div className="space-y-6">
              <BillingPanel />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
