import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Send, Sparkles, Bot, User } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useWorkspaceStore } from "@/stores/workspace";
import * as aiApi from "@/services/ai";
import type { AIMessage } from "@/services/ai";
import { cn } from "@/lib/utils";

const PLAN_UPGRADE_HINT =
  "AI-ассистент доступен на тарифах Pro и Бизнес.\n\nОбновите тариф в Настройках → Биллинг, чтобы задавать вопросы о выручке, прибыли, товарах и заказах.";

const SUGGESTIONS = [
  "Почему изменилась прибыль?",
  "Какие товары продаются лучше всего?",
  "Как изменилась выручка?",
  "Есть ли товары с низким остатком?",
  "Краткая сводка по бизнесу",
];

export default function AIPage() {
  const workspace = useWorkspaceStore((s) => s.workspace);
  const ensure = useWorkspaceStore((s) => s.ensure);
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [provider, setProvider] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    ensure().catch(() => {});
  }, [ensure]);

  const insightsQ = useQuery({
    queryKey: ["ai-insights", workspace?.id],
    queryFn: async () => {
      await ensure();
      return aiApi.fetchInsights("30D", workspace?.id);
    },
    enabled: Boolean(workspace?.id),
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    const optimistic: AIMessage = {
      id: Date.now(),
      role: "user",
      content: trimmed,
      created_at: new Date().toISOString(),
    };
    setMessages((m) => [...m, optimistic]);
    setInput("");
    setSending(true);

    try {
      const res = await aiApi.sendChat(trimmed, {
        conversation_id: conversationId,
        period: "30D",
        workspace: workspace?.id,
      });
      setConversationId(res.conversation_id);
      setProvider(res.provider);
      setMessages((m) => [...m, res.message]);
    } catch (e: unknown) {
      const status = (e as { response?: { status?: number; data?: { detail?: string } } })?.response?.status;
      const detail = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      let content =
        "AI временно недоступен. Попробуйте ещё раз через несколько минут.";
      if (status === 403) {
        content =
          detail ||
          "AI-ассистент доступен на тарифах Pro и Бизнес.\n\nОбновите тариф, чтобы задавать вопросы о выручке, прибыли, товарах, заказах и бизнес-показателях.";
      } else if (detail) {
        content = String(detail);
      }
      setMessages((m) => [
        ...m,
        {
          id: Date.now() + 1,
          role: "assistant",
          content,
          created_at: new Date().toISOString(),
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  const startNew = () => {
    setConversationId(null);
    setMessages([]);
    setProvider(null);
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col lg:flex-row lg:gap-4">
      {/* Chat */}
      <div className="flex min-h-0 flex-1 flex-col rounded-xl border border-border bg-surface">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10 text-accent">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-semibold">AI-ассистент</p>
              <p className="text-[11px] text-muted">
                Вопросы о выручке, прибыли, товарах и заказах
                {provider && (
                  <> · {provider === "gemini" ? "Gemini 2.5 Flash" : provider === "error" ? "ошибка API" : provider}</>
                )}
              </p>
            </div>
          </div>
          {messages.length > 0 && (
            <Button variant="ghost" size="sm" onClick={startNew}>
              Новый чат
            </Button>
          )}
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          {messages.length === 0 && (
            <div className="flex h-full flex-col items-center justify-center gap-4 px-4 text-center">
              <Bot className="h-10 w-10 text-muted" />
              <div>
                <p className="text-sm font-medium">Спросите о своём бизнесе</p>
                <p className="mt-1 text-xs text-muted">
                  Ассистент видит только агрегированные метрики вашего workspace
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => send(s)}
                    className="rounded-full border border-border bg-background px-3 py-1.5 text-xs text-muted transition-colors hover:border-accent/40 hover:text-foreground"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m) => (
            <div
              key={m.id}
              className={cn(
                "flex gap-3",
                m.role === "user" ? "justify-end" : "justify-start"
              )}
            >
              {m.role === "assistant" && (
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent">
                  <Bot className="h-3.5 w-3.5" />
                </div>
              )}
              <div
                className={cn(
                  "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap",
                  m.role === "user"
                    ? "bg-accent text-accent-foreground"
                    : "bg-background border border-border"
                )}
              >
                {m.content}
              </div>
              {m.role === "user" && (
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface border border-border text-muted">
                  <User className="h-3.5 w-3.5" />
                </div>
              )}
            </div>
          ))}

          {sending && (
            <div className="flex gap-3">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-accent/10 text-accent">
                <Bot className="h-3.5 w-3.5" />
              </div>
              <div className="rounded-2xl border border-border bg-background px-4 py-3 text-sm text-muted">
                Думаю...
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <form
          className="border-t border-border p-3"
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
        >
          <div className="flex gap-2">
            <input
              className="h-10 flex-1 rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
              placeholder="Напишите вопрос..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={sending}
            />
            <Button type="submit" disabled={sending || !input.trim()} size="icon">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </form>
      </div>

      {/* Insights sidebar */}
      <div className="mt-4 w-full shrink-0 rounded-xl border border-border bg-surface p-4 lg:mt-0 lg:w-72">
        <p className="text-sm font-medium">Автоматические insights</p>
        <p className="mt-1 text-xs text-muted">На основе данных за 30 дней</p>
        <ul className="mt-4 space-y-2">
          {insightsQ.isLoading && (
            <li className="text-sm text-muted">Загрузка...</li>
          )}
          {insightsQ.data?.insights.map((insight, i) => (
            <li
              key={i}
              className="rounded-lg border border-border bg-background px-3 py-2 text-xs leading-relaxed"
            >
              {insight}
            </li>
          ))}
          {insightsQ.data?.insights.length === 0 && (
            <li className="text-sm text-muted">Пока нет insights</li>
          )}
        </ul>
      </div>
    </div>
  );
}
