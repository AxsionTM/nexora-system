import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User } from "@/types/auth";
import * as authApi from "@/services/auth";

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: {
    email: string;
    password: string;
    password_confirm: string;
    first_name?: string;
    last_name?: string;
  }) => Promise<void>;
  logout: () => void;
  loadUser: () => Promise<void>;
  setUser: (user: User | null) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: true,

      setUser: (user) =>
        set({ user, isAuthenticated: Boolean(user), isLoading: false }),

      login: async (email, password) => {
        const data = await authApi.login(email, password);
        localStorage.setItem("nexora_access", data.access);
        localStorage.setItem("nexora_refresh", data.refresh);
        set({ user: data.user, isAuthenticated: true, isLoading: false });
      },

      register: async (payload) => {
        await authApi.register(payload);
        // After register, automatically log in
        const data = await authApi.login(payload.email, payload.password);
        localStorage.setItem("nexora_access", data.access);
        localStorage.setItem("nexora_refresh", data.refresh);
        set({ user: data.user, isAuthenticated: true, isLoading: false });
      },

      logout: () => {
        localStorage.removeItem("nexora_access");
        localStorage.removeItem("nexora_refresh");
        set({ user: null, isAuthenticated: false, isLoading: false });
      },

      loadUser: async () => {
        const token = localStorage.getItem("nexora_access");
        if (!token) {
          set({ user: null, isAuthenticated: false, isLoading: false });
          return;
        }
        try {
          const user = await authApi.fetchMe();
          set({ user, isAuthenticated: true, isLoading: false });
        } catch {
          localStorage.removeItem("nexora_access");
          localStorage.removeItem("nexora_refresh");
          set({ user: null, isAuthenticated: false, isLoading: false });
        }
      },
    }),
    {
      name: "nexora-auth",
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
