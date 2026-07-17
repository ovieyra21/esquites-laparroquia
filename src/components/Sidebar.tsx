import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { ShoppingCart, History, LayoutDashboard, Box, QrCode, Settings, LogOut, Wallet, Users, ChefHat, Receipt, Package, PanelLeftClose, PanelLeft } from "lucide-react";
import { Logo } from "./Logo";
import { ThemeToggle } from "./ThemeToggle";
import { useAuth, hasRole } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { useUI } from "@/store/ui";
import { localApi } from "@/lib/api/api-client";

const NAV = [
  { to: "/pos", label: "Punto de Venta", icon: ShoppingCart, roles: ["admin", "cajero", "supervisor"] as const },
  { to: "/cocina", label: "Cocina", icon: ChefHat, roles: ["admin", "supervisor", "cocinero"] as const, badge: "kds" },
  { to: "/caja", label: "Caja", icon: Wallet, roles: ["admin", "cajero", "supervisor"] as const },
  { to: "/historial", label: "Historial", icon: History, roles: ["admin", "supervisor"] as const },
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["admin", "supervisor"] as const },
  { to: "/inventario", label: "Inventario", icon: Box, roles: ["admin", "supervisor"] as const },
  { to: "/productos", label: "Productos", icon: Package, roles: ["admin", "supervisor"] as const },
  { to: "/gastos", label: "Gastos", icon: Receipt, roles: ["admin", "supervisor"] as const },
  { to: "/clientes", label: "Clientes", icon: Users, roles: ["admin", "supervisor"] as const },
  { to: "/configuracion", label: "Configuración", icon: Settings, roles: ["admin"] as const },
];

export function Sidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const { user, roles, fullName } = useAuth();

  const { data: kdsCount } = useQuery({
    queryKey: ["kds-sidebar-count"],
    queryFn: async () => {
      try {
        const sales = await localApi.get<any[]>('/api/sales');
        const pending = (sales || []).filter((s: any) => { const k = s.kds_status || "pendiente"; return k === "pendiente" || k === "preparando"; });
        return pending.length;
      } catch { return 0; }
    },
    refetchInterval: 20_000,
  });

  const sidebarHidden = useUI((s) => s.sidebarHidden);
  const toggleSidebar = useUI((s) => s.toggleSidebar);

  if (!user) return null;
  if (pathname === "/auth") return null;

  const primaryRole = roles[0] ?? "cajero";
  const visible = NAV.filter((n) => roles.length === 0 || hasRole(roles as any, ...(n.roles as any)));

  const onLogout = async () => {
    toast.success("Sesión cerrada");
    navigate({ to: "/auth", replace: true });
  };

  if (sidebarHidden) {
    return (
      <button
        onClick={toggleSidebar}
        title="Mostrar menú"
        className="fixed bottom-4 left-4 z-40 size-11 rounded-full bg-gold text-black shadow-[var(--shadow-gold)] flex items-center justify-center hover:scale-105 transition"
      >
        <PanelLeft className="size-5" />
      </button>
    );
  }

  return (
    <aside className="hidden md:flex w-64 shrink-0 flex-col bg-sidebar border-r border-sidebar-border">
      <div className="p-5 flex items-center justify-between border-b border-sidebar-border">
        <div className="flex items-center gap-3 min-w-0">
          <Logo size={44} />
          <div className="min-w-0">
            <div className="font-display text-lg gold-text leading-tight truncate">Esquites</div>
            <div className="text-xs text-muted-foreground truncate">La Parroquia · POS</div>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <ThemeToggle />
          <button
            onClick={toggleSidebar}
            title="Ocultar menú"
            className="size-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-sidebar-accent flex items-center justify-center"
          >
            <PanelLeftClose className="size-4" />
          </button>
        </div>
      </div>
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {visible.map(({ to, label, icon: Icon, badge }) => {
          const active = pathname.startsWith(to);
          return (
            <Link
              key={to}
              to={to}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-all relative ${
                active
                  ? "bg-linear-to-r from-gold/20 to-transparent text-foreground gold-border"
                  : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
              }`}
            >
              <Icon className="size-5" />
              <span className="font-medium">{label}</span>
              {badge === "kds" && kdsCount && kdsCount > 0 && (
                <span className="ml-auto bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center leading-none">
                  {kdsCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
      <div className="p-3 border-t border-sidebar-border space-y-1">
        <div className="px-3 py-2 text-xs">
          <div className="font-semibold text-foreground truncate">{fullName ?? user.email}</div>
          <div className="text-muted-foreground capitalize">{primaryRole}</div>
        </div>
        <button onClick={onLogout} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-destructive hover:bg-sidebar-accent transition">
          <LogOut className="size-4" /> Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
