import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { updateKdsStatus } from "@/lib/sales.functions";
import {
  ChefHat,
  Clock,
  PlayCircle,
  CheckCircle2,
  BadgeCheck,
  Loader2,
  Users,
  AlertTriangle,
  Volume2,
  VolumeX,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

type KdsOrder = {
  id: string;
  folio: number;
  created_at: string;
  kds_status: string;
  customer_id: string | null;
  customers: { name: string } | null;
  sale_items: {
    id: string;
    product_name: string;
    quantity: number;
    sale_item_modifiers: { modifier_name: string }[];
  }[];
};

const STATUS_COLS = [
  {
    key: "pendiente",
    label: "Pendientes",
    icon: Clock,
    accent: "border-amber-500",
    accentBg: "bg-amber-500/10",
    badge: "bg-amber-500",
    btn: "bg-amber-500 hover:bg-amber-400 text-black",
  },
  {
    key: "preparando",
    label: "En preparación",
    icon: PlayCircle,
    accent: "border-blue-500",
    accentBg: "bg-blue-500/10",
    badge: "bg-blue-500",
    btn: "bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_0_16px_rgba(16,185,129,0.25)]",
  },
  {
    key: "listo",
    label: "Listos",
    icon: CheckCircle2,
    accent: "border-emerald-500",
    accentBg: "bg-emerald-500/10",
    badge: "bg-emerald-500",
    btn: "",
  },
];

function playAlertSound() {
  try {
    const ctx = new AudioContext();
    const now = ctx.currentTime;
    [880, 1100, 880].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "square";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.08, now + i * 0.15);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.15 + 0.12);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + i * 0.15);
      osc.stop(now + i * 0.15 + 0.15);
    });
  } catch {}
}

export const Route = createFileRoute("/_authenticated/cocina")({
  head: () => ({ meta: [{ title: "Monitor de Cocina · Esquites La Parroquia" }] }),
  component: KDSPage,
});

function KDSPage() {
  const qc = useQueryClient();
  const updateStatus = useServerFn(updateKdsStatus);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [newOrderIds, setNewOrderIds] = useState<Set<string>>(new Set());

  const { data: orders = [], isLoading } = useQuery<KdsOrder[]>({
    queryKey: ["kds-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sales")
        .select(`
          id, folio, created_at, kds_status, customer_id,
          customers (name),
          sale_items (id, product_name, quantity, sale_item_modifiers (modifier_name))
        `)
        .or(
          "kds_status.in.(pendiente,preparando),and(kds_status.eq.listo,created_at.gte." +
            new Date(Date.now() - 30 * 60 * 1000).toISOString() +
            ")"
        )
        .order("created_at", { ascending: true });

      if (error) throw error;
      return (data ?? []).map((o: any) => ({ ...o, kds_status: o.kds_status || "pendiente" }));
    },
    refetchInterval: 15_000,
  });

  // Real-time
  useEffect(() => {
    const channel = supabase
      .channel("kds_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "sales" }, (payload: any) => {
        qc.invalidateQueries({ queryKey: ["kds-orders"] });
        if (payload.eventType === "INSERT" && (!payload.new.kds_status || payload.new.kds_status === "pendiente")) {
          setNewOrderIds((prev) => new Set(prev).add(payload.new.id));
          if (soundEnabled) playAlertSound();
          setTimeout(() => setNewOrderIds((prev) => { const n = new Set(prev); n.delete(payload.new.id); return n; }), 8000);
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [qc, soundEnabled]);

  const columns = STATUS_COLS.map((col) => ({
    ...col,
    orders: orders.filter((o) => o.kds_status === col.key),
  }));

  const handleStatus = async (id: string, current: string) => {
    const next = current === "pendiente" ? "preparando" : "listo";
    try {
      await updateStatus({ data: { saleId: id, status: next } });
      qc.invalidateQueries({ queryKey: ["kds-orders"] });
      if (next === "listo") {
        try {
          const ctx = new AudioContext();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sine";
          osc.frequency.value = 660;
          gain.gain.setValueAtTime(0.1, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
          osc.connect(gain).connect(ctx.destination);
          osc.start(); osc.stop(ctx.currentTime + 0.5);
        } catch {}
      }
      toast.success(current === "pendiente" ? "Iniciando preparación" : "¡Pedido listo para entregar!");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleMoveAllToNext = async (from: string) => {
    const targets = orders.filter((o) => o.kds_status === from);
    if (targets.length === 0) return;
    const next = from === "pendiente" ? "preparando" : "listo";
    try {
      await Promise.all(targets.map((o) => updateStatus({ data: { saleId: o.id, status: next } })));
      qc.invalidateQueries({ queryKey: ["kds-orders"] });
      toast.success(`${targets.length} pedidos → ${next === "listo" ? "Listos" : "En preparación"}`);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh] text-muted-foreground">
        <Loader2 className="size-10 animate-spin text-gold" />
      </div>
    );
  }

  const totalActive = columns[0].orders.length + columns[1].orders.length;

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <header className="shrink-0 px-4 lg:px-6 py-3 bg-card border-b border-border flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-gold p-2 rounded-lg">
            <ChefHat className="text-primary-foreground size-5 lg:size-6" />
          </div>
          <div>
            <h1 className="font-display text-lg lg:text-2xl leading-none text-foreground">Monitor de Cocina</h1>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Esquites La Parroquia</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={() => setSoundEnabled((v) => !v)}
            className={`p-2 rounded-lg transition ${
              soundEnabled ? "bg-amber-500/20 text-amber-400" : "bg-surface-2 text-muted-foreground"
            }`}
            title={soundEnabled ? "Silenciar alertas" : "Activar sonido"}
          >
            {soundEnabled ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />}
          </button>

          <div className="hidden sm:flex items-center gap-4">
            <Stat label="Pendientes" value={columns[0].orders.length} color="text-amber-400" />
            <div className="h-6 w-px bg-border" />
            <Stat label="Preparando" value={columns[1].orders.length} color="text-blue-400" />
            <div className="h-6 w-px bg-border" />
            <Stat label="Listos" value={columns[2].orders.length} color="text-emerald-400" />
          </div>

          {totalActive === 0 && (
            <div className="flex items-center gap-2 text-emerald-500/60">
              <BadgeCheck className="size-5" />
              <span className="text-sm font-medium hidden sm:inline">Todo al día</span>
            </div>
          )}
        </div>
      </header>

      {/* Kanban Columns */}
      <main className="flex-1 flex gap-3 p-3 lg:p-4 overflow-x-auto overflow-y-hidden bg-surface/30">
        {columns.map((col) => (
          <div
            key={col.key}
            className={`flex-1 min-w-[280px] max-w-[480px] flex flex-col rounded-2xl border-2 ${col.accent} bg-card overflow-hidden`}
          >
            {/* Column header */}
            <div className={`shrink-0 px-4 py-3 flex items-center justify-between ${col.accentBg}`}>
              <div className="flex items-center gap-2">
                <col.icon className="size-4 opacity-60" />
                <h2 className="font-display text-sm lg:text-base font-bold">{col.label}</h2>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${col.badge} text-white`}>
                  {col.orders.length}
                </span>
              </div>
              {col.key !== "listo" && col.orders.length > 1 && (
                <button
                  onClick={() => handleMoveAllToNext(col.key)}
                  className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground transition px-2 py-1 rounded-lg hover:bg-surface"
                >
                  Todos →
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-2">
              {col.orders.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full opacity-20 select-none py-8">
                  <col.icon className="size-12 mb-2" />
                  <p className="text-xs font-medium">Sin pedidos</p>
                </div>
              )}
              {col.orders.map((order, idx) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  isNew={newOrderIds.has(order.id)}
                  btnClass={col.btn}
                  onAction={() => handleStatus(order.id, order.kds_status || "pendiente")}
                />
              ))}
            </div>
          </div>
        ))}
      </main>
    </div>
  );
}

function OrderCard({
  order,
  isNew,
  btnClass,
  onAction,
}: {
  order: KdsOrder;
  isNew: boolean;
  btnClass: string;
  onAction: () => void;
}) {
  const [elapsed, setElapsed] = useState("");

  useEffect(() => {
    const update = () =>
      setElapsed(formatDistanceToNow(new Date(order.created_at), { addSuffix: false, locale: es }));
    update();
    const interval = setInterval(update, 5000);
    return () => clearInterval(interval);
  }, [order.created_at]);

  const ageMs = Date.now() - new Date(order.created_at).getTime();
  const isOld = ageMs > 10 * 60 * 1000;
  const status = order.kds_status || "pendiente";
  const isListo = status === "listo";
  const ActionIcon = status === "pendiente" ? PlayCircle : CheckCircle2;

  return (
    <div
      className={`relative rounded-xl border transition-all ${
        isListo
          ? "bg-emerald-500/5 border-emerald-500/20"
          : "bg-surface border-border hover:border-muted-foreground/30"
      } ${isNew ? "ring-2 ring-amber-400/60 animate-pulse" : ""}`}
    >
      {isNew && (
        <div className="absolute -top-2 -right-2 z-10">
          <span className="px-2 py-0.5 rounded-full bg-amber-500 text-black text-[10px] font-black uppercase animate-bounce">
            ¡Nuevo!
          </span>
        </div>
      )}

      {isOld && !isListo && (
        <div className="bg-red-600 text-white text-[10px] font-black uppercase text-center py-0.5 tracking-widest animate-pulse rounded-t-xl">
          ⚠ Urgente — {Math.floor(ageMs / 60000)} min
        </div>
      )}

      <div className="p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="font-mono font-black text-lg lg:text-xl text-gold">#{order.folio}</span>
            {order.customers?.name && (
              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                <Users className="size-3" /> {order.customers.name}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="size-3" />
            <span className={isOld ? "text-red-500 font-bold" : ""}>{elapsed}</span>
          </div>
        </div>

        <div className="space-y-1.5">
          {order.sale_items?.map((item) => (
            <div key={item.id} className="flex items-start gap-2">
              <span className="shrink-0 bg-surface-2 text-gold font-black text-sm min-w-[1.8rem] text-center rounded-md py-0.5">
                {item.quantity}
              </span>
              <div className="min-w-0">
                <span className="text-sm font-semibold leading-tight">{item.product_name}</span>
                {item.sale_item_modifiers?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-0.5">
                    {item.sale_item_modifiers.map((m, mi) => (
                      <span key={mi} className="text-[10px] bg-gold/10 text-gold px-1.5 py-0.5 rounded font-medium border border-gold/20">
                        {m.modifier_name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {!isListo && (
          <button onClick={onAction} className={`mt-3 w-full py-3 rounded-lg font-black text-sm flex items-center justify-center gap-2 transition-all active:scale-95 ${btnClass}`}>
            <ActionIcon className="size-4" />
            {status === "pendiente" ? "PREPARAR" : "LISTO"}
          </button>
        )}

        {isListo && (
          <div className="mt-3 flex items-center justify-center gap-2 text-emerald-500 text-sm font-bold">
            <BadgeCheck className="size-4" />
            Listo para entregar
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="text-right">
      <div className="text-[10px] text-muted-foreground uppercase">{label}</div>
      <div className={`text-lg font-bold ${color}`}>{value}</div>
    </div>
  );
}
