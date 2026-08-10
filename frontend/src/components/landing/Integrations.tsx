import { motion } from "framer-motion";

const integrations = [
  { name: "Stripe", category: "Платежи" },
  { name: "Shopify", category: "Коммерция" },
  { name: "PayPal", category: "Платежи" },
  { name: "WooCommerce", category: "Коммерция" },
  { name: "Google Analytics", category: "Аналитика" },
  { name: "Slack", category: "Уведомления" },
];

export function Integrations() {
  return (
    <section id="integrations" className="py-20 sm:py-28">
      <div className="container-wide">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-medium text-accent">Интеграции</p>
          <h2 className="mt-2 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            Подключайте привычные инструменты
          </h2>
          <p className="mt-4 text-muted">
            Синхронизируйте платежи, витрины и аналитику в одном месте.
            Архитектура расширяемая — новые провайдеры добавляются чисто.
          </p>
        </div>

        <motion.div
          className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-60px" }}
          variants={{
            hidden: {},
            show: { transition: { staggerChildren: 0.05 } },
          }}
        >
          {integrations.map((item) => (
            <motion.div
              key={item.name}
              variants={{
                hidden: { opacity: 0, y: 12 },
                show: { opacity: 1, y: 0 },
              }}
              className="flex flex-col items-center gap-2 rounded-xl border border-border bg-surface px-4 py-6 text-center transition-colors hover:border-border-strong"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-background text-sm font-semibold text-foreground">
                {item.name.slice(0, 2)}
              </div>
              <span className="text-sm font-medium">{item.name}</span>
              <span className="text-[11px] text-muted">{item.category}</span>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
