import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { ShoppingCart, History, LayoutDashboard, Box, QrCode, Settings, LogOut, Wallet, Users, ChefHat } from "lucide-react";
import { Logo } from "./Logo";
import { ThemeToggle } from "./ThemeToggle";
import { useAuth, hasRole } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const NAV = [
  { to: "/pos", label: "Punto de Venta", icon: ShoppingCart, roles: ["admin", "cajero", "supervisor"] as const },
  { to: "/caja", label: "Caja", icon: Wallet, roles: ["admin", "cajero", "supervisor"] as const },
  { to: "/historial", label: "Historial", icon: History, roles: ["admin", "supervisor"] as const },
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["admin", "supervisor"] as const },
  { to: "/inventario", label: "Inventario", icon: Box, roles: ["admin", "supervisor"] as const },
  { to: "/cocina", label: "Cocina", icon: ChefHat, roles: ["admin", "supervisor", "cocinero"] as const },
  { to: "/clientes", label: "Clientes", icon: Users, roles: ["admin", "supervisor"] as const },
  { to: "/configuracion", label: "Configuración", icon: Settings, roles: ["admin"] as const },
];

export function Sidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const { user, roles, fullName } = useAuth();

  if (!user) return null;
  if (pathname === "/auth") return null;

  const primaryRole = roles[0] ?? "cajero";

  const visible = NAV.filter((n) => roles.length === 0 || hasRole(roles as any, ...(n.roles as any)));

  const onLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Sesión cerrada");
    navigate({ to: "/auth", replace: true });
  };

  return (
    <aside className="hidden md:flex w-64 shrink-0 flex-col bg-sidebar border-r border-sidebar-border">
      <div className="p-5 flex items-center justify-between border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <Logo size={44} />
          <div>
            <div className="font-display text-lg gold-text leading-tight">Esquites</div>
            <div className="text-xs text-muted-foreground">La Parroquia · POS</div>
          </div>
        </div>
        <ThemeToggle />
      </div>
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {visible.map(({ to, label, icon: Icon }) => {
          const active = pathname.startsWith(to);
          return (
            <Link
              key={to}
              to={to}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-all ${active
                ? "bg-linear-to-r from-gold/20 to-transparent text-foreground gold-border"
                : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
                }`}
            >
              <Icon className="size-5" />
              <span className="font-medium">{label}</span>
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
