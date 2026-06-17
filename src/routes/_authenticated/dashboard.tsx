
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { analyticsApi } from "@/lib/analytics.functions";
import { fmt } from "@/store/cart";
import { TrendingUp, Receipt, DollarSign, Award, Target, Loader2, PieChart } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area
} from "recharts";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Cálculo de Utilidad · Esquites La Parroquia" }] }),
  component: Dashboard
});

function Dashboard() {
  const { data: stats, isLoading: statsBusy } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: () => analyticsApi.getDailyStats(),
    refetchInterval: 30_000,
  });

  const { data: topProducts, isLoading: topBusy } = useQuery({
    queryKey: ["top-products"],
    queryFn: () => analyticsApi.getTopProducts(),
  });

  if (statsBusy || topBusy) {
    return <div className="p-10 flex items-center gap-3 text-muted-foreground"><Loader2 className="size-5 animate-spin" /> Cargando métricas...</div>;
  }

  const cards = [
    { label: "Ventas del día", value: fmt(stats?.revenue || 0), icon: DollarSign, color: "text-gold" },
    { label: "Utilidad bruta", value: fmt(stats?.profit || 0), icon: Target, color: "text-success" },
    { label: "Tickets", value: String(stats?.count || 0), icon: Receipt, color: "text-muted-foreground" },
    { label: "Bestseller", value: topProducts?.[0]?.name || "—", icon: Award, color: "text-gold-soft" },
  ];

  const margin = stats?.revenue ? ((stats.profit / stats.revenue) * 100).toFixed(1) : "0";

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto space-y-8">
      <header>
        <h1 className="font-display text-4xl mb-2">Dashboard</h1>
        <p className="text-muted-foreground">Análisis de rendimiento y rentabilidad.</p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-2xl bg-card gold-border p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">{c.label}</span>
              <c.icon className={`size-5 ${c.color}`} />
            </div>
            <div className="font-display text-2xl truncate">{c.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Chart */}
        <div className="lg:col-span-2 bg-card gold-border rounded-3xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-display text-xl">Ventas por Hora</h2>
            <div className="text-xs px-3 py-1 bg-surface-2 rounded-full border border-border">Hoy</div>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats?.chartData}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#D4AF37" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#D4AF37" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#333" />
                <XAxis dataKey="hour" stroke="#888" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#1A1A1A", border: "1px solid #D4AF37", borderRadius: "12px" }}
                  formatter={(value: any) => [fmt(value), "Ventas"]}
                />
                <Area type="monotone" dataKey="ventas" stroke="#D4AF37" fillOpacity={1} fill="url(#colorSales)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Profit Analysis */}
        <div className="bg-card gold-border rounded-3xl p-6 flex flex-col justify-between">
          <div>
            <h2 className="font-display text-xl mb-6">Rentabilidad</h2>
            <div className="space-y-6">
              <div>
                <div className="text-sm text-muted-foreground mb-1">Margen de utilidad</div>
                <div className="font-display text-5xl gold-text">{margin}%</div>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Ingresos</span>
                  <span className="font-semibold">{fmt(stats?.revenue || 0)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Costos (COGS)</span>
                  <span className="font-semibold text-destructive">-{fmt(stats?.cost || 0)}</span>
                </div>
                <div className="h-px bg-border" />
                <div className="flex justify-between text-sm">
                  <span className="font-bold">Utilidad Bruta</span>
                  <span className="font-bold text-success">{fmt(stats?.profit || 0)}</span>
                </div>
              </div>
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground mt-4 italic">
            * Cálculo basado en el costo de insumos registrado en recetas.
          </p>
        </div>
      </div>

      {/* Top Products */}
      <div className="bg-card gold-border rounded-3xl p-6">
        <h2 className="font-display text-xl mb-6">Productos Destacados</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {topProducts?.map((p, i) => (
            <div key={p.name} className="bg-surface-2 rounded-2xl p-4 border border-border relative overflow-hidden">
              <div className="absolute top-2 right-3 text-gold/30 font-display text-4xl font-bold">#{i + 1}</div>
              <div className="font-semibold mb-1 truncate pr-8">{p.name}</div>
              <div className="text-2xl font-display gold-text">{p.quantity}</div>
              <div className="text-xs text-muted-foreground">Vendidos</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
