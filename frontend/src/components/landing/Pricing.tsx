import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

const plans = [
  {
    name: "Free",
    price: "$0",
    description: "For getting started and exploring the product.",
    features: [
      "1 workspace",
      "Up to 50 orders / month",
      "Basic analytics",
      "Demo mode",
      "Community support",
    ],
    cta: "Start free",
    highlighted: false,
  },
  {
    name: "Pro",
    price: "$29",
    description: "For growing businesses that need full visibility.",
    features: [
      "Unlimited orders",
      "Advanced analytics & reports",
      "Team seats (up to 5)",
      "AI business assistant",
      "Integrations",
      "Email support",
    ],
    cta: "Start free trial",
    highlighted: true,
  },
  {
    name: "Business",
    price: "$79",
    description: "For teams that need control, roles and scale.",
    features: [
      "Everything in Pro",
      "Unlimited team seats",
      "Role-based permissions",
      "Priority support",
      "Custom integrations",
      "Audit log",
    ],
    cta: "Contact sales",
    highlighted: false,
  },
];

export function Pricing() {
  return (
    <section id="pricing" className="border-y border-border bg-surface/50 py-20 sm:py-28">
      <div className="container-wide">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-medium text-accent">Pricing</p>
          <h2 className="mt-2 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            Simple, transparent pricing
          </h2>
          <p className="mt-4 text-muted">
            Start free. Upgrade when your business needs more power. No hidden
            fees.
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
                  Most popular
                </span>
              )}
              <div>
                <h3 className="text-sm font-semibold">{plan.name}</h3>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-3xl font-semibold tracking-tight">
                    {plan.price}
                  </span>
                  {plan.price !== "$0" && (
                    <span className="text-sm text-muted">/month</span>
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
