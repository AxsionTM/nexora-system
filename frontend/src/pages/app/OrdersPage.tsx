import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import * as api from "@/services/business";
import { useWorkspaceStore } from "@/stores/workspace";
import type { Order, OrderStatus, PaymentStatus, Product, Customer } from "@/types/business";
import { ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS } from "@/types/business";

const statusVariant: Record<OrderStatus, "default" | "accent" | "success" | "warning" | "danger"> = {
  pending: "warning",
  processing: "accent",
  shipped: "accent",
  delivered: "success",
  cancelled: "danger",
};

export default function OrdersPage() {
  const queryClient = useQueryClient();
  const workspace = useWorkspaceStore((s) => s.workspace);
  const ensure = useWorkspaceStore((s) => s.ensure);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Order | null>(null);

  const [customerId, setCustomerId] = useState<string>("");
  const [status, setStatus] = useState<OrderStatus>("pending");
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("unpaid");
  const [notes, setNotes] = useState("");
  const [productId, setProductId] = useState("");
  const [qty, setQty] = useState(1);

  const { data: orders = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["orders", workspace?.id, search, statusFilter],
    queryFn: async () => {
      await ensure();
      return api.listOrders({
        search: search || undefined,
        status: statusFilter || undefined,
        workspace: workspace?.id,
      });
    },
  });

  const { data: products = [] } = useQuery({
    queryKey: ["products", workspace?.id],
    queryFn: () => api.listProducts({ workspace: workspace?.id }),
  });

  const { data: customers = [] } = useQuery({
    queryKey: ["customers", workspace?.id],
    queryFn: () => api.listCustomers({ workspace: workspace?.id }),
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const product = products.find((p) => String(p.id) === productId);
      const items = product
        ? [{ product: product.id, product_name: product.name, quantity: qty, unit_price: product.price }]
        : [];
      if (editing) {
        return api.updateOrder(editing.id, {
          customer: customerId ? Number(customerId) : null,
          status,
          payment_status: paymentStatus,
          notes,
          items,
        });
      }
      return api.createOrder(
        {
          customer: customerId ? Number(customerId) : null,
          status,
          payment_status: paymentStatus,
          notes,
          items,
        },
        workspace?.id
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      closeModal();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: api.deleteOrder,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["orders"] }),
  });

  const openCreate = () => {
    setEditing(null);
    setCustomerId("");
    setStatus("pending");
    setPaymentStatus("unpaid");
    setNotes("");
    setProductId("");
    setQty(1);
    setModalOpen(true);
  };

  const openEdit = (o: Order) => {
    setEditing(o);
    setCustomerId(o.customer ? String(o.customer) : "");
    setStatus(o.status);
    setPaymentStatus(o.payment_status);
    setNotes(o.notes);
    const first = o.items[0];
    setProductId(first?.product ? String(first.product) : "");
    setQty(first?.quantity || 1);
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
          <h1 className="text-2xl font-semibold tracking-tight">Заказы</h1>
          <p className="mt-1 text-sm text-muted">Список заказов, статусы и оплата</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Создать заказ
        </Button>
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            className="h-10 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
            placeholder="Поиск по клиенту..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="h-10 rounded-lg border border-border bg-background px-3 text-sm"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">Все статусы</option>
          {Object.entries(ORDER_STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>

      {isLoading && <div className="py-12 text-center text-sm text-muted">Загрузка...</div>}
      {isError && (
        <div className="rounded-lg border border-danger/30 bg-danger/10 p-4 text-sm text-danger">
          Не удалось загрузить заказы.{" "}
          <button type="button" className="underline" onClick={() => refetch()}>Повторить</button>
        </div>
      )}
      {!isLoading && !isError && orders.length === 0 && (
        <div className="rounded-xl border border-dashed border-border bg-surface/50 px-6 py-16 text-center">
          <p className="text-sm text-muted">Заказов пока нет</p>
          <Button className="mt-4" size="sm" onClick={openCreate}>Создать первый заказ</Button>
        </div>
      )}

      {orders.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface text-left text-xs text-muted">
                <th className="px-4 py-3 font-medium">№</th>
                <th className="px-4 py-3 font-medium">Клиент</th>
                <th className="px-4 py-3 font-medium">Статус</th>
                <th className="px-4 py-3 font-medium hidden sm:table-cell">Оплата</th>
                <th className="px-4 py-3 font-medium">Сумма</th>
                <th className="px-4 py-3 font-medium hidden md:table-cell">Дата</th>
                <th className="px-4 py-3 font-medium w-24" />
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="border-b border-border last:border-0 hover:bg-surface/50">
                  <td className="px-4 py-3 font-medium">#{o.id}</td>
                  <td className="px-4 py-3">{o.customer_name || "—"}</td>
                  <td className="px-4 py-3">
                    <Badge variant={statusVariant[o.status]}>{ORDER_STATUS_LABELS[o.status]}</Badge>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell text-muted">
                    {PAYMENT_STATUS_LABELS[o.payment_status]}
                  </td>
                  <td className="px-4 py-3">${Number(o.total).toLocaleString()}</td>
                  <td className="px-4 py-3 hidden md:table-cell text-muted">
                    {new Date(o.created_at).toLocaleDateString("ru-RU")}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button type="button" onClick={() => openEdit(o)} className="rounded p-1.5 text-muted hover:bg-surface hover:text-foreground">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => { if (confirm("Удалить заказ?")) deleteMutation.mutate(o.id); }}
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

      <Modal open={modalOpen} onClose={closeModal} title={editing ? `Заказ #${editing.id}` : "Новый заказ"} className="max-w-md">
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium">Клиент</label>
            <select
              className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
            >
              <option value="">Без клиента</option>
              {customers.map((c: Customer) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Статус</label>
              <select className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm" value={status} onChange={(e) => setStatus(e.target.value as OrderStatus)}>
                {Object.entries(ORDER_STATUS_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Оплата</label>
              <select className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm" value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value as PaymentStatus)}>
                {Object.entries(PAYMENT_STATUS_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Товар</label>
            <select className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm" value={productId} onChange={(e) => setProductId(e.target.value)}>
              <option value="">Выберите товар</option>
              {products
                .filter((p: Product) => p.is_active && p.stock > 0)
                .map((p: Product) => (
                <option key={p.id} value={p.id}>
                  {p.name} — ${p.price} (остаток: {p.stock})
                </option>
              ))}
            </select>
          </div>
          {(() => {
            const selected = products.find((p: Product) => String(p.id) === productId);
            const maxQty = selected?.stock ?? 1;
            return (
              <div>
                <Input
                  label={`Количество${selected ? ` (макс. ${maxQty})` : ""}`}
                  type="number"
                  min={1}
                  max={maxQty}
                  value={qty}
                  onChange={(e) => {
                    const v = Number(e.target.value) || 1;
                    setQty(Math.min(Math.max(1, v), maxQty));
                  }}
                />
                {selected && qty > selected.stock && (
                  <p className="mt-1 text-xs text-danger">Не больше остатка на складе</p>
                )}
              </div>
            );
          })()}
          <Input label="Заметки" value={notes} onChange={(e) => setNotes(e.target.value)} />
          {saveMutation.isError && <p className="text-sm text-danger">Не удалось сохранить заказ.</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={closeModal}>Отмена</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !productId || (() => { const s = products.find((p: Product) => String(p.id) === productId); return s ? qty > s.stock || s.stock <= 0 : true; })()}>
              {saveMutation.isPending ? "Сохранение..." : "Сохранить"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
