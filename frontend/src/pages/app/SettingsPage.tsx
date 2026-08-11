import { useState, useEffect } from "react";
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
import type { Integration, Payment } from "@/types/business";
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

const PLANS = [
  {
    id: "free",
    name: "Бесплатный",
    price: "$0",
    features: ["1 workspace", "До 50 заказов / мес", "Базовая аналитика", "Демо-режим"],
  },
  {
    id: "pro",
    name: "Pro",
    price: "$29",
    features: [
      "Безлимитные заказы",
      "Расширенная аналитика",
      "Команда до 5",
      "AI-ассистент",
      "Интеграции",
    ],
  },
  {
    id: "business",
    name: "Бизнес",
    price: "$79",
    features: [
      "Всё из Pro",
      "Безлимитная команда",
      "Роли и права",
      "Приоритетная поддержка",
      "Аудит-лог",
    ],
  },
];

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const workspace = useWorkspaceStore((s) => s.workspace);
  const ensure = useWorkspaceStore((s) => s.ensure);
  const setWorkspace = useWorkspaceStore((s) => s.setWorkspace);
  const { user, setUser } = useAuthStore();
  const { theme, setTheme } = useThemeStore();
  const [tab, setTab] = useState<Tab>("profile");

  // Profile
  const [firstName, setFirstName] = useState(user?.first_name || "");
  const [lastName, setLastName] = useState(user?.last_name || "");
  const [profileMsg, setProfileMsg] = useState("");

  useEffect(() => {
    setFirstName(user?.first_name || "");
    setLastName(user?.last_name || "");
  }, [user]);

  // Security
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [securityMsg, setSecurityMsg] = useState("");
  const [securityError, setSecurityError] = useState("");

  // Notifications prefs (local)
  const [notifPrefs, setNotifPrefs] = useState({
    orders: true,
    payments: true,
    stock: true,
    team: true,
    reports: false,
  });

  // Workspace rename
  const [wsName, setWsName] = useState(workspace?.name || "");
  useEffect(() => {
    setWsName(workspace?.name || "");
  }, [workspace]);

  // Payments sandbox
      const [currentPlan, setCurrentPlan] = useState<"free" | "pro" | "business">("pro");

  const integrationsQ = useQuery({
    queryKey: ["integrations", workspace?.id],
    queryFn: async () => {
      await ensure();
      return api.listIntegrations(workspace?.id);
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

  const connectM = useMutation({
    mutationFn: (provider: string) => api.connectIntegration(provider, workspace?.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["integrations"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const disconnectM = useMutation({
    mutationFn: (provider: string) =>
      api.disconnectIntegration(provider, workspace?.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["integrations"] }),
  });

      const integrations = integrationsQ.data || [];
  const connected = integrations.filter((i) => i.status === "connected");
  const available = integrations.filter((i) => i.status !== "connected");

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Настройки</h1>
        <p className="mt-1 text-sm text-muted">
          Профиль, безопасность, workspace, интеграции и биллинг
        </p>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Side tabs */}
        <nav className="flex shrink-0 gap-1 overflow-x-auto lg:w-48 lg:flex-col lg:overflow-visible">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
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
          {/* Profile */}
          {tab === "profile" && (
            <div className="rounded-xl border border-border bg-surface p-5 sm:p-6">
              <h2 className="text-sm font-semibold">Профиль</h2>
              <p className="mt-1 text-xs text-muted">Имя и данные аккаунта</p>
              <div className="mt-5 max-w-md space-y-4">
                <Input
                  label="Email"
                  value={user?.email || ""}
                  disabled
                />
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
                {profileMsg && (
                  <p className="text-sm text-success">{profileMsg}</p>
                )}
                <Button
                  onClick={() => profileMutation.mutate()}
                  disabled={profileMutation.isPending}
                >
                  {profileMutation.isPending ? "Сохранение..." : "Сохранить"}
                </Button>
              </div>
            </div>
          )}

          {/* Security */}
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
                  {passwordMutation.isPending ? "Сохранение..." : "Сменить пароль"}
                </Button>
              </div>
            </div>
          )}

          {/* Appearance */}
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
                        : "border-border bg-background hover:border-border-strong"
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Notifications prefs */}
          {tab === "notifications" && (
            <div className="rounded-xl border border-border bg-surface p-5 sm:p-6">
              <h2 className="text-sm font-semibold">Уведомления</h2>
              <p className="mt-1 text-xs text-muted">
                Какие события показывать в колокольчике (локальные настройки)
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
              <p className="mt-4 text-xs text-muted">
                Настройки сохраняются в браузере. Серверные уведомления приходят в
                любом случае.
              </p>
            </div>
          )}

          {/* Workspace */}
          {tab === "workspace" && (
            <div className="rounded-xl border border-border bg-surface p-5 sm:p-6">
              <h2 className="text-sm font-semibold">Workspace</h2>
              <p className="mt-1 text-xs text-muted">Текущее рабочее пространство</p>
              <div className="mt-5 max-w-md space-y-4">
                <Input
                  label="Название"
                  value={wsName}
                  onChange={(e) => setWsName(e.target.value)}
                />
                <div className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
                  <p className="text-xs text-muted">Slug</p>
                  <p className="font-medium">{workspace?.slug || "—"}</p>
                </div>
                {workspace?.is_demo && (
                  <Badge variant="accent">Демо workspace</Badge>
                )}
                <Button
                  variant="secondary"
                  onClick={() => {
                    if (workspace && wsName.trim()) {
                      setWorkspace({ ...workspace, name: wsName.trim() });
                    }
                  }}
                >
                  Сохранить название (локально)
                </Button>
                <p className="text-xs text-muted">
                  Полное переименование через API можно добавить при необходимости.
                  Сейчас название обновляется в клиентском store.
                </p>
              </div>
            </div>
          )}

          {/* Integrations — existing */}
          {tab === "integrations" && (
            <div className="space-y-6">
              <div className="rounded-xl border border-border bg-surface/50 px-4 py-3 text-sm text-muted">
                Полезные <span className="font-medium text-foreground">бесплатные</span> интеграции
                для уведомлений и экспорта. Подключение сохраняется в workspace;
                настройки каналов (токен бота, SMTP и т.д.) можно добавить позже в config.
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
                          <p className="text-sm font-medium">{i.provider_display}</p>
                          {i.description && (
                            <p className="mt-1 text-xs text-muted line-clamp-2">{i.description}</p>
                          )}
                          <div className="mt-1 flex flex-wrap gap-1">
                            <Badge variant="success">Подключено</Badge>
                            {i.is_free && <Badge variant="default">Бесплатно</Badge>}
                          </div>
                        </div>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => disconnectM.mutate(i.provider)}
                          disabled={disconnectM.isPending}
                        >
                          Отключить
                        </Button>
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
                        <p className="text-sm font-medium">{i.provider_display}</p>
                        {i.description && (
                          <p className="mt-1 text-xs text-muted line-clamp-2">{i.description}</p>
                        )}
                        <div className="mt-1 flex flex-wrap gap-1">
                          <span className="text-xs text-muted">Не подключено</span>
                          {i.is_free && <Badge variant="default">Бесплатно</Badge>}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => connectM.mutate(i.provider)}
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

          {tab === "billing" && (
            <div className="space-y-6">
              <div className="rounded-xl border border-border bg-surface p-5 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-semibold">Текущий план</h2>
                    <p className="mt-1 text-2xl font-semibold tracking-tight">
                      {PLANS.find((p) => p.id === currentPlan)?.name}
                    </p>
                    <p className="mt-1 text-sm text-muted">
                      {PLANS.find((p) => p.id === currentPlan)?.price}
                      {currentPlan !== "free" && " / мес"}
                    </p>
                  </div>
                  <Badge variant="accent">Sandbox UI</Badge>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-3 text-sm">
                  <div className="rounded-lg border border-border bg-background p-3">
                    <p className="text-xs text-muted">Использование</p>
                    <p className="mt-1 font-medium">Заказы: без лимита (Pro)</p>
                  </div>
                  <div className="rounded-lg border border-border bg-background p-3">
                    <p className="text-xs text-muted">Следующее списание</p>
                    <p className="mt-1 font-medium">
                      {new Date(
                        Date.now() + 30 * 24 * 60 * 60 * 1000
                      ).toLocaleDateString("ru-RU")}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border bg-background p-3">
                    <p className="text-xs text-muted">Способ оплаты</p>
                    <p className="mt-1 font-medium">•••• 4242 (тест)</p>
                  </div>
                </div>
              </div>

              <div>
                <p className="mb-3 text-sm font-medium">Сменить план</p>
                <div className="grid gap-3 lg:grid-cols-3">
                  {PLANS.map((plan) => (
                    <div
                      key={plan.id}
                      className={cn(
                        "flex flex-col rounded-xl border p-5",
                        currentPlan === plan.id
                          ? "border-accent/40 bg-surface shadow-glow"
                          : "border-border bg-surface"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold">{plan.name}</h3>
                        {currentPlan === plan.id && (
                          <Badge variant="accent">Текущий</Badge>
                        )}
                      </div>
                      <p className="mt-2 text-2xl font-semibold">
                        {plan.price}
                        {plan.id !== "free" && (
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
                        variant={currentPlan === plan.id ? "secondary" : "primary"}
                        size="sm"
                        disabled={currentPlan === plan.id}
                        onClick={() => setCurrentPlan(plan.id as typeof currentPlan)}
                      >
                        {currentPlan === plan.id ? "Активен" : "Выбрать"}
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-border bg-surface p-5">
                <p className="text-sm font-medium">Счета (демо)</p>
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-xs text-muted">
                        <th className="pb-2 font-medium">Номер</th>
                        <th className="pb-2 font-medium">Дата</th>
                        <th className="pb-2 font-medium">Сумма</th>
                        <th className="pb-2 font-medium">Статус</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { id: "INV-1042", date: "2026-07-10", amount: "$29.00", status: "Оплачен" },
                        { id: "INV-1031", date: "2026-06-10", amount: "$29.00", status: "Оплачен" },
                        { id: "INV-1020", date: "2026-05-10", amount: "$29.00", status: "Оплачен" },
                      ].map((inv) => (
                        <tr key={inv.id} className="border-b border-border last:border-0">
                          <td className="py-2.5 font-medium">{inv.id}</td>
                          <td className="py-2.5 text-muted">
                            {new Date(inv.date).toLocaleDateString("ru-RU")}
                          </td>
                          <td className="py-2.5">{inv.amount}</td>
                          <td className="py-2.5">
                            <Badge variant="success">{inv.status}</Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="mt-3 text-xs text-muted">
                  Реальные платежи не подключены — только UI для портфолио.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
