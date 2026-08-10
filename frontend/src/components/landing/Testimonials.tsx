import { motion } from "framer-motion";

const testimonials = [
  {
    quote:
      "NEXORA replaced three tools we were juggling. Now I open one dashboard and know exactly how the week is going.",
    name: "Sarah Chen",
    role: "Founder, Atlas Goods",
  },
  {
    quote:
      "The profit view alone paid for itself. We finally stopped guessing which products were actually making money.",
    name: "Marcus Webb",
    role: "Owner, Northline Supply",
  },
  {
    quote:
      "Demo mode let my team explore the product with real-looking data before we migrated. Onboarding was painless.",
    name: "Elena Ruiz",
    role: "Ops Lead, Bright Form",
  },
];

export function Testimonials() {
  return (
    <section className="py-20 sm:py-28">
      <div className="container-wide">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-medium text-accent">Testimonials</p>
          <h2 className="mt-2 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            Trusted by operators who care about the numbers
          </h2>
        </div>

        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {testimonials.map((t, i) => (
            <motion.blockquote
              key={t.name}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              className="flex flex-col rounded-xl border border-border bg-surface p-6"
            >
              <p className="flex-1 text-sm leading-relaxed text-foreground/90">
                “{t.quote}”
              </p>
              <footer className="mt-5 border-t border-border pt-4">
                <p className="text-sm font-medium">{t.name}</p>
                <p className="text-xs text-muted">{t.role}</p>
              </footer>
            </motion.blockquote>
          ))}
        </div>
      </div>
    </section>
  );
}
