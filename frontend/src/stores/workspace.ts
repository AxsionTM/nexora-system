import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Workspace } from "@/types/business";
import * as api from "@/services/business";

interface WorkspaceState {
  workspace: Workspace | null;
  workspaces: Workspace[];
  isLoading: boolean;
  ensure: () => Promise<Workspace>;
  refreshList: () => Promise<Workspace[]>;
  setWorkspace: (w: Workspace | null) => void;
  create: (name: string) => Promise<Workspace>;
}

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set, get) => ({
      workspace: null,
      workspaces: [],
      isLoading: false,

      setWorkspace: (workspace) => set({ workspace }),

      refreshList: async () => {
        const list = await api.listWorkspaces();
        set({ workspaces: list });
        return list;
      },

      create: async (name: string) => {
        const ws = await api.createWorkspace(name);
        const list = await api.listWorkspaces();
        set({ workspace: ws, workspaces: list });
        return ws;
      },

      ensure: async () => {
        const current = get().workspace;
        set({ isLoading: true });
        try {
          const list = await api.listWorkspaces().catch(() => [] as Workspace[]);
          if (list.length) {
            set({ workspaces: list });
            const match = current && list.find((w) => w.id === current.id);
            const ws = match || list[0];
            set({ workspace: ws, isLoading: false });
            return ws;
          }
          const ws = await api.ensureWorkspace();
          set({ workspace: ws, workspaces: [ws], isLoading: false });
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
