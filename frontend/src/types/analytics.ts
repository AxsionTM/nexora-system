export type Period = "7D" | "30D" | "3M" | "6M" | "1Y";

export interface DashboardSummary {
  period: Period;
  revenue: string;
  revenue_change: number;
  orders: number;
  orders_change: number;
  customers: number;
  customers_change: number;
  expenses: string;
  expenses_change: number;
  net_profit: string;
  net_profit_change: number;
  average_order_value: string;
  conversion_rate: number;
}

export interface SeriesPoint {
  date: string;
  value: number;
}

export interface TopProduct {
  name: string;
  quantity: number;
  revenue: string;
}

export interface RecentOrder {
  id: number;
  customer_name: string | null;
  status: string;
  payment_status: string;
  total: string;
  created_at: string;
}
