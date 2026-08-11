import { api } from "./api";
import type { Workspace, Product, Customer, Order, OrderItem } from "@/types/business";

export async function ensureWorkspace(name?: string) {
  const { data } = await api.post<Workspace>("/workspaces/ensure/", { name });
  return data;
}

export async function createWorkspace(name: string) {
  const { data } = await api.post<Workspace>("/workspaces/", { name });
  return data;
}

export async function listWorkspaces() {
  const { data } = await api.get<Workspace[]>("/workspaces/");
  return data;
}

export async function listProducts(params?: { search?: string; category?: string; workspace?: number }) {
  const { data } = await api.get<Product[]>("/products/", { params });
  return data;
}

export async function createProduct(payload: Partial<Product>, workspaceId?: number) {
  const { data } = await api.post<Product>("/products/", payload, {
    params: workspaceId ? { workspace: workspaceId } : undefined,
  });
  return data;
}

export async function updateProduct(id: number, payload: Partial<Product>) {
  const { data } = await api.patch<Product>(`/products/${id}/`, payload);
  return data;
}

export async function deleteProduct(id: number) {
  await api.delete(`/products/${id}/`);
}

export async function listCustomers(params?: { search?: string; workspace?: number }) {
  const { data } = await api.get<Customer[]>("/customers/", { params });
  return data;
}

export async function createCustomer(payload: Partial<Customer>, workspaceId?: number) {
  const { data } = await api.post<Customer>("/customers/", payload, {
    params: workspaceId ? { workspace: workspaceId } : undefined,
  });
  return data;
}

export async function updateCustomer(id: number, payload: Partial<Customer>) {
  const { data } = await api.patch<Customer>(`/customers/${id}/`, payload);
  return data;
}

export async function deleteCustomer(id: number) {
  await api.delete(`/customers/${id}/`);
}

export async function listOrders(params?: { search?: string; status?: string; workspace?: number }) {
  const { data } = await api.get<Order[]>("/orders/", { params });
  return data;
}

export async function getOrder(id: number) {
  const { data } = await api.get<Order>(`/orders/${id}/`);
  return data;
}

export async function createOrder(
  payload: {
    customer?: number | null;
    status?: string;
    payment_status?: string;
    notes?: string;
    items: Omit<OrderItem, "id" | "subtotal">[];
  },
  workspaceId?: number
) {
  const { data } = await api.post<Order>("/orders/", payload, {
    params: workspaceId ? { workspace: workspaceId } : undefined,
  });
  return data;
}

export async function updateOrder(id: number, payload: Partial<Order> & { items?: OrderItem[] }) {
  const { data } = await api.patch<Order>(`/orders/${id}/`, payload);
  return data;
}

export async function deleteOrder(id: number) {
  await api.delete(`/orders/${id}/`);
}

export async function listExpenses(params?: {
  search?: string;
  category?: string;
  workspace?: number;
}) {
  const { data } = await api.get<import("@/types/business").Expense[]>("/expenses/", {
    params,
  });
  return data;
}

export async function createExpense(
  payload: Partial<import("@/types/business").Expense>,
  workspaceId?: number
) {
  const { data } = await api.post<import("@/types/business").Expense>("/expenses/", payload, {
    params: workspaceId ? { workspace: workspaceId } : undefined,
  });
  return data;
}

export async function updateExpense(
  id: number,
  payload: Partial<import("@/types/business").Expense>
) {
  const { data } = await api.patch<import("@/types/business").Expense>(
    `/expenses/${id}/`,
    payload
  );
  return data;
}

export async function deleteExpense(id: number) {
  await api.delete(`/expenses/${id}/`);
}

export async function listTeam(workspaceId?: number) {
  const { data } = await api.get<import("@/types/business").TeamMember[]>("/team/", {
    params: workspaceId ? { workspace: workspaceId } : undefined,
  });
  return data;
}

export async function inviteMember(
  payload: { email: string; role: string },
  workspaceId?: number
) {
  const { data } = await api.post<import("@/types/business").TeamMember>("/team/", payload, {
    params: workspaceId ? { workspace: workspaceId } : undefined,
  });
  return data;
}

export async function updateMemberRole(id: number, role: string) {
  const { data } = await api.patch<import("@/types/business").TeamMember>(`/team/${id}/`, {
    role,
  });
  return data;
}

export async function removeMember(id: number) {
  await api.delete(`/team/${id}/`);
}

export async function listNotifications(workspaceId?: number) {
  const { data } = await api.get<import("@/types/business").NotificationsResponse>(
    "/notifications/",
    { params: workspaceId ? { workspace: workspaceId } : undefined }
  );
  return data;
}

export async function markNotificationRead(id: number) {
  const { data } = await api.patch(`/notifications/${id}/`, { is_read: true });
  return data;
}

export async function markAllNotificationsRead(workspaceId?: number) {
  const { data } = await api.post(
    "/notifications/mark-all-read/",
    {},
    { params: workspaceId ? { workspace: workspaceId } : undefined }
  );
  return data;
}

export async function listIntegrations(workspaceId?: number) {
  const { data } = await api.get<import("@/types/business").Integration[]>(
    "/integrations/",
    { params: workspaceId ? { workspace: workspaceId } : undefined }
  );
  return data;
}

export async function connectIntegration(
  provider: string,
  workspaceId?: number,
  config?: Record<string, string>
) {
  const { data } = await api.post<import("@/types/business").Integration>(
    `/integrations/${provider}/connect/`,
    { config: config || {} },
    { params: workspaceId ? { workspace: workspaceId } : undefined }
  );
  return data;
}

export async function testIntegration(provider: string, workspaceId?: number) {
  const { data } = await api.post(
    `/integrations/${provider}/test/`,
    {},
    { params: workspaceId ? { workspace: workspaceId } : undefined }
  );
  return data;
}

export function csvExportUrl(type: "orders" | "products" | "customers", workspaceId?: number) {
  const base = import.meta.env.VITE_API_BASE_URL || "/api";
  const q = new URLSearchParams({ type });
  if (workspaceId) q.set("workspace", String(workspaceId));
  return `${base}/export/csv/?${q.toString()}`;
}

export async function disconnectIntegration(provider: string, workspaceId?: number) {
  const { data } = await api.post<import("@/types/business").Integration>(
    `/integrations/${provider}/disconnect/`,
    {},
    { params: workspaceId ? { workspace: workspaceId } : undefined }
  );
  return data;
}

export async function listPayments(workspaceId?: number) {
  const { data } = await api.get<import("@/types/business").Payment[]>("/payments/", {
    params: workspaceId ? { workspace: workspaceId } : undefined,
  });
  return data;
}

export async function createSandboxPayment(
  payload: { amount: string; order_id?: number | null; simulate: "success" | "failed" | "pending" },
  workspaceId?: number
) {
  const { data } = await api.post<import("@/types/business").Payment>(
    "/payments/sandbox/",
    payload,
    { params: workspaceId ? { workspace: workspaceId } : undefined }
  );
  return data;
}

export async function refundPayment(paymentId: number, workspaceId?: number) {
  const { data } = await api.post<import("@/types/business").Payment>(
    `/payments/${paymentId}/refund/`,
    {},
    { params: workspaceId ? { workspace: workspaceId } : undefined }
  );
  return data;
}
