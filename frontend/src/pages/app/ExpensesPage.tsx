import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Pencil, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import * as api from "@/services/business";
import { useWorkspaceStore } from "@/stores/workspace";
import type { Expense, ExpenseCategory } from "@/types/business";
import { EXPENSE_CATEGORY_LABELS } from "@/types/business";

const schema = z.object({
  title: z.string().min(1, "Укажите название"),
  category: z.string().min(1),
  amount: z.string().min(1, "Укажите сумму"),
  date: z.string().min(1, "Укажите дату"),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export default function ExpensesPage() {
  const queryClient = useQueryClient();
  const workspace = useWorkspaceStore((s) => s.workspace);
  const ensure = useWorkspaceStore((s) => s.ensure);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);

  const { data: expenses = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["expenses", workspace?.id, search, categoryFilter],
    queryFn: async () => {
      await ensure();
      return api.listExpenses({
        search: search || undefined,
        category: categoryFilter || undefined,
        workspace: workspace?.id,
      });
    },
  });

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      category: "other",
      date: new Date().toISOString().slice(0, 10),
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const payload = {
        title: data.title,
        category: data.category as ExpenseCategory,
        amount: data.amount,
        date: data.date,
        notes: data.notes || "",
      };
      if (editing) return api.updateExpense(editing.id, payload);
      return api.createExpense(payload, workspace?.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["analytics-summary"] });
      closeModal();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: api.deleteExpense,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["analytics-summary"] });
    },
  });

  const openCreate = () => {
    setEditing(null);
    form.reset({
      title: "",
      category: "other",
      amount: "",
      date: new Date().toISOString().slice(0, 10),
      notes: "",
    });
    setModalOpen(true);
  };

  const openEdit = (e: Expense) => {
    setEditing(e);
    form.reset({
      title: e.title,
      category: e.category,
      amount: e.amount,
      date: e.date,
      notes: e.notes,
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
  };

  const total = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Расходы</h1>
          <p className="mt-1 text-sm text-muted">
            Учёт расходов по категориям
            {expenses.length > 0 && (
              <> · сумма в списке: <span className="font-medium text-foreground">${total.toLocaleString()}</span></>
            )}
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Добавить расход
        </Button>
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            className="h-10 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
            placeholder="Поиск..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="h-10 rounded-lg border border-border bg-background px-3 text-sm"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
        >
          <option value="">Все категории</option>
          {Object.entries(EXPENSE_CATEGORY_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>

      {isLoading && <div className="py-12 text-center text-sm text-muted">Загрузка...</div>}
      {isError && (
        <div className="rounded-lg border border-danger/30 bg-danger/10 p-4 text-sm text-danger">
          Не удалось загрузить расходы.{" "}
          <button type="button" className="underline" onClick={() => refetch()}>Повторить</button>
        </div>
      )}
      {!isLoading && !isError && expenses.length === 0 && (
        <div className="rounded-xl border border-dashed border-border bg-surface/50 px-6 py-16 text-center">
          <p className="text-sm text-muted">Расходов пока нет</p>
          <Button className="mt-4" size="sm" onClick={openCreate}>Добавить первый расход</Button>
        </div>
      )}

      {expenses.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface text-left text-xs text-muted">
                <th className="px-4 py-3 font-medium">Название</th>
                <th className="px-4 py-3 font-medium">Категория</th>
                <th className="px-4 py-3 font-medium">Сумма</th>
                <th className="px-4 py-3 font-medium hidden sm:table-cell">Дата</th>
                <th className="px-4 py-3 font-medium w-24" />
              </tr>
            </thead>
            <tbody>
              {expenses.map((e) => (
                <tr key={e.id} className="border-b border-border last:border-0 hover:bg-surface/50">
                  <td className="px-4 py-3 font-medium">{e.title}</td>
                  <td className="px-4 py-3">
                    <Badge variant="default">{e.category_display || EXPENSE_CATEGORY_LABELS[e.category]}</Badge>
                  </td>
                  <td className="px-4 py-3">${Number(e.amount).toLocaleString()}</td>
                  <td className="px-4 py-3 hidden sm:table-cell text-muted">
                    {new Date(e.date).toLocaleDateString("ru-RU")}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button type="button" onClick={() => openEdit(e)} className="rounded p-1.5 text-muted hover:bg-surface hover:text-foreground">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => { if (confirm("Удалить расход?")) deleteMutation.mutate(e.id); }}
                        className="rounded p-1.5 text-muted hover:bg-surface hover:text-danger"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={modalOpen} onClose={closeModal} title={editing ? "Редактировать расход" : "Новый расход"}>
        <form onSubmit={form.handleSubmit((d) => saveMutation.mutate(d))} className="space-y-4">
          <Input label="Название" error={form.formState.errors.title?.message} {...form.register("title")} />
          <div>
            <label className="mb-1.5 block text-sm font-medium">Категория</label>
            <select
              className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
              {...form.register("category")}
            >
              {Object.entries(EXPENSE_CATEGORY_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Сумма" type="number" step="0.01" error={form.formState.errors.amount?.message} {...form.register("amount")} />
            <Input label="Дата" type="date" error={form.formState.errors.date?.message} {...form.register("date")} />
          </div>
          <Input label="Заметки" {...form.register("notes")} />
          {saveMutation.isError && <p className="text-sm text-danger">Не удалось сохранить.</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={closeModal}>Отмена</Button>
            <Button type="submit" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "Сохранение..." : "Сохранить"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
