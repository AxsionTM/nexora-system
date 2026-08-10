export interface Workspace {
  id: number;
  name: string;
  slug: string;
  is_demo: boolean;
  created_at: string;
}

export interface Product {
  id: number;
  name: string;
  sku: string;
  description: string;
  category: string;
  price: string;
  cost: string;
  stock: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: number;
  name: string;
  email: string;
  phone: string;
  company: string;
  notes: string;
  total_orders: number;
  total_spent: string;
  created_at: string;
  updated_at: string;
}

export type OrderStatus = "pending" | "processing" | "shipped" | "delivered" | "cancelled";
export type PaymentStatus = "unpaid" | "paid" | "refunded" | "partial";

export interface OrderItem {
  id?: number;
  product: number | null;
  product_name: string;
  quantity: number;
  unit_price: string;
  subtotal?: string;
}

export interface Order {
  id: number;
  customer: number | null;
  customer_name: string | null;
  status: OrderStatus;
  payment_status: PaymentStatus;
  notes: string;
  total: string;
  items: OrderItem[];
  created_at: string;
  updated_at: string;
}

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Ожидает",
  processing: "В обработке",
  shipped: "Отправлен",
  delivered: "Доставлен",
  cancelled: "Отменён",
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  unpaid: "Не оплачен",
  paid: "Оплачен",
  refunded: "Возврат",
  partial: "Частично",
};


export type ExpenseCategory =
  | "marketing"
  | "salary"
  | "rent"
  | "software"
  | "logistics"
  | "taxes"
  | "other";

export interface Expense {
  id: number;
  title: string;
  category: ExpenseCategory;
  category_display: string;
  amount: string;
  date: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  marketing: "Маркетинг",
  salary: "Зарплата",
  rent: "Аренда",
  software: "ПО / Подписки",
  logistics: "Логистика",
  taxes: "Налоги",
  other: "Прочее",
};

export type MemberRole = "owner" | "admin" | "manager" | "employee";

export interface TeamMember {
  id: number;
  email: string;
  full_name: string;
  first_name: string;
  last_name: string;
  role: MemberRole;
  role_display: string;
  joined_at: string;
}

export const ROLE_LABELS: Record<MemberRole, string> = {
  owner: "Владелец",
  admin: "Админ",
  manager: "Менеджер",
  employee: "Сотрудник",
};

export type NotificationType = "order" | "payment" | "stock" | "team" | "system" | "report";

export interface AppNotification {
  id: number;
  type: NotificationType;
  type_display: string;
  title: string;
  message: string;
  is_read: boolean;
  link: string;
  created_at: string;
}

export interface NotificationsResponse {
  unread_count: number;
  results: AppNotification[];
}
