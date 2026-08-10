import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Pencil, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import * as api from "@/services/business";
import { useWorkspaceStore } from "@/stores/workspace";
import type { Customer } from "@/types/business";

const schema = z.object({
  name: z.string().min(1, "Укажите имя"),
  email: z.string().email("Некорректный email").or(z.literal("")).optional(),
  phone: z.string().optional(),
  company: z.string().optional(),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export default function CustomersPage() {
  const queryClient = useQueryClient();
  const workspace = useWorkspaceStore((s) => s.workspace);
  const ensure = useWorkspaceStore((s) => s.ensure);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);

  const { data: customers = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["customers", workspace?.id, search],
    queryFn: async () => {
      await ensure();
      return api.listCustomers({ search: search || undefined, workspace: workspace?.id });
    },
  });

  const form = useForm<FormData>({ resolver: zodResolver(schema) });

  const saveMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const payload = {
        name: data.name,
        email: data.email || "",
        phone: data.phone || "",
        company: data.company || "",
        notes: data.notes || "",
      };
      if (editing) return api.updateCustomer(editing.id, payload);
      return api.createCustomer(payload, workspace?.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      closeModal();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: api.deleteCustomer,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["customers"] }),
  });

  const openCreate = () => {
    setEditing(null);
    form.reset({ name: "", email: "", phone: "", company: "", notes: "" });
    setModalOpen(true);
  };

  const openEdit = (c: Customer) => {
    setEditing(c);
    form.reset({
      name: c.name,
      email: c.email,
      phone: c.phone,
      company: c.company,
      notes: c.notes,
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
  };

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Клиенты</h1>
          <p className="mt-1 text-sm text-muted">База клиентов и история покупок</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Добавить клиента
        </Button>
      </div>

      <div className="mb-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            className="h-10 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
            placeholder="Поиск по имени, email, телефону..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {isLoading && <div className="py-12 text-center text-sm text-muted">Загрузка...</div>}
      {isError && (
        <div className="rounded-lg border border-danger/30 bg-danger/10 p-4 text-sm text-danger">
          Не удалось загрузить клиентов.{" "}
          <button type="button" className="underline" onClick={() => refetch()}>Повторить</button>
        </div>
      )}
      {!isLoading && !isError && customers.length === 0 && (
        <div className="rounded-xl border border-dashed border-border bg-surface/50 px-6 py-16 text-center">
          <p className="text-sm text-muted">Клиентов пока нет</p>
          <Button className="mt-4" size="sm" onClick={openCreate}>Добавить первого клиента</Button>
        </div>
      )}

      {customers.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface text-left text-xs text-muted">
                <th className="px-4 py-3 font-medium">Имя</th>
                <th className="px-4 py-3 font-medium hidden sm:table-cell">Email</th>
                <th className="px-4 py-3 font-medium hidden md:table-cell">Телефон</th>
                <th className="px-4 py-3 font-medium hidden lg:table-cell">Компания</th>
                <th className="px-4 py-3 font-medium">Заказов</th>
                <th className="px-4 py-3 font-medium">Потрачено</th>
                <th className="px-4 py-3 font-medium w-24" />
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.id} className="border-b border-border last:border-0 hover:bg-surface/50">
                  <td className="px-4 py-3 font-medium">{c.name}</td>
                  <td className="px-4 py-3 text-muted hidden sm:table-cell">{c.email || "—"}</td>
                  <td className="px-4 py-3 text-muted hidden md:table-cell">{c.phone || "—"}</td>
                  <td className="px-4 py-3 text-muted hidden lg:table-cell">{c.company || "—"}</td>
                  <td className="px-4 py-3">{c.total_orders}</td>
                  <td className="px-4 py-3">${Number(c.total_spent).toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button type="button" onClick={() => openEdit(c)} className="rounded p-1.5 text-muted hover:bg-surface hover:text-foreground">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => { if (confirm("Удалить клиента?")) deleteMutation.mutate(c.id); }}
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

      <Modal open={modalOpen} onClose={closeModal} title={editing ? "Редактировать клиента" : "Новый клиент"}>
        <form onSubmit={form.handleSubmit((d) => saveMutation.mutate(d))} className="space-y-4">
          <Input label="Имя" error={form.formState.errors.name?.message} {...form.register("name")} />
          <Input label="Email" type="email" error={form.formState.errors.email?.message} {...form.register("email")} />
          <Input label="Телефон" {...form.register("phone")} />
          <Input label="Компания" {...form.register("company")} />
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
