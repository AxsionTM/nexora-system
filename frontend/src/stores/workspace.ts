import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Workspace } from "@/types/business";
import * as api from "@/services/business";

interface WorkspaceState {
  workspace: Workspace | null;
  isLoading: boolean;
  ensure: () => Promise<Workspace>;
  setWorkspace: (w: Workspace | null) => void;
}

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set, get) => ({
      workspace: null,
      isLoading: false,

      setWorkspace: (workspace) => set({ workspace }),

      ensure: async () => {
        const current = get().workspace;
        if (current) return current;
        set({ isLoading: true });
        try {
          const ws = await api.ensureWorkspace();
          set({ workspace: ws, isLoading: false });
          return ws;
        } catch (e) {
          set({ isLoading: false });
          throw e;
        }
      },
    }),
    {
      name: "nexora-workspace",
      partialize: (s) => ({ workspace: s.workspace }),
    }
  )
);
