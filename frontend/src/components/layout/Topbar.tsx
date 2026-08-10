import { useState, useRef, useEffect } from "react";
import { Menu, Bell, LogOut, User as UserIcon } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate, Link } from "react-router-dom";
import { useAuthStore } from "@/stores/auth";
import { useWorkspaceStore } from "@/stores/workspace";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { Button } from "@/components/ui/Button";
import * as api from "@/services/business";
import { cn } from "@/lib/utils";

interface TopbarProps {
  onMenuClick: () => void;
  title?: string;
}

export function Topbar({ onMenuClick, title }: TopbarProps) {
  const { user, logout } = useAuthStore();
  const workspace = useWorkspaceStore((s) => s.workspace);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const { data } = useQuery({
    queryKey: ["notifications", workspace?.id],
    queryFn: () => api.listNotifications(workspace?.id),
    enabled: Boolean(workspace?.id),
    refetchInterval: 60_000,
  });

  const markRead = useMutation({
    mutationFn: api.markNotificationRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const markAll = useMutation({
    mutationFn: () => api.markAllNotificationsRead(workspace?.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const unread = data?.unread_count ?? 0;
  const items = data?.results ?? [];

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur-xl sm:px-6">
      <button
        type="button"
        onClick={onMenuClick}
        className="flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:bg-surface hover:text-foreground md:hidden"
        aria-label="Меню"
      >
        <Menu className="h-5 w-5" />
      </button>

      {title && (
        <h1 className="text-sm font-semibold tracking-tight sm:text-base">{title}</h1>
      )}

      <div className="ml-auto flex items-center gap-2">
        <ThemeToggle />

        <div className="relative" ref={ref}>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="relative flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:bg-surface hover:text-foreground"
            aria-label="Уведомления"
          >
            <Bell className="h-4 w-4" />
            {unread > 0 && (
              <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-medium text-accent-foreground">
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </button>

          {open && (
            <div className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-xl border border-border bg-surface shadow-elevated sm:w-96">
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <span className="text-sm font-medium">Уведомления</span>
                {unread > 0 && (
                  <button
                    type="button"
                    className="text-xs text-accent hover:underline"
                    onClick={() => markAll.mutate()}
                  >
                    Прочитать все
                  </button>
                )}
              </div>
              <div className="max-h-80 overflow-y-auto">
                {items.length === 0 && (
                  <p className="px-4 py-8 text-center text-sm text-muted">
                    Нет уведомлений
                  </p>
                )}
                {items.map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    className={cn(
                      "flex w-full flex-col gap-0.5 border-b border-border px-4 py-3 text-left last:border-0 hover:bg-background",
                      !n.is_read && "bg-accent/5"
                    )}
                    onClick={() => {
                      if (!n.is_read) markRead.mutate(n.id);
                      if (n.link) {
                        navigate(n.link);
                        setOpen(false);
                      }
                    }}
                  >
                    <span className="text-sm font-medium">{n.title}</span>
                    {n.message && (
                      <span className="text-xs text-muted line-clamp-2">{n.message}</span>
                    )}
                    <span className="text-[10px] text-muted">
                      {new Date(n.created_at).toLocaleString("ru-RU")}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="hidden items-center gap-2 rounded-lg border border-border bg-surface px-2.5 py-1.5 sm:flex">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-accent/15 text-accent">
            <UserIcon className="h-3.5 w-3.5" />
          </div>
          <span className="max-w-[140px] truncate text-xs font-medium">
            {user?.full_name || user?.email}
          </span>
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={handleLogout}
          aria-label="Выйти"
          title="Выйти"
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
