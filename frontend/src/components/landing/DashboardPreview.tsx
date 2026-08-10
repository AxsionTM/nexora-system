import {
  ArrowUpRight,
  TrendingUp,
  Users,
  ShoppingCart,
  DollarSign,
} from "lucide-react";
import { cn } from "@/lib/utils";

const kpis = [
  {
    label: "Revenue",
    value: "$84,291",
    change: "+18.4%",
    icon: DollarSign,
    positive: true,
  },
  {
    label: "Orders",
    value: "2,481",
    change: "+12.8%",
    icon: ShoppingCart,
    positive: true,
  },
  {
    label: "Customers",
    value: "1,842",
    change: "+9.2%",
    icon: Users,
    positive: true,
  },
  {
    label: "Net Profit",
    value: "$52,809",
    change: "+14.6%",
    icon: TrendingUp,
    positive: true,
  },
];

const chartBars = [38, 52, 45, 68, 55, 72, 61, 80, 74, 88, 82, 95];

export function DashboardPreview() {
  return (
    <div className="relative">
      {/* Glow behind the card */}
      <div
        aria-hidden
        className="absolute -inset-4 rounded-2xl bg-accent/5 blur-2xl sm:-inset-8"
      />

      <div className="relative overflow-hidden rounded-xl border border-border bg-surface shadow-elevated sm:rounded-2xl">
        {/* Fake browser chrome */}
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <div className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-border-strong" />
            <span className="h-2.5 w-2.5 rounded-full bg-border-strong" />
            <span className="h-2.5 w-2.5 rounded-full bg-border-strong" />
          </div>
          <div className="ml-3 flex-1 rounded-md bg-background px-3 py-1 text-[11px] text-muted">
            app.nexora.io/dashboard
          </div>
        </div>

        <div className="flex">
          {/* Mini sidebar */}
          <div className="hidden w-44 shrink-0 border-r border-border bg-sidebar p-3 sm:block">
            <div className="mb-4 flex items-center gap-2 px-2">
              <div className="h-5 w-5 rounded bg-accent" />
              <span className="text-xs font-semibold">NEXORA</span>
            </div>
            <nav className="space-y-0.5">
              {[
                "Dashboard",
                "Analytics",
                "Orders",
                "Products",
                "Customers",
                "Expenses",
                "Team",
              ].map((item, i) => (
                <div
                  key={item}
                  className={cn(
                    "rounded-md px-2.5 py-1.5 text-[11px]",
                    i === 0
                      ? "bg-accent/10 font-medium text-accent"
                      : "text-muted"
                  )}
                >
                  {item}
                </div>
              ))}
            </nav>
          </div>

          {/* Main content */}
          <div className="flex-1 p-4 sm:p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted">Overview</p>
                <p className="text-sm font-medium">Business Dashboard</p>
              </div>
              <div className="flex gap-1">
                {["7D", "30D", "3M", "1Y"].map((p, i) => (
                  <span
                    key={p}
                    className={cn(
                      "rounded px-2 py-0.5 text-[10px]",
                      i === 1
                        ? "bg-accent/10 font-medium text-accent"
                        : "text-muted"
                    )}
                  >
                    {p}
                  </span>
                ))}
              </div>
            </div>

            {/* KPI cards */}
            <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
              {kpis.map((kpi) => (
                <div
                  key={kpi.label}
                  className="rounded-lg border border-border bg-background p-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-muted">{kpi.label}</span>
                    <kpi.icon className="h-3 w-3 text-muted" />
                  </div>
                  <p className="mt-1 text-sm font-semibold tracking-tight">
                    {kpi.value}
                  </p>
                  <div className="mt-0.5 flex items-center gap-0.5 text-[10px] text-success">
                    <ArrowUpRight className="h-2.5 w-2.5" />
                    {kpi.change}
                  </div>
                </div>
              ))}
            </div>

            {/* Chart area */}
            <div className="mt-3 rounded-lg border border-border bg-background p-3">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-[11px] font-medium">Revenue trend</span>
                <span className="text-[10px] text-muted">Last 12 months</span>
              </div>
              <div className="flex h-24 items-end gap-1.5 sm:h-28 sm:gap-2">
                {chartBars.map((h, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-t bg-accent/80 transition-all"
                    style={{ height: `${h}%` }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
