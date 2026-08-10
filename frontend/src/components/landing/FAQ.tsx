import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const faqs = [
  {
    q: "Is NEXORA free to try?",
    a: "Yes. You can create an account and use the free plan, or explore the fully populated Demo Workspace without signing up for a paid plan.",
  },
  {
    q: "Do I need a real business to use Demo Mode?",
    a: "No. Demo Mode generates realistic sample data — customers, orders, products and expenses — so you can evaluate the product before connecting your own operations.",
  },
  {
    q: "Can I invite my team?",
    a: "Yes. Pro and Бизнес plans support team seats with role-based permissions (Owner, Admin, Manager, Employee).",
  },
  {
    q: "How does the AI assistant work?",
    a: "The AI assistant receives a carefully scoped snapshot of your business metrics (revenue, expenses, top products, trends) and answers questions in plain language. Your API keys stay on the server.",
  },
  {
    q: "Will my data stay private?",
    a: "Workspaces are isolated. Only members you invite can access your data. We do not use your business data to train models.",
  },
  {
    q: "Can I connect Stripe or Shopify?",
    a: "Интеграции are designed to be extensible. Payment sandbox and connection UI are available; full production connectors can be enabled as you scale.",
  },
];

function ВопросыItem({
  question,
  answer,
  open,
  onToggle,
}: {
  question: string;
  answer: string;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="border-b border-border">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-4 py-4 text-left"
      >
        <span className="text-sm font-medium">{question}</span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-muted transition-transform",
            open && "rotate-180"
          )}
        />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <p className="pb-4 text-sm leading-relaxed text-muted">{answer}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="py-20 sm:py-28">
      <div className="container-wide">
        <div className="mx-auto max-w-2xl">
          <div className="text-center">
            <p className="text-sm font-medium text-accent">Вопросы</p>
            <h2 className="mt-2 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
              Частые вопросы
            </h2>
          </div>

          <div className="mt-10">
            {faqs.map((item, i) => (
              <ВопросыItem
                key={item.q}
                question={item.q}
                answer={item.a}
                open={openIndex === i}
                onToggle={() => setOpenIndex(openIndex === i ? null : i)}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
