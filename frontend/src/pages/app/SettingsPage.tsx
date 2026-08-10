import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import * as api from "@/services/business";
import { useWorkspaceStore } from "@/stores/workspace";
import type { Integration, Payment } from "@/types/business";
import { cn } from "@/lib/utils";

type Tab = "integrations" | "payments";

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const workspace = useWorkspaceStore((s) => s.workspace);
  const ensure = useWorkspaceStore((s) => s.ensure);
  const [tab, setTab] = useState<Tab>("integrations");
  const [amount, setAmount] = useState("49.00");
  const [simulate, setSimulate] = useState<"success" | "failed" | "pending">("success");

  const integrationsQ = useQuery({
    queryKey: ["integrations", workspace?.id],
    queryFn: async () => {
      await ensure();
      return api.listIntegrations(workspace?.id);
    },
  });

  const paymentsQ = useQuery({
    queryKey: ["payments", workspace?.id],
    queryFn: async () => {
      await ensure();
      return api.listPayments(workspace?.id);
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
    mutationFn: (provider: string) => api.disconnectIntegration(provider, workspace?.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["integrations"] }),
  });

  const payM = useMutation({
    mutationFn: () =>
      api.createSandboxPayment(
        { amount, simulate },
        workspace?.id
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const refundM = useMutation({
    mutationFn: (id: number) => api.refundPayment(id, workspace?.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const integrations = integrationsQ.data || [];
  const connected = integrations.filter((i) => i.status === "connected");
  const available = integrations.filter((i) => i.status !== "connected");

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Настройки</h1>
        <p className="mt-1 text-sm text-muted">Интеграции и платёжный sandbox</p>
      </div>

      <div className="mb-6 flex gap-1 rounded-lg border border-border bg-surface p-0.5 w-fit">
        {(
          [
            ["integrations", "Интеграции"],
            ["payments", "Платежи (тест)"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              tab === key ? "bg-accent/10 text-accent" : "text-muted hover:text-foreground"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "integrations" && (
        <div className="space-y-6">
          <div className="rounded-xl border border-border bg-surface/50 px-4 py-3 text-sm text-muted">
            Режим <span className="font-medium text-foreground">DEMO / TEST</span> — подключение
            имитируется, реальные API-ключи и деньги не используются.
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
                      <Badge variant="success" className="mt-1">
                        Подключено
                      </Badge>
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
                    <p className="mt-0.5 text-xs text-muted">Не подключено</p>
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

      {tab === "payments" && (
        <div className="space-y-6">
          <div className="rounded-xl border border-border bg-surface p-5">
            <p className="text-sm font-medium">Sandbox-платёж</p>
            <p className="mt-1 text-xs text-muted">
              Имитация успешного / неуспешного / ожидающего платежа без реальных денег.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <Input
                label="Сумма"
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
              <div>
                <label className="mb-1.5 block text-sm font-medium">Результат</label>
                <select
                  className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
                  value={simulate}
                  onChange={(e) =>
                    setSimulate(e.target.value as "success" | "failed" | "pending")
                  }
                >
                  <option value="success">Успешно</option>
                  <option value="failed">Ошибка</option>
                  <option value="pending">Ожидает</option>
                </select>
              </div>
              <div className="flex items-end">
                <Button
                  className="w-full"
                  onClick={() => payM.mutate()}
                  disabled={payM.isPending || !amount}
                >
                  {payM.isPending ? "Отправка..." : "Создать платёж"}
                </Button>
              </div>
            </div>
            {payM.isSuccess && (
              <p className="mt-3 text-sm text-success">Платёж создан (тест).</p>
            )}
          </div>

          <div>
            <p className="mb-3 text-sm font-medium">История платежей</p>
            {paymentsQ.isLoading && (
              <p className="text-sm text-muted">Загрузка...</p>
            )}
            {paymentsQ.data && paymentsQ.data.length === 0 && (
              <p className="text-sm text-muted">Платежей пока нет</p>
            )}
            {paymentsQ.data && paymentsQ.data.length > 0 && (
              <div className="overflow-x-auto rounded-xl border border-border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-surface text-left text-xs text-muted">
                      <th className="px-4 py-3 font-medium">ID</th>
                      <th className="px-4 py-3 font-medium">Сумма</th>
                      <th className="px-4 py-3 font-medium">Статус</th>
                      <th className="px-4 py-3 font-medium hidden sm:table-cell">Провайдер</th>
                      <th className="px-4 py-3 font-medium hidden md:table-cell">Дата</th>
                      <th className="px-4 py-3 font-medium" />
                    </tr>
                  </thead>
                  <tbody>
                    {paymentsQ.data.map((p: Payment) => (
                      <tr key={p.id} className="border-b border-border last:border-0">
                        <td className="px-4 py-3">#{p.id}</td>
                        <td className="px-4 py-3 font-medium">
                          ${Number(p.amount).toLocaleString()}
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            variant={
                              p.status === "success"
                                ? "success"
                                : p.status === "failed"
                                  ? "danger"
                                  : p.status === "refunded"
                                    ? "warning"
                                    : "default"
                            }
                          >
                            {p.status_display}
                          </Badge>
                          {p.is_test && (
                            <span className="ml-1 text-[10px] text-muted">TEST</span>
                          )}
                        </td>
                        <td className="px-4 py-3 hidden sm:table-cell text-muted">
                          {p.provider}
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell text-muted">
                          {new Date(p.created_at).toLocaleString("ru-RU")}
                        </td>
                        <td className="px-4 py-3">
                          {p.status === "success" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => refundM.mutate(p.id)}
                              disabled={refundM.isPending}
                            >
                              Возврат
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
