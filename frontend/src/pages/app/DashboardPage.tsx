import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import { useAuthStore } from "@/stores/auth";
import { useWorkspaceStore } from "@/stores/workspace";
import * as analyticsApi from "@/services/analytics";
import type { Period } from "@/types/analytics";
import { ORDER_STATUS_LABELS } from "@/types/business";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";

const PERIODS: Period[] = ["7D", "30D", "3M", "6M", "1Y"];

function formatMoney(value: string | number) {
  const n = typeof value === "string" ? Number(value) : value;
  return `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

function ChangeBadge({ value }: { value: number }) {
  const positive = value >= 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-xs font-medium",
        positive ? "text-success" : "text-danger"
      )}
    >
      {positive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
      {positive ? "+" : ""}
      {value}%
    </span>
  );
}

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const { workspace, ensure } = useWorkspaceStore();
  const [period, setPeriod] = useState<Period>("30D");

  useEffect(() => {
    ensure().catch(() => {});
  }, [ensure]);

  const wsId = workspace?.id;

  const summaryQ = useQuery({
    queryKey: ["analytics-summary", wsId, period],
    queryFn: () => analyticsApi.fetchSummary(period, wsId),
    enabled: Boolean(wsId),
  });

  const revenueQ = useQuery({
    queryKey: ["analytics-revenue", wsId, period],
    queryFn: () => analyticsApi.fetchRevenueSeries(period, wsId),
    enabled: Boolean(wsId),
  });

  const ordersSeriesQ = useQuery({
    queryKey: ["analytics-orders-series", wsId, period],
    queryFn: () => analyticsApi.fetchOrdersSeries(period, wsId),
    enabled: Boolean(wsId),
  });

  const topProductsQ = useQuery({
    queryKey: ["analytics-top-products", wsId, period],
    queryFn: () => analyticsApi.fetchTopProducts(period, wsId),
    enabled: Boolean(wsId),
  });

  const recentOrdersQ = useQuery({
    queryKey: ["analytics-recent-orders", wsId],
    queryFn: () => analyticsApi.fetchRecentOrders(wsId),
    enabled: Boolean(wsId),
  });

  const s = summaryQ.data;
  const isLoading = summaryQ.isLoading || !wsId;
  const isError = summaryQ.isError;

  const kpis = s
    ? [
        { label: "Выручка", value: formatMoney(s.revenue), change: s.revenue_change },
        { label: "Заказы", value: String(s.orders), change: s.orders_change },
        { label: "Клиенты", value: String(s.customers), change: s.customers_change },
        { label: "Чистая прибыль", value: formatMoney(s.net_profit), change: s.net_profit_change },
      ]
    : [];

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Дашборд</h1>
          <p className="mt-1 text-sm text-muted">
            {user?.first_name ? `Привет, ${user.first_name}` : "Обзор бизнеса"}
            {workspace && (
              <>
                {" · "}
                <span className="text-foreground">{workspace.name}</span>
              </>
            )}
          </p>
        </div>
        <div className="flex gap-1 rounded-lg border border-border bg-surface p-0.5">
          {PERIODS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              className={cn(
                "rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
                period === p
                  ? "bg-accent/10 text-accent"
                  : "text-muted hover:text-foreground"
              )}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {isError && (
        <div className="mb-4 rounded-lg border border-danger/30 bg-danger/10 p-4 text-sm text-danger">
          Не удалось загрузить аналитику.{" "}
          <button type="button" className="underline" onClick={() => summaryQ.refetch()}>
            Повторить
          </button>
        </div>
      )}

      {/* KPI cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {(isLoading ? [1, 2, 3, 4] : kpis).map((kpi, i) =>
          isLoading ? (
            <div key={i} className="h-24 animate-pulse rounded-xl border border-border bg-surface" />
          ) : (
            <div
              key={(kpi as { label: string }).label}
              className="rounded-xl border border-border bg-surface p-4"
            >
              <p className="text-xs text-muted">{(kpi as { label: string }).label}</p>
              <p className="mt-1 text-2xl font-semibold tracking-tight">
                {(kpi as { value: string }).value}
              </p>
              <div className="mt-1">
                <ChangeBadge value={(kpi as { change: number }).change} />
              </div>
            </div>
          )
        )}
      </div>

      {/* Secondary metrics */}
      {s && (
        <div className="mt-3 flex flex-wrap gap-4 text-sm text-muted">
          <span>
            Средний чек:{" "}
            <span className="font-medium text-foreground">
              {formatMoney(s.average_order_value)}
            </span>
          </span>
        </div>
      )}

      {/* Charts */}
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-surface p-4">
          <p className="mb-4 text-sm font-medium">Выручка</p>
          {revenueQ.isLoading ? (
            <div className="h-48 animate-pulse rounded-lg bg-background" />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={revenueQ.data || []}>
                <defs>
                  <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--accent))" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: "hsl(var(--muted))" }}
                  tickFormatter={(v) => v.slice(5)}
                  interval="preserveStartEnd"
                />
                <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted))" }} width={40} />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--surface))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  formatter={(v: number) => [formatMoney(v), "Выручка"]}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="hsl(var(--accent))"
                  fill="url(#rev)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="rounded-xl border border-border bg-surface p-4">
          <p className="mb-4 text-sm font-medium">Заказы</p>
          {ordersSeriesQ.isLoading ? (
            <div className="h-48 animate-pulse rounded-lg bg-background" />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={ordersSeriesQ.data || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: "hsl(var(--muted))" }}
                  tickFormatter={(v) => v.slice(5)}
                  interval="preserveStartEnd"
                />
                <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted))" }} width={30} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--surface))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  formatter={(v: number) => [v, "Заказы"]}
                />
                <Bar dataKey="value" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} opacity={0.85} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Top products + recent orders */}
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-surface p-4">
          <p className="mb-3 text-sm font-medium">Топ товары</p>
          {topProductsQ.isLoading && (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-8 animate-pulse rounded bg-background" />
              ))}
            </div>
          )}
          {topProductsQ.data && topProductsQ.data.length === 0 && (
            <p className="text-sm text-muted">Пока нет данных по продажам</p>
          )}
          <ul className="space-y-2">
            {topProductsQ.data?.map((p, i) => (
              <li
                key={p.name}
                className="flex items-center justify-between gap-3 text-sm"
              >
                <span className="flex items-center gap-2 truncate">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-accent/10 text-[10px] font-medium text-accent">
                    {i + 1}
                  </span>
                  <span className="truncate">{p.name}</span>
                </span>
                <span className="shrink-0 font-medium">{formatMoney(p.revenue)}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl border border-border bg-surface p-4">
          <p className="mb-3 text-sm font-medium">Последние заказы</p>
          {recentOrdersQ.isLoading && (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-8 animate-pulse rounded bg-background" />
              ))}
            </div>
          )}
          {recentOrdersQ.data && recentOrdersQ.data.length === 0 && (
            <p className="text-sm text-muted">Заказов пока нет</p>
          )}
          <ul className="space-y-2">
            {recentOrdersQ.data?.map((o) => (
              <li
                key={o.id}
                className="flex items-center justify-between gap-3 text-sm"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span className="font-medium">#{o.id}</span>
                  <span className="truncate text-muted">
                    {o.customer_name || "—"}
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  <Badge variant="default" className="text-[10px]">
                    {ORDER_STATUS_LABELS[o.status as keyof typeof ORDER_STATUS_LABELS] || o.status}
                  </Badge>
                  <span className="font-medium">{formatMoney(o.total)}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
