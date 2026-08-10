import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

const plans = [
  {
    name: "Бесплатный",
    price: "$0",
    description: "Для знакомства с продуктом и первых шагов.",
    features: [
      "1 workspace",
      "До 50 заказов в месяц",
      "Базовая аналитика",
      "Демо-режим",
      "Поддержка сообщества",
    ],
    cta: "Начать бесплатно",
    highlighted: false,
  },
  {
    name: "Pro",
    price: "$29",
    description: "Для растущего бизнеса, которому нужна полная картина.",
    features: [
      "Безлимитные заказы",
      "Расширенная аналитика и отчёты",
      "Места в команде (до 5)",
      "AI-ассистент",
      "Интеграции",
      "Email-поддержка",
    ],
    cta: "Начать пробный период",
    highlighted: true,
  },
  {
    name: "Бизнес",
    price: "$79",
    description: "Для команд, которым нужны контроль, роли и масштаб.",
    features: [
      "Всё из Pro",
      "Безлимитные места в команде",
      "Ролевые права доступа",
      "Приоритетная поддержка",
      "Кастомные интеграции",
      "Журнал аудита",
    ],
    cta: "Связаться с нами",
    highlighted: false,
  },
];

export function Pricing() {
  return (
    <section id="pricing" className="border-y border-border bg-surface/50 py-20 sm:py-28">
      <div className="container-wide">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-medium text-accent">Тарифы</p>
          <h2 className="mt-2 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            Простые и прозрачные тарифы
          </h2>
          <p className="mt-4 text-muted">
            Начните бесплатно. Переходите на платный план, когда бизнесу нужно
            больше возможностей. Без скрытых платежей.
          </p>
        </div>

        <div className="mt-12 grid gap-4 lg:grid-cols-3">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              className={cn(
                "relative flex flex-col rounded-xl border p-6",
                plan.highlighted
                  ? "border-accent/40 bg-surface shadow-glow"
                  : "border-border bg-surface"
              )}
            >
              {plan.highlighted && (
                <span className="absolute -top-3 left-6 rounded-full bg-accent px-2.5 py-0.5 text-[11px] font-medium text-accent-foreground">
                  Популярный
                </span>
              )}
              <div>
                <h3 className="text-sm font-semibold">{plan.name}</h3>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-3xl font-semibold tracking-tight">
                    {plan.price}
                  </span>
                  {plan.price !== "$0" && (
                    <span className="text-sm text-muted">/мес</span>
                  )}
                </div>
                <p className="mt-2 text-sm text-muted">{plan.description}</p>
              </div>

              <ul className="mt-6 flex-1 space-y-2.5">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              <Link to="/register" className="mt-8 block">
                <Button
                  variant={plan.highlighted ? "primary" : "secondary"}
                  className="w-full"
                >
                  {plan.cta}
                </Button>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
