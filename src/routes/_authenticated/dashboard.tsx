import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { analyticsApi } from "@/lib/analytics.functions";
import { fmt } from "@/store/cart";
import {
  TrendingUp, TrendingDown, Receipt, DollarSign, Award, Target, Loader2,
  CreditCard, ArrowLeftRight, Calendar,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area,
} from "recharts";
import { Button } from "@/components/ui/button";
import { format, subDays } from "date-fns";
import { es } from "date-fns/locale";

const PERIODS = [
  { label: "Hoy", days: 0 },
  { label: "Ayer", days: 1 },
  { label: "7 días", days: 7 },
  { label: "30 días", days: 30 },
];

const methodLabels: Record<string, string> = {
  efectivo: "Efectivo",
  tarjeta: "Tarjeta",
  transferencia: "Transferencia",
  mixto: "Mixto",
};

const methodColors: Record<string, string> = {
  efectivo: "#10b981",
  tarjeta: "#3b82f6",
  transferencia: "#8b5cf6",
  mixto: "#f59e0b",
};

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard · Esquites La Parroquia" }] }),
  component: Dashboard,
});

function Dashboard() {
  const [period, setPeriod] = useState(0); // 0 = today
  const today = new Date();
  const dateTo = format(today, "yyyy-MM-dd");
  const dateFrom = format(subDays(today, period === 1 ? 1 : period || 0), "yyyy-MM-dd");

  // Today stats
  const { data: todayStats, isLoading: todayBusy } = useQuery({
    queryKey: ["dashboard-today"],
    queryFn: () => analyticsApi.getDailyStats(),
    refetchInterval: 30_000,
  });

  // Range stats
  const { data: range, isLoading: rangeBusy } = useQuery({
    queryKey: ["dashboard-range", dateFrom, dateTo],
    queryFn: () => analyticsApi.getRangeStats(dateFrom, dateTo),
  });

  // Top products
  const { data: topProducts } = useQuery({
    queryKey: ["top-products"],
    queryFn: () => analyticsApi.getTopProducts(),
  });

  const busy = todayBusy || rangeBusy;

  if (busy) {
    return (
      <div className="p-10 flex items-center gap-3 text-muted-foreground">
        <Loader2 className="size-5 animate-spin" /> Cargando métricas...
      </div>
    );
  }

  const margin = todayStats?.revenue ? ((todayStats.profit / todayStats.revenue) * 100).toFixed(1) : "0";
  const revChange = range?.revenueChange;
  const cntChange = range?.countChange;

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl lg:text-4xl">Dashboard</h1>
          <p className="text-muted-foreground text-sm">Rendimiento y rentabilidad del negocio.</p>
        </div>
        <div className="flex gap-1 bg-surface-2 rounded-xl p-1">
          {PERIODS.map((p) => (
            <button
              key={p.label}
              onClick={() => setPeriod(p.days)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                period === p.days
                  ? "bg-gold text-primary-foreground shadow"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </header>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPICard
          icon={DollarSign}
          label="Ventas totales"
          value={fmt(range?.revenue ?? 0)}
          change={revChange}
          color="text-gold"
        />
        <KPICard
          icon={Receipt}
          label="Transacciones"
          value={String(range?.count ?? 0)}
          change={cntChange}
          color="text-blue-400"
        />
        <KPICard
          icon={Target}
          label="Utilidad hoy"
          value={fmt(todayStats?.profit ?? 0)}
          sub={`Margen ${margin}%`}
          color="text-emerald-400"
        />
        <KPICard
          icon={Award}
          label="Ticket promedio"
          value={fmt(range?.avgTicket ?? 0)}
          color="text-amber-400"
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Daily trend chart */}
        <div className="lg:col-span-2 bg-card gold-border rounded-2xl p-5">
          <h2 className="font-display text-lg mb-4 flex items-center gap-2">
            <Calendar className="size-4 text-muted-foreground" />
            Ventas diarias
          </h2>
          <div className="h-[250px] w-full">
            <ResponsiveContainer>
              <BarChart data={range?.dailyData ?? []}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#333" />
                <XAxis dataKey="date" stroke="#888" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#888" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#1A1A1A", border: "1px solid #D4AF37", borderRadius: "12px", fontSize: "13px" }}
                  formatter={(value: any) => [fmt(value), "Ventas"]}
                />
                <Bar dataKey="revenue" fill="#D4AF37" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Payment breakdown */}
        <div className="bg-card gold-border rounded-2xl p-5">
          <h2 className="font-display text-lg mb-4">Método de pago</h2>
          {range?.paymentBreakdown && range.paymentBreakdown.length > 0 ? (
            <div className="space-y-3">
              {range.paymentBreakdown.map((pb) => {
                const pct = range.revenue > 0 ? (pb.total / range.revenue) * 100 : 0;
                return (
                  <div key={pb.method}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="flex items-center gap-2">
                        <span
                          className="size-2.5 rounded-full inline-block"
                          style={{ backgroundColor: methodColors[pb.method] || "#888" }}
                        />
                        {methodLabels[pb.method] || pb.method}
                      </span>
                      <span className="font-semibold">{pct.toFixed(0)}%</span>
                    </div>
                    <div className="h-2 bg-surface-2 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: methodColors[pb.method] || "#888",
                        }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{fmt(pb.total)}</p>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm text-center py-8">Sin datos</p>
          )}
        </div>
      </div>

      {/* Hourly chart + Profit */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-card gold-border rounded-2xl p-5">
          <h2 className="font-display text-lg mb-4">Ventas por hora (hoy)</h2>
          <div className="h-[220px] w-full">
            <ResponsiveContainer>
              <AreaChart data={todayStats?.chartData}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#D4AF37" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#D4AF37" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#333" />
                <XAxis dataKey="hour" stroke="#888" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#888" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#1A1A1A", border: "1px solid #D4AF37", borderRadius: "12px" }}
                  formatter={(value: any) => [fmt(value), "Ventas"]}
                />
                <Area type="monotone" dataKey="ventas" stroke="#D4AF37" fillOpacity={1} fill="url(#colorSales)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-card gold-border rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <h2 className="font-display text-lg mb-4">Rentabilidad (hoy)</h2>
            <div className="space-y-4">
              <div>
                <div className="text-xs text-muted-foreground mb-1">Margen de utilidad</div>
                <div className="font-display text-4xl gold-text">{margin}%</div>
              </div>
              <div className="space-y-2">
                <Row label="Ingresos" value={fmt(todayStats?.revenue ?? 0)} />
                <Row label="Costos" value={`-${fmt(todayStats?.cost ?? 0)}`} muted />
                <div className="h-px bg-border" />
                <Row label="Utilidad bruta" value={fmt(todayStats?.profit ?? 0)} bold accent />
              </div>
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground italic mt-4">
            * Cálculo basado en costo de insumos registrado en recetas.
          </p>
        </div>
      </div>

      {/* Top products */}
      {topProducts && topProducts.length > 0 && (
        <div className="bg-card gold-border rounded-2xl p-5">
          <h2 className="font-display text-lg mb-4">Más vendidos</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {topProducts.map((p, i) => (
              <div key={p.name} className="bg-surface-2 rounded-xl p-3 border border-border relative overflow-hidden">
                <div className="absolute top-1 right-2 text-gold/20 font-display text-3xl font-bold">#{i + 1}</div>
                <div className="font-semibold text-sm mb-1 truncate pr-10">{p.name}</div>
                <div className="text-xl font-display gold-text">{p.quantity}</div>
                <div className="text-[10px] text-muted-foreground">unidades vendidas</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function KPICard({
  icon: Icon, label, value, change, sub, color,
}: {
  icon: any; label: string; value: string; change?: number | null; sub?: string; color: string;
}) {
  return (
    <div className="bg-card gold-border rounded-2xl p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">{label}</span>
        <Icon className={`size-4 ${color}`} />
      </div>
      <div className={`font-display text-2xl truncate ${color}`}>{value}</div>
      {change != null && (
        <div className={`flex items-center gap-1 text-xs mt-1 ${change > 0 ? "text-emerald-500" : change < 0 ? "text-red-500" : "text-muted-foreground"}`}>
          {change > 0 ? <TrendingUp className="size-3" /> : change < 0 ? <TrendingDown className="size-3" /> : null}
          {change > 0 ? "+" : ""}{change.toFixed(1)}% vs período anterior
        </div>
      )}
      {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
    </div>
  );
}

function Row({ label, value, muted, bold, accent }: { label: string; value: string; muted?: boolean; bold?: boolean; accent?: boolean }) {
  return (
    <div className={`flex justify-between text-sm ${muted ? "text-muted-foreground" : ""}`}>
      <span className={bold ? "font-bold" : ""}>{label}</span>
      <span className={`${bold ? "font-bold" : ""} ${accent ? "text-emerald-400" : ""}`}>{value}</span>
    </div>
  );
}
