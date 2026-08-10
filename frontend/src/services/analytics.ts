import { api } from "./api";
import type {
  DashboardSummary,
  SeriesPoint,
  TopProduct,
  RecentOrder,
  Period,
} from "@/types/analytics";

export async function fetchSummary(period: Period, workspaceId?: number) {
  const { data } = await api.get<DashboardSummary>("/analytics/summary/", {
    params: { period, workspace: workspaceId },
  });
  return data;
}

export async function fetchRevenueSeries(period: Period, workspaceId?: number) {
  const { data } = await api.get<SeriesPoint[]>("/analytics/revenue/", {
    params: { period, workspace: workspaceId },
  });
  return data;
}

export async function fetchOrdersSeries(period: Period, workspaceId?: number) {
  const { data } = await api.get<SeriesPoint[]>("/analytics/orders-series/", {
    params: { period, workspace: workspaceId },
  });
  return data;
}

export async function fetchTopProducts(period: Period, workspaceId?: number) {
  const { data } = await api.get<TopProduct[]>("/analytics/top-products/", {
    params: { period, workspace: workspaceId },
  });
  return data;
}

export async function fetchRecentOrders(workspaceId?: number) {
  const { data } = await api.get<RecentOrder[]>("/analytics/recent-orders/", {
    params: { workspace: workspaceId },
  });
  return data;
}
