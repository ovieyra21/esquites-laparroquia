import { Link, useRouterState } from "@tanstack/react-router";
import { ShoppingCart, History, LayoutDashboard, Package, QrCode, Settings, LogOut } from "lucide-react";
import { Logo } from "./Logo";

const NAV = [
  { to: "/pos", label: "Punto de Venta", icon: ShoppingCart },
  { to: "/historial", label: "Historial de Ventas", icon: History },
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/productos", label: "Productos", icon: Package },
  { to: "/menu", label: "Menú Digital & QR", icon: QrCode },
  { to: "/configuracion", label: "Configuración", icon: Settings },
] as const;

export function Sidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <aside className="hidden md:flex w-64 shrink-0 flex-col bg-sidebar border-r border-sidebar-border">
      <div className="p-5 flex items-center gap-3 border-b border-sidebar-border">
        <Logo size={44} />
        <div>
          <div className="font-display text-lg gold-text leading-tight">Esquites</div>
          <div className="text-xs text-muted-foreground">La Parroquia · POS</div>
        </div>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {NAV.map(({ to, label, icon: Icon }) => {
          const active = pathname.startsWith(to);
          return (
            <Link
              key={to}
              to={to}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-all ${
                active
                  ? "bg-gradient-to-r from-gold/20 to-transparent text-foreground gold-border"
                  : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
              }`}
            >
              <Icon className="size-5" />
              <span className="font-medium">{label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="p-3 border-t border-sidebar-border">
        <div className="px-3 py-2 text-xs text-muted-foreground">
          <div className="font-medium text-foreground">Admin</div>
          <div>Cajero: Demo</div>
        </div>
        <button className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition">
          <LogOut className="size-4" /> Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
