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
