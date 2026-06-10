import { createFileRoute } from "@tanstack/react-router";
import { useSales } from "@/store/sales";
import { fmt } from "@/store/cart";
import { TrendingUp, Receipt, DollarSign, Award } from "lucide-react";

export const Route = createFileRoute("/dashboard")({ component: Dashboard });

function Dashboard() {
  const sales = useSales((s) => s.sales).filter((s) => !s.cancelled);
  const total = sales.reduce((a, s) => a + s.total, 0);
  const avg = sales.length ? total / sales.length : 0;
  const topItem = (() => {
    const counts: Record<string, number> = {};
    sales.forEach((s) => s.items.forEach((i) => (counts[i.product.name] = (counts[i.product.name] ?? 0) + i.quantity)));
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";
  })();

  const cards = [
    { label: "Ventas del día", value: fmt(total), icon: DollarSign },
    { label: "Tickets", value: String(sales.length), icon: Receipt },
    { label: "Ticket promedio", value: fmt(avg), icon: TrendingUp },
    { label: "Más vendido", value: topItem, icon: Award },
  ];

  return (
    <div className="p-8 lg:p-12">
      <h1 className="font-display text-4xl mb-2">Dashboard</h1>
      <p className="text-muted-foreground mb-8">Resumen de operación de hoy.</p>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        {cards.map((c) => (
          <div key={c.label} className="rounded-2xl glass p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-muted-foreground uppercase tracking-wider">{c.label}</span>
              <c.icon className="size-5 text-gold" />
            </div>
            <div className="font-display text-2xl truncate">{c.value}</div>
          </div>
        ))}
      </div>
      <div className="rounded-2xl glass p-6">
        <h2 className="font-display text-xl mb-4">Ventas recientes</h2>
        {sales.length === 0 && <p className="text-muted-foreground text-sm">Aún no hay ventas registradas hoy.</p>}
        <div className="space-y-2">
          {sales.slice(0, 8).map((s) => (
            <div key={s.id} className="flex justify-between items-center p-3 rounded-xl bg-surface-2">
              <div>
                <div className="font-semibold">{s.folio}</div>
                <div className="text-xs text-muted-foreground">{new Date(s.createdAt).toLocaleTimeString("es-MX")} · {s.payment}</div>
              </div>
              <div className="font-bold gold-text">{fmt(s.total)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
