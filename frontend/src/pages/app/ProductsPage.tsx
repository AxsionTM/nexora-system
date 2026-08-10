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
import type { Product } from "@/types/business";

const schema = z.object({
  name: z.string().min(1, "Укажите название"),
  sku: z.string().optional(),
  category: z.string().optional(),
  price: z.string().min(1, "Укажите цену"),
  cost: z.string().optional(),
  stock: z.coerce.number().min(0),
  description: z.string().optional(),
  is_active: z.boolean().optional(),
});

type FormData = z.infer<typeof schema>;

export default function ProductsPage() {
  const queryClient = useQueryClient();
  const workspace = useWorkspaceStore((s) => s.workspace);
  const ensure = useWorkspaceStore((s) => s.ensure);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);

  const { data: products = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["products", workspace?.id, search],
    queryFn: async () => {
      await ensure();
      return api.listProducts({ search: search || undefined, workspace: workspace?.id });
    },
  });

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { stock: 0, is_active: true },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const payload = {
        name: data.name,
        sku: data.sku || "",
        category: data.category || "",
        price: data.price,
        cost: data.cost || "0",
        stock: data.stock,
        description: data.description || "",
        is_active: data.is_active ?? true,
      };
      if (editing) return api.updateProduct(editing.id, payload);
      return api.createProduct(payload, workspace?.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      closeModal();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: api.deleteProduct,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["products"] }),
  });

  const openCreate = () => {
    setEditing(null);
    form.reset({ name: "", sku: "", category: "", price: "", cost: "0", stock: 0, description: "", is_active: true });
    setModalOpen(true);
  };

  const openEdit = (p: Product) => {
    setEditing(p);
    form.reset({
      name: p.name,
      sku: p.sku,
      category: p.category,
      price: p.price,
      cost: p.cost,
      stock: p.stock,
      description: p.description,
      is_active: p.is_active,
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
          <h1 className="text-2xl font-semibold tracking-tight">Товары</h1>
          <p className="mt-1 text-sm text-muted">Каталог, цены и остатки</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Добавить товар
        </Button>
      </div>

      <div className="mb-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            className="h-10 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
            placeholder="Поиск по названию, SKU, категории..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {isLoading && (
        <div className="py-12 text-center text-sm text-muted">Загрузка...</div>
      )}
      {isError && (
        <div className="rounded-lg border border-danger/30 bg-danger/10 p-4 text-sm text-danger">
          Не удалось загрузить товары.{" "}
          <button type="button" className="underline" onClick={() => refetch()}>
            Повторить
          </button>
        </div>
      )}
      {!isLoading && !isError && products.length === 0 && (
        <div className="rounded-xl border border-dashed border-border bg-surface/50 px-6 py-16 text-center">
          <p className="text-sm text-muted">Товаров пока нет</p>
          <Button className="mt-4" size="sm" onClick={openCreate}>
            Добавить первый товар
          </Button>
        </div>
      )}

      {products.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface text-left text-xs text-muted">
                <th className="px-4 py-3 font-medium">Название</th>
                <th className="px-4 py-3 font-medium hidden sm:table-cell">SKU</th>
                <th className="px-4 py-3 font-medium hidden md:table-cell">Категория</th>
                <th className="px-4 py-3 font-medium">Цена</th>
                <th className="px-4 py-3 font-medium">Остаток</th>
                <th className="px-4 py-3 font-medium">Статус</th>
                <th className="px-4 py-3 font-medium w-24" />
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} className="border-b border-border last:border-0 hover:bg-surface/50">
                  <td className="px-4 py-3 font-medium">{p.name}</td>
                  <td className="px-4 py-3 text-muted hidden sm:table-cell">{p.sku || "—"}</td>
                  <td className="px-4 py-3 text-muted hidden md:table-cell">{p.category || "—"}</td>
                  <td className="px-4 py-3">${Number(p.price).toLocaleString()}</td>
                  <td className="px-4 py-3">{p.stock}</td>
                  <td className="px-4 py-3">
                    <Badge variant={p.is_active ? "success" : "default"}>
                      {p.is_active ? "Активен" : "Скрыт"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button type="button" onClick={() => openEdit(p)} className="rounded p-1.5 text-muted hover:bg-surface hover:text-foreground">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm("Удалить товар?")) deleteMutation.mutate(p.id);
                        }}
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

      <Modal open={modalOpen} onClose={closeModal} title={editing ? "Редактировать товар" : "Новый товар"}>
        <form onSubmit={form.handleSubmit((d) => saveMutation.mutate(d))} className="space-y-4">
          <Input label="Название" error={form.formState.errors.name?.message} {...form.register("name")} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="SKU" {...form.register("sku")} />
            <Input label="Категория" {...form.register("category")} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Цена" type="number" step="0.01" error={form.formState.errors.price?.message} {...form.register("price")} />
            <Input label="Себестоимость" type="number" step="0.01" {...form.register("cost")} />
          </div>
          <Input label="Остаток" type="number" {...form.register("stock")} />
          <Input label="Описание" {...form.register("description")} />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" {...form.register("is_active")} className="rounded border-border" />
            Активен
          </label>
          {saveMutation.isError && (
            <p className="text-sm text-danger">Не удалось сохранить. Проверьте данные.</p>
          )}
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
