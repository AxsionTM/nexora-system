import { api } from "./api";
import type { LoginResponse, RegisterPayload, User } from "@/types/auth";

export async function login(email: string, password: string) {
  const { data } = await api.post<LoginResponse>("/auth/login/", {
    email,
    password,
  });
  return data;
}

export async function register(payload: RegisterPayload) {
  const { data } = await api.post<{ user: User; message: string }>(
    "/auth/register/",
    payload
  );
  return data;
}

export async function fetchMe() {
  const { data } = await api.get<User>("/auth/me/");
  return data;
}

export async function requestPasswordReset(email: string) {
  const { data } = await api.post<{ message: string; debug?: { uid: string; token: string; reset_path: string } }>(
    "/auth/password-reset/",
    { email }
  );
  return data;
}

export async function confirmPasswordReset(
  uid: string,
  token: string,
  new_password: string
) {
  const { data } = await api.post<{ message: string }>(
    "/auth/password-reset/confirm/",
    { uid, token, new_password }
  );
  return data;
}

export async function updateProfile(payload: {
  first_name?: string;
  last_name?: string;
  email?: string;
}) {
  const { data } = await api.patch<User>("/auth/me/", payload);
  return data;
}

export async function changePassword(payload: {
  old_password: string;
  new_password: string;
}) {
  const { data } = await api.post<{ message: string }>(
    "/auth/change-password/",
    payload
  );
  return data;
}

export async function fetchWallet() {
  const { data } = await api.get("/auth/wallet/");
  return data as {
    balance: string;
    plan: string;
    plan_expires_at: string | null;
    limits: {
      max_workspaces: number;
      max_team_members: number | null;
      max_orders_per_month: number | null;
      ai_enabled: boolean;
      name: string;
      price: string;
      features: string[];
    };
    transactions: {
      id: number;
      type: string;
      type_display: string;
      amount: string;
      balance_after: string;
      description: string;
      created_at: string;
    }[];
    subscriptions: {
      id: number;
      plan: string;
      price: string;
      starts_at: string;
      ends_at: string | null;
      note: string;
      created_at: string;
    }[];
  };
}

export async function fetchPlans() {
  const { data } = await api.get("/auth/plans/");
  return data as {
    code: string;
    name: string;
    price: string;
    max_workspaces: number;
    features: string[];
    ai_enabled: boolean;
  }[];
}

export async function purchasePlan(plan: string, months = 1) {
  const { data } = await api.post("/auth/plans/purchase/", { plan, months });
  return data as { plan: string; expires_at: string; paid: string; balance: string };
}
