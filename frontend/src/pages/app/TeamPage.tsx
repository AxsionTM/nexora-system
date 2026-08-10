import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { UserPlus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import * as api from "@/services/business";
import { useWorkspaceStore } from "@/stores/workspace";
import type { TeamMember, MemberRole } from "@/types/business";
import { ROLE_LABELS } from "@/types/business";

const roleVariant: Record<MemberRole, "accent" | "success" | "default" | "warning"> = {
  owner: "accent",
  admin: "success",
  manager: "warning",
  employee: "default",
};

export default function TeamPage() {
  const queryClient = useQueryClient();
  const workspace = useWorkspaceStore((s) => s.workspace);
  const ensure = useWorkspaceStore((s) => s.ensure);
  const [modalOpen, setModalOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<MemberRole>("employee");
  const [error, setError] = useState("");

  const { data: members = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["team", workspace?.id],
    queryFn: async () => {
      await ensure();
      return api.listTeam(workspace?.id);
    },
  });

  const inviteMutation = useMutation({
    mutationFn: () => api.inviteMember({ email, role }, workspace?.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      setModalOpen(false);
      setEmail("");
      setRole("employee");
      setError("");
    },
    onError: (err: unknown) => {
      const data = (err as { response?: { data?: Record<string, string[]> } })?.response?.data;
      const msg = data ? Object.values(data).flat()[0] : "Не удалось пригласить";
      setError(String(msg));
    },
  });

  const roleMutation = useMutation({
    mutationFn: ({ id, role }: { id: number; role: string }) =>
      api.updateMemberRole(id, role),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["team"] }),
  });

  const removeMutation = useMutation({
    mutationFn: api.removeMember,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["team"] }),
  });

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Команда</h1>
          <p className="mt-1 text-sm text-muted">
            Участники workspace и роли доступа
            {workspace && (
              <> · <span className="text-foreground">{workspace.name}</span></>
            )}
          </p>
        </div>
        <Button onClick={() => setModalOpen(true)}>
          <UserPlus className="h-4 w-4" />
          Пригласить
        </Button>
      </div>

      {isLoading && <div className="py-12 text-center text-sm text-muted">Загрузка...</div>}
      {isError && (
        <div className="rounded-lg border border-danger/30 bg-danger/10 p-4 text-sm text-danger">
          Не удалось загрузить команду.{" "}
          <button type="button" className="underline" onClick={() => refetch()}>Повторить</button>
        </div>
      )}

      {members.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface text-left text-xs text-muted">
                <th className="px-4 py-3 font-medium">Участник</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Роль</th>
                <th className="px-4 py-3 font-medium hidden sm:table-cell">Добавлен</th>
                <th className="px-4 py-3 font-medium w-24" />
              </tr>
            </thead>
            <tbody>
              {members.map((m: TeamMember) => (
                <tr key={m.id} className="border-b border-border last:border-0 hover:bg-surface/50">
                  <td className="px-4 py-3 font-medium">{m.full_name || m.email}</td>
                  <td className="px-4 py-3 text-muted">{m.email}</td>
                  <td className="px-4 py-3">
                    {m.role === "owner" ? (
                      <Badge variant={roleVariant[m.role]}>{m.role_display || ROLE_LABELS[m.role]}</Badge>
                    ) : (
                      <select
                        className="h-8 rounded-md border border-border bg-background px-2 text-xs"
                        value={m.role}
                        onChange={(e) =>
                          roleMutation.mutate({ id: m.id, role: e.target.value })
                        }
                      >
                        {(["admin", "manager", "employee"] as MemberRole[]).map((r) => (
                          <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                        ))}
                      </select>
                    )}
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell text-muted">
                    {new Date(m.joined_at).toLocaleDateString("ru-RU")}
                  </td>
                  <td className="px-4 py-3">
                    {m.role !== "owner" && (
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm("Удалить участника из команды?"))
                            removeMutation.mutate(m.id);
                        }}
                        className="rounded p-1.5 text-muted hover:bg-surface hover:text-danger"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-6 rounded-xl border border-border bg-surface p-5">
        <p className="text-sm font-medium">Роли и доступ</p>
        <ul className="mt-3 space-y-2 text-sm text-muted">
          <li><span className="font-medium text-foreground">Владелец</span> — полный доступ, нельзя удалить</li>
          <li><span className="font-medium text-foreground">Админ</span> — бизнес, пользователи, аналитика</li>
          <li><span className="font-medium text-foreground">Менеджер</span> — заказы, клиенты, товары, аналитика</li>
          <li><span className="font-medium text-foreground">Сотрудник</span> — ограниченный доступ</li>
        </ul>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Пригласить участника">
        <div className="space-y-4">
          {error && (
            <div className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
              {error}
            </div>
          )}
          <Input
            label="Email"
            type="email"
            placeholder="colleague@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <div>
            <label className="mb-1.5 block text-sm font-medium">Роль</label>
            <select
              className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
              value={role}
              onChange={(e) => setRole(e.target.value as MemberRole)}
            >
              <option value="admin">Админ</option>
              <option value="manager">Менеджер</option>
              <option value="employee">Сотрудник</option>
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Отмена
            </Button>
            <Button
              onClick={() => inviteMutation.mutate()}
              disabled={!email || inviteMutation.isPending}
            >
              {inviteMutation.isPending ? "Отправка..." : "Пригласить"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
