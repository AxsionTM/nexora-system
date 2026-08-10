import { motion } from "framer-motion";
import {
  BarChart3,
  Users,
  Package,
  Receipt,
  Shield,
  Zap,
  Bot,
  Layers,
} from "lucide-react";

const features = [
  {
    icon: BarChart3,
    title: "Аналитика в реальном времени",
    description:
      "Track revenue, profit, conversion rates and growth with live dashboards that update as your business moves.",
  },
  {
    icon: Package,
    title: "Товары и склад",
    description:
      "Manage catalog, stock levels, pricing and categories from a single, clear workspace.",
  },
  {
    icon: Users,
    title: "Клиентская аналитика",
    description:
      "See order history, lifetime value and engagement patterns to understand who drives your growth.",
  },
  {
    icon: Receipt,
    title: "Заказы и расходы",
    description:
      "Create and track orders, log expenses by category, and always know your true net profit.",
  },
  {
    icon: Shield,
    title: "Команда и роли",
    description:
      "Invite teammates with role-based access so everyone sees exactly what they need.",
  },
  {
    icon: Bot,
    title: "AI-ассистент",
    description:
      "Ask natural questions about performance and get clear, data-backed answers in seconds.",
  },
  {
    icon: Layers,
    title: "Интеграции",
    description:
      "Connect payment processors, storefronts and analytics tools without leaving NEXORA.",
  },
  {
    icon: Zap,
    title: "Демо-режим",
    description:
      "Explore a fully populated workspace with realistic data before connecting your own business.",
  },
];

const container = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.06 },
  },
};

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

export function Features() {
  return (
    <section id="features" className="py-20 sm:py-28">
      <div className="container-wide">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-medium text-accent">Возможности</p>
          <h2 className="mt-2 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            Всё необходимое для работы и роста
          </h2>
          <p className="mt-4 text-muted">
            From day-to-day operations to strategic decisions — one platform
            designed for small and growing businesses.
          </p>
        </div>

        <motion.div
          className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
        >
          {features.map((f) => (
            <motion.div
              key={f.title}
              variants={item}
              className="group rounded-xl border border-border bg-surface p-5 transition-colors hover:border-border-strong"
            >
              <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-accent/10 text-accent">
                <f.icon className="h-4 w-4" strokeWidth={1.75} />
              </div>
              <h3 className="text-sm font-semibold">{f.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">
                {f.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
