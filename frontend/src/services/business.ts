import { api } from "./api";
import type { Workspace, Product, Customer, Order, OrderItem } from "@/types/business";

export async function ensureWorkspace(name?: string) {
  const { data } = await api.post<Workspace>("/workspaces/ensure/", { name });
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
