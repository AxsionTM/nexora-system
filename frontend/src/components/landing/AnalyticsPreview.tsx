import { motion } from "framer-motion";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import { cn } from "@/lib/utils";

const metrics = [
  { label: "Revenue", value: "$84.3k", change: 18.4, positive: true },
  { label: "Avg. order", value: "$34.00", change: 4.2, positive: true },
  { label: "Conversion", value: "3.8%", change: -0.4, positive: false },
  { label: "Net margin", value: "62.6%", change: 2.1, positive: true },
];

const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const revenue = [42, 48, 45, 55, 52, 61, 58, 70, 68, 78, 82, 95];
const expenses = [22, 24, 21, 28, 26, 30, 29, 32, 31, 35, 36, 38];

export function AnalyticsPreview() {
  const max = Math.max(...revenue);

  return (
    <section id="analytics" className="border-y border-border bg-surface/50 py-20 sm:py-28">
      <div className="container-wide">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <p className="text-sm font-medium text-accent">Analytics</p>
            <h2 className="mt-2 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
              Clarity on every number that matters
            </h2>
            <p className="mt-4 text-muted">
              Revenue, expenses, profit and customer growth — calculated from
              real data, not static snapshots. Filter by period and dig into
              trends without leaving the dashboard.
            </p>

            <ul className="mt-8 space-y-3">
              {[
                "Live KPI cards with period-over-period change",
                "Revenue vs expenses and profit charts",
                "Top products and recent order activity",
                "Export-ready reports when you need them",
              ].map((point) => (
                <li key={point} className="flex items-start gap-2.5 text-sm">
                  <span className="mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent">
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path
                        d="M2 5l2.5 2.5L8 3"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                  <span className="text-foreground/90">{point}</span>
                </li>
              ))}
            </ul>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.5 }}
            className="rounded-xl border border-border bg-surface p-5 shadow-soft"
          >
            <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {metrics.map((m) => (
                <div key={m.label} className="rounded-lg border border-border bg-background p-3">
                  <p className="text-[10px] text-muted">{m.label}</p>
                  <p className="mt-0.5 text-sm font-semibold">{m.value}</p>
                  <div
                    className={cn(
                      "mt-0.5 flex items-center gap-0.5 text-[10px]",
                      m.positive ? "text-success" : "text-danger"
                    )}
                  >
                    {m.positive ? (
                      <ArrowUpRight className="h-2.5 w-2.5" />
                    ) : (
                      <ArrowDownRight className="h-2.5 w-2.5" />
                    )}
                    {m.positive ? "+" : ""}
                    {m.change}%
                  </div>
                </div>
              ))}
            </div>

            <div className="rounded-lg border border-border bg-background p-4">
              <div className="mb-4 flex items-center justify-between">
                <span className="text-xs font-medium">Revenue vs Expenses</span>
                <div className="flex items-center gap-3 text-[10px] text-muted">
                  <span className="flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-accent" /> Revenue
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-muted" /> Expenses
                  </span>
                </div>
              </div>

              <div className="flex h-36 items-end gap-1.5 sm:gap-2">
                {months.map((month, i) => (
                  <div key={month} className="flex flex-1 flex-col items-center gap-1">
                    <div className="relative flex w-full flex-1 items-end justify-center gap-0.5">
                      <div
                        className="w-[45%] rounded-t bg-accent/80"
                        style={{ height: `${(revenue[i] / max) * 100}%` }}
                      />
                      <div
                        className="w-[45%] rounded-t bg-muted/40"
                        style={{ height: `${(expenses[i] / max) * 100}%` }}
                      />
                    </div>
                    <span className="text-[9px] text-muted">{month}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
