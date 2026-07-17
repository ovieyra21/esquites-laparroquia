import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useRef, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { updateKdsStatus, updateSaleItemKdsStatus } from "@/lib/sales.functions";
import { localApi } from "@/lib/api/api-client";
import {
  ChefHat,
  Clock,
  PlayCircle,
  CheckCircle2,
  BadgeCheck,
  Loader2,
  Users,
  Volume2,
  VolumeX,
  X,
  ChevronRight,
  ChevronLeft,
  CheckSquare,
  Square,
  Maximize2,
  StickyNote,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

type KdsItem = {
  id: string;
  product_name: string;
  quantity: number;
  kds_item_status: string;
  sale_item_modifiers: { modifier_name: string }[];
};

type KdsOrder = {
  id: string;
  folio: number;
  created_at: string;
  kds_status: string;
  kitchen_notes: string | null;
  customer_id: string | null;
  customers: { name: string } | null;
  sale_items: KdsItem[];
};

const STATUS_COLS = [
  {
    key: "pendiente",
    label: "Pendientes",
    icon: Clock,
    accent: "border-amber-500",
    accentBg: "bg-amber-500/10",
    badge: "bg-amber-500",
  },
  {
    key: "preparando",
    label: "En preparación",
    icon: PlayCircle,
    accent: "border-blue-500",
    accentBg: "bg-blue-500/10",
    badge: "bg-blue-500",
  },
  {
    key: "listo",
    label: "Listos",
    icon: CheckCircle2,
    accent: "border-emerald-500",
    accentBg: "bg-emerald-500/10",
    badge: "bg-emerald-500",
  },
];

function playAlert() {
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

function playDone() {
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

const AUTO_ARCHIVE_MS = 5 * 60 * 1000;

export const Route = createFileRoute("/_authenticated/cocina")({
  head: () => ({ meta: [{ title: "Monitor de Cocina · Esquites La Parroquia" }] }),
  component: KDSPage,
});

function KDSPage() {
  const qc = useQueryClient();
  const updateStatus = useServerFn(updateKdsStatus);
  const updateItemStatus = useServerFn(updateSaleItemKdsStatus);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [startOnOpen, setStartOnOpen] = useState(true);
  const [newOrderIds, setNewOrderIds] = useState<Set<string>>(new Set());
  const prevOrdersRef = useRef<string[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<KdsOrder | null>(null);
  const [itemStates, setItemStates] = useState<Record<string, string>>({});
  const wakeLockRef = useRef<any>(null);

  const { data: orders = [], isLoading } = useQuery<KdsOrder[]>({
    queryKey: ["kds-orders"],
    queryFn: async () => {
      const data = await localApi.get<any[]>('/api/sales');
      const filtered = (data ?? []).filter((o: any) => {
        const status = o.kds_status || "pendiente";
        if (status === "pendiente" || status === "preparando") return true;
        if (status === "listo") {
          const created = new Date(o.created_at).getTime();
          return Date.now() - created < AUTO_ARCHIVE_MS;
        }
        return false;
      });
      return filtered.sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    },
    refetchInterval: 10_000,
  });

  useEffect(() => {
    const currentIds = orders.map((o: any) => o.id);
    const prevIds = prevOrdersRef.current;
    prevOrdersRef.current = currentIds;
    const newIds = currentIds.filter((id) => !prevIds.includes(id));
    for (const id of newIds) {
      const order = orders.find((o: any) => o.id === id);
      if (order && (!order.kds_status || order.kds_status === "pendiente")) {
        setNewOrderIds((prev) => new Set(prev).add(id));
        if (soundEnabled) playAlert();
        setTimeout(() => setNewOrderIds((prev) => { const n = new Set(prev); n.delete(id); return n; }), 8000);
      }
    }
  }, [orders, soundEnabled]);

  useEffect(() => {
    if (selectedOrder) {
      const states: Record<string, string> = {};
      for (const item of selectedOrder.sale_items || []) {
        states[item.id] = item.kds_item_status || "pendiente";
      }
      setItemStates(states);
    }
  }, [selectedOrder]);

  const requestWakeLock = useCallback(async () => {
    try {
      if ('wakeLock' in navigator) {
        wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
      }
    } catch {}
  }, []);

  const releaseWakeLock = useCallback(() => {
    try { wakeLockRef.current?.release(); wakeLockRef.current = null; } catch {}
  }, []);

  useEffect(() => {
    requestWakeLock();
    return () => releaseWakeLock();
  }, [requestWakeLock, releaseWakeLock]);

  const handleOpenOrder = useCallback(async (order: KdsOrder) => {
    setSelectedOrder(order);
    if (startOnOpen && order.kds_status === "pendiente") {
      try {
        await updateStatus({ data: { saleId: order.id, status: "preparando" } });
        qc.invalidateQueries({ queryKey: ["kds-orders"] });
      } catch {}
    }
  }, [startOnOpen, updateStatus, qc]);

  const handleToggleItem = useCallback(async (itemId: string) => {
    setItemStates((prev) => {
      const next = { ...prev };
      next[itemId] = prev[itemId] === "listo" ? "pendiente" : "listo";
      return next;
    });
  }, []);

  const handleCompleteOrder = useCallback(async () => {
    if (!selectedOrder) return;
    const itemIds = selectedOrder.sale_items.map((i) => i.id);
    try {
      await Promise.all(
        itemIds.map((id) => updateItemStatus({ data: { itemId: id, status: "listo" } }))
      );
      await updateStatus({ data: { saleId: selectedOrder.id, status: "listo" } });
      qc.invalidateQueries({ queryKey: ["kds-orders"] });
      playDone();
      toast.success("Pedido completado");
      setSelectedOrder(null);
    } catch (e: any) {
      toast.error(e.message);
    }
  }, [selectedOrder, updateItemStatus, updateStatus, qc]);

  const handleStartPrep = useCallback(async () => {
    if (!selectedOrder) return;
    try {
      await updateStatus({ data: { saleId: selectedOrder.id, status: "preparando" } });
      qc.invalidateQueries({ queryKey: ["kds-orders"] });
      toast.success("Iniciando preparación");
    } catch (e: any) {
      toast.error(e.message);
    }
  }, [selectedOrder, updateStatus, qc]);

  const handleStatus = useCallback(async (id: string, current: string) => {
    const next = current === "pendiente" ? "preparando" : "listo";
    try {
      await updateStatus({ data: { saleId: id, status: next } });
      qc.invalidateQueries({ queryKey: ["kds-orders"] });
      if (next === "listo") playDone();
      toast.success(current === "pendiente" ? "Iniciando preparación" : "¡Pedido listo!");
    } catch (e: any) {
      toast.error(e.message);
    }
  }, [updateStatus, qc]);

  const handleSwipe = useCallback((orderId: string, direction: "left" | "right") => {
    const order = orders.find((o) => o.id === orderId);
    if (!order) return;
    const current = order.kds_status || "pendiente";
    if (direction === "right") {
      const next = current === "pendiente" ? "preparando" : current === "preparando" ? "listo" : null;
      if (next) handleStatus(orderId, current);
    } else if (direction === "left") {
      const prev = current === "listo" ? "preparando" : current === "preparando" ? "pendiente" : null;
      if (prev) handleStatus(orderId, current);
    }
  }, [orders, handleStatus]);

  useEffect(() => {
    if (!selectedOrder) return;
    const allItems = selectedOrder.sale_items || [];
    const allReady = allItems.length > 0 && allItems.every((i) => itemStates[i.id] === "listo");
    if (allReady) {
      const allSaved = allItems.every((i) => i.kds_item_status === "listo");
      if (!allSaved) handleCompleteOrder();
    }
  }, [itemStates, selectedOrder, handleCompleteOrder]);

  const columns = STATUS_COLS.map((col) => ({
    ...col,
    orders: orders.filter((o: any) => (o.kds_status || "pendiente") === col.key),
  }));

  const handleMoveAllToNext = async (from: string) => {
    const targets = orders.filter((o: any) => (o.kds_status || "pendiente") === from);
    if (targets.length === 0) return;
    const next = from === "pendiente" ? "preparando" : "listo";
    try {
      await Promise.all(targets.map((o: any) => updateStatus({ data: { saleId: o.id, status: next } })));
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

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground cursor-pointer select-none">
            <input
              type="checkbox"
              checked={startOnOpen}
              onChange={(e) => setStartOnOpen(e.target.checked)}
              className="size-4 accent-gold"
            />
            Iniciar al abrir
          </label>

          <button
            onClick={() => setSoundEnabled((v) => !v)}
            className={`p-2 rounded-lg transition ${
              soundEnabled ? "bg-amber-500/20 text-amber-400" : "bg-surface-2 text-muted-foreground"
            }`}
            title={soundEnabled ? "Silenciar alertas" : "Activar sonido"}
          >
            {soundEnabled ? <Volume2 className="size-5" /> : <VolumeX className="size-5" />}
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

      <main className="flex-1 flex gap-3 p-3 lg:p-4 overflow-x-auto overflow-y-hidden bg-surface/30">
        {columns.map((col) => (
          <div
            key={col.key}
            className={`flex-1 min-w-[280px] max-w-[480px] flex flex-col rounded-2xl border-2 ${col.accent} bg-card overflow-hidden`}
          >
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
                  className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground transition px-2 py-1 rounded-lg hover:bg-surface min-h-[32px]"
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
              {col.orders.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  isNew={newOrderIds.has(order.id)}
                  onOpen={() => handleOpenOrder(order)}
                  onAction={() => handleStatus(order.id, order.kds_status || "pendiente")}
                  onSwipe={(dir) => handleSwipe(order.id, dir)}
                />
              ))}
            </div>
          </div>
        ))}
      </main>

      {selectedOrder && (
        <OrderDetailModal
          order={selectedOrder}
          itemStates={itemStates}
          onToggleItem={handleToggleItem}
          onStartPrep={handleStartPrep}
          onCompleteAll={handleCompleteOrder}
          onClose={() => setSelectedOrder(null)}
        />
      )}
    </div>
  );
}

function OrderCard({
  order,
  isNew,
  onOpen,
  onAction,
}: {
  order: KdsOrder;
  isNew: boolean;
  onOpen: () => void;
  onAction: () => void;
  onSwipe: (dir: "left" | "right") => void;
}) {
  const [elapsed, setElapsed] = useState("");
  const touchStartX = useRef(0);

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

  const handleTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX; };
  const handleTouchEnd = (e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(dx) > 80) {
      e.currentTarget.dispatchEvent(new CustomEvent('swipe', { detail: dx > 0 ? 'right' : 'left' }));
    }
  };

  return (
    <div
      className={`relative rounded-xl border transition-all cursor-pointer select-none ${
        isListo
          ? "bg-emerald-500/5 border-emerald-500/20"
          : "bg-surface border-border hover:border-muted-foreground/30"
      } ${isNew ? "ring-2 ring-amber-400/60 animate-pulse" : ""}`}
      onClick={onOpen}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
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

        <div className="mt-3 flex items-center justify-between gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); onOpen(); }}
            className="min-h-[56px] flex-1 rounded-xl bg-surface-2 hover:bg-gold/10 text-muted-foreground hover:text-gold font-semibold text-sm flex items-center justify-center gap-2 transition-all active:scale-95"
          >
            <Maximize2 className="size-4" /> Ver
          </button>
          {!isListo && (
            <button
              onClick={(e) => { e.stopPropagation(); onAction(); }}
              className={`min-h-[56px] flex-1 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all active:scale-95 ${
                status === "pendiente"
                  ? "bg-amber-500 hover:bg-amber-400 text-black"
                  : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_0_16px_rgba(16,185,129,0.25)]"
              }`}
            >
              <ActionIcon className="size-5" />
              {status === "pendiente" ? "PREPARAR" : "LISTO"}
            </button>
          )}
        </div>

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

function OrderDetailModal({
  order,
  itemStates,
  onToggleItem,
  onStartPrep,
  onCompleteAll,
  onClose,
}: {
  order: KdsOrder;
  itemStates: Record<string, string>;
  onToggleItem: (itemId: string) => void;
  onStartPrep: () => void;
  onCompleteAll: () => void;
  onClose: () => void;
}) {
  const [elapsed, setElapsed] = useState("");
  const status = order.kds_status || "pendiente";

  useEffect(() => {
    const update = () =>
      setElapsed(formatDistanceToNow(new Date(order.created_at), { addSuffix: false, locale: es }));
    update();
    const interval = setInterval(update, 5000);
    return () => clearInterval(interval);
  }, [order.created_at]);

  const allItems = order.sale_items || [];
  const allReady = allItems.length > 0 && allItems.every((i) => itemStates[i.id] === "listo");

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-2 md:p-4">
      <div className="w-full max-w-2xl max-h-[95vh] bg-card rounded-2xl border-2 border-gold/30 flex flex-col overflow-hidden shadow-2xl">
        <div className="shrink-0 p-4 md:p-6 border-b border-border flex items-center justify-between bg-gradient-to-r from-gold/5 to-transparent">
          <div className="flex items-center gap-3 md:gap-4">
            <span className="font-mono font-black text-3xl md:text-4xl text-gold">#{order.folio}</span>
            {order.customers?.name && (
              <div className="flex items-center gap-1.5 text-base md:text-lg text-muted-foreground">
                <Users className="size-5" />
                <span className="font-semibold">{order.customers.name}</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-base md:text-lg text-muted-foreground">
              <Clock className="size-5" />
              <span className="font-mono font-bold">{elapsed}</span>
            </div>
            <button
              onClick={onClose}
              className="min-h-[56px] min-w-[56px] flex items-center justify-center rounded-xl bg-surface-2 hover:bg-destructive/10 hover:text-destructive transition"
            >
              <X className="size-6" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
          {order.kitchen_notes && (
            <div className="bg-yellow-400/20 border-2 border-yellow-400/40 rounded-xl p-4">
              <div className="flex items-center gap-2 text-yellow-300 font-bold text-sm mb-1">
                <StickyNote className="size-4" /> NOTAS DE PREPARACIÓN
              </div>
              <p className="text-yellow-100 text-lg md:text-xl font-medium">{order.kitchen_notes}</p>
            </div>
          )}

          <div className="space-y-2">
            <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Productos</h3>
            {allItems.map((item) => {
              const isReady = itemStates[item.id] === "listo";
              return (
                <button
                  key={item.id}
                  onClick={() => onToggleItem(item.id)}
                  className={`w-full flex items-center gap-3 md:gap-4 p-3 md:p-4 rounded-xl border-2 text-left transition-all active:scale-[0.98] min-h-[56px] ${
                    isReady
                      ? "bg-emerald-500/10 border-emerald-500/40"
                      : "bg-surface border-border hover:border-gold/40"
                  }`}
                >
                  <div className="shrink-0">
                    {isReady ? (
                      <CheckSquare className="size-7 md:size-8 text-emerald-400" />
                    ) : (
                      <Square className="size-7 md:size-8 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="shrink-0 bg-surface-2 text-gold font-black text-lg min-w-[2.2rem] text-center rounded-lg py-0.5">
                        {item.quantity}
                      </span>
                      <span className={`text-lg md:text-xl font-bold ${isReady ? "text-emerald-400 line-through" : "text-foreground"}`}>
                        {item.product_name}
                      </span>
                    </div>
                    {item.sale_item_modifiers?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-1.5 ml-[2.8rem]">
                        {item.sale_item_modifiers.map((m, mi) => (
                          <span key={mi} className="text-xs md:text-sm bg-gold/10 text-gold px-2 py-0.5 rounded font-medium border border-gold/20">
                            {m.modifier_name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="shrink-0 p-4 md:p-6 border-t border-border bg-surface/50">
          <div className="flex gap-3">
            {status === "pendiente" && (
              <button
                onClick={onStartPrep}
                className="min-h-[56px] flex-1 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-base md:text-lg flex items-center justify-center gap-2 transition-all active:scale-95"
              >
                <PlayCircle className="size-6" /> Iniciar preparación
              </button>
            )}
            {!allReady && (
              <button
                onClick={onCompleteAll}
                className="min-h-[56px] flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-base md:text-lg flex items-center justify-center gap-2 transition-all active:scale-95 shadow-[0_0_16px_rgba(16,185,129,0.25)]"
              >
                <CheckCircle2 className="size-6" /> Marcar todo listo
              </button>
            )}
            <button
              onClick={onClose}
              className="min-h-[56px] px-6 rounded-xl bg-surface-2 hover:bg-surface text-muted-foreground hover:text-foreground font-bold text-base md:text-lg flex items-center justify-center gap-2 transition-all active:scale-95"
            >
              Cerrar
            </button>
          </div>
        </div>
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
