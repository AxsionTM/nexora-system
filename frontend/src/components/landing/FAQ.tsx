import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const faqs = [
  {
    q: "Можно ли попробовать NEXORA бесплатно?",
    a: "Да. Вы можете создать аккаунт и пользоваться бесплатным тарифом или изучить полностью заполненный демо-workspace без оплаты.",
  },
  {
    q: "Нужен ли реальный бизнес для Демо-режима?",
    a: "Нет. Демо-режим генерирует реалистичные тестовые данные — клиентов, заказы, товары и расходы — чтобы вы могли оценить продукт до подключения своего бизнеса.",
  },
  {
    q: "Можно ли пригласить команду?",
    a: "Да. Тарифы Pro и Бизнес поддерживают места для команды с ролевыми правами (Владелец, Админ, Менеджер, Сотрудник).",
  },
  {
    q: "Как работает AI-ассистент?",
    a: "AI-ассистент получает безопасный срез метрик вашего бизнеса (выручка, расходы, топ-товары, тренды) и отвечает на вопросы простым языком. API-ключи хранятся только на сервере.",
  },
  {
    q: "Данные останутся конфиденциальными?",
    a: "Workspace'ы изолированы. Доступ есть только у участников, которых вы пригласили. Мы не используем ваши бизнес-данные для обучения моделей.",
  },
  {
    q: "Можно ли подключить Stripe или Shopify?",
    a: "Интеграции спроектированы расширяемыми. Есть payment sandbox и UI подключения; полноценные production-коннекторы можно включить по мере роста.",
  },
];

function FAQItem({
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
              <FAQItem
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
