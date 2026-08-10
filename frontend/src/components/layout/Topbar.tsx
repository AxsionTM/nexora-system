import { Menu, Bell, LogOut, User as UserIcon } from "lucide-react";
import { useAuthStore } from "@/stores/auth";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { Button } from "@/components/ui/Button";
import { useNavigate } from "react-router-dom";

interface TopbarProps {
  onMenuClick: () => void;
  title?: string;
}

export function Topbar({ onMenuClick, title }: TopbarProps) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

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
        <h1 className="text-sm font-semibold tracking-tight sm:text-base">
          {title}
        </h1>
      )}

      <div className="ml-auto flex items-center gap-2">
        <ThemeToggle />
        <button
          type="button"
          className="relative flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:bg-surface hover:text-foreground"
          aria-label="Уведомления"
        >
          <Bell className="h-4 w-4" />
        </button>

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
