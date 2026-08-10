import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  BarChart3,
  ShoppingCart,
  Package,
  Users,
  Receipt,
  UsersRound,
  Bot,
  Settings,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/dashboard", label: "Дашборд", icon: LayoutDashboard },
  { to: "/analytics", label: "Аналитика", icon: BarChart3 },
  { to: "/orders", label: "Заказы", icon: ShoppingCart },
  { to: "/products", label: "Товары", icon: Package },
  { to: "/customers", label: "Клиенты", icon: Users },
  { to: "/expenses", label: "Расходы", icon: Receipt },
  { to: "/team", label: "Команда", icon: UsersRound },
  { to: "/ai", label: "AI Ассистент", icon: Bot },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function Sidebar({
  collapsed,
  onToggle,
  mobileOpen,
  onMobileClose,
}: SidebarProps) {
  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={onMobileClose}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col border-r border-border bg-sidebar transition-all duration-200",
          collapsed ? "w-[68px]" : "w-60",
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-border px-3">
          {!collapsed && <Logo />}
          {collapsed && (
            <div className="mx-auto">
              <Logo showWordmark={false} />
            </div>
          )}
          <button
            type="button"
            onClick={onToggle}
            className="hidden h-8 w-8 items-center justify-center rounded-md text-muted hover:bg-surface hover:text-foreground md:flex"
            aria-label={collapsed ? "Развернуть" : "Свернуть"}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </button>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto p-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onMobileClose}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                  isActive
                    ? "bg-accent/10 font-medium text-accent"
                    : "text-muted hover:bg-surface hover:text-foreground",
                  collapsed && "justify-center px-2"
                )
              }
              title={collapsed ? item.label : undefined}
            >
              <item.icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-border p-2">
          <NavLink
            to="/settings"
            onClick={onMobileClose}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                isActive
                  ? "bg-accent/10 font-medium text-accent"
                  : "text-muted hover:bg-surface hover:text-foreground",
                collapsed && "justify-center px-2"
              )
            }
            title={collapsed ? "Настройки" : undefined}
          >
            <Settings className="h-4 w-4 shrink-0" strokeWidth={1.75} />
            {!collapsed && <span>Настройки</span>}
          </NavLink>
        </div>
      </aside>
    </>
  );
}
