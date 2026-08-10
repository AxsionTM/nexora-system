import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useWorkspaceStore } from "@/stores/workspace";
import * as analyticsApi from "@/services/analytics";
import type { Period } from "@/types/analytics";
import { cn } from "@/lib/utils";

const PERIODS: Period[] = ["7D", "30D", "3M", "6M", "1Y"];

function formatMoney(v: string | number) {
  const n = typeof v === "string" ? Number(v) : v;
  return `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

export default function AnalyticsPage() {
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
  const ordersQ = useQuery({
    queryKey: ["analytics-orders-series", wsId, period],
    queryFn: () => analyticsApi.fetchOrdersSeries(period, wsId),
    enabled: Boolean(wsId),
  });
  const topQ = useQuery({
    queryKey: ["analytics-top-products", wsId, period],
    queryFn: () => analyticsApi.fetchTopProducts(period, wsId),
    enabled: Boolean(wsId),
  });

  const s = summaryQ.data;

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Аналитика</h1>
          <p className="mt-1 text-sm text-muted">Динамика выручки, заказов и товаров</p>
        </div>
        <div className="flex gap-1 rounded-lg border border-border bg-surface p-0.5">
          {PERIODS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              className={cn(
                "rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
                period === p ? "bg-accent/10 text-accent" : "text-muted hover:text-foreground"
              )}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {s && (
        <div className="mb-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-border bg-surface p-4">
            <p className="text-xs text-muted">Выручка</p>
            <p className="mt-1 text-xl font-semibold">{formatMoney(s.revenue)}</p>
          </div>
          <div className="rounded-xl border border-border bg-surface p-4">
            <p className="text-xs text-muted">Заказы</p>
            <p className="mt-1 text-xl font-semibold">{s.orders}</p>
          </div>
          <div className="rounded-xl border border-border bg-surface p-4">
            <p className="text-xs text-muted">Средний чек</p>
            <p className="mt-1 text-xl font-semibold">{formatMoney(s.average_order_value)}</p>
          </div>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-surface p-4">
          <p className="mb-4 text-sm font-medium">Выручка по дням</p>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={revenueQ.data || []}>
              <defs>
                <linearGradient id="a1" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--accent))" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v) => v.slice(5)} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 10 }} width={40} />
              <Tooltip formatter={(v: number) => [formatMoney(v), "Выручка"]} />
              <Area type="monotone" dataKey="value" stroke="hsl(var(--accent))" fill="url(#a1)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="rounded-xl border border-border bg-surface p-4">
          <p className="mb-4 text-sm font-medium">Заказы по дням</p>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={ordersQ.data || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v) => v.slice(5)} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 10 }} width={30} allowDecimals={false} />
              <Tooltip formatter={(v: number) => [v, "Заказы"]} />
              <Bar dataKey="value" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} opacity={0.85} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-border bg-surface p-4">
        <p className="mb-3 text-sm font-medium">Топ товары по выручке</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted">
                <th className="pb-2 font-medium">#</th>
                <th className="pb-2 font-medium">Товар</th>
                <th className="pb-2 font-medium">Кол-во</th>
                <th className="pb-2 font-medium">Выручка</th>
              </tr>
            </thead>
            <tbody>
              {topQ.data?.map((p, i) => (
                <tr key={p.name} className="border-b border-border last:border-0">
                  <td className="py-2.5 text-muted">{i + 1}</td>
                  <td className="py-2.5 font-medium">{p.name}</td>
                  <td className="py-2.5">{p.quantity}</td>
                  <td className="py-2.5">{formatMoney(p.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {topQ.data?.length === 0 && (
            <p className="py-6 text-center text-sm text-muted">Нет данных за выбранный период</p>
          )}
        </div>
      </div>
    </div>
  );
}
