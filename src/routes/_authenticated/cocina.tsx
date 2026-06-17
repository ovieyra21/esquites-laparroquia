
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { updateKdsStatus } from "@/lib/sales.functions";
import {
    Timer, CheckCircle2, PlayCircle, Clock,
    ChefHat, AlertTriangle, Loader2
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

export const Route = createFileRoute("/_authenticated/cocina")({
    head: () => ({ meta: [{ title: "Cocina (KDS) · Esquites La Parroquia" }] }),
    component: KDSPage
});

function KDSPage() {
    const qc = useQueryClient();
    const updateStatus = useServerFn(updateKdsStatus);

    const { data: orders, isLoading } = useQuery({
        queryKey: ["kds-orders"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("sales")
                .select(`
          id, folio, created_at, kds_status,
          sale_items (id, product_name, quantity, sale_item_modifiers (modifier_name))
        `)
                .in("kds_status", ["pendiente", "preparando"])
                .order("created_at", { ascending: true });
            if (error) throw error;
            return data;
        }
    });

    useEffect(() => {
        const channel = supabase
            .channel("kds_changes")
            .on("postgres_changes", { event: "*", schema: "public", table: "sales" }, () => {
                qc.invalidateQueries({ queryKey: ["kds-orders"] });
                // Play sound on new entry? 
                // new Audio('/new-order.mp3').play().catch(() => {});
            })
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [qc]);

    const handleStatus = async (id: string, current: string) => {
        const next = current === "pendiente" ? "preparando" : "listo";
        try {
            await updateStatus({ data: { saleId: id, status: next } });
            qc.invalidateQueries({ queryKey: ["kds-orders"] });
            if (next === "listo") toast.success("Pedido listo para entrega");
        } catch (e: any) {
            toast.error(e.message);
        }
    };

    if (isLoading) return <div className="p-10 flex flex-col items-center gap-4 text-muted-foreground"><Loader2 className="size-10 animate-spin text-gold" /> Cargando pedidos...</div>;

    return (
        <div className="h-screen flex flex-col bg-slate-950 text-white overflow-hidden">
            <header className="p-4 bg-slate-900 border-b border-slate-800 flex justify-between items-center shadow-2xl">
                <div className="flex items-center gap-3">
                    <div className="bg-gold p-2 rounded-lg">
                        <ChefHat className="text-black size-6" />
                    </div>
                    <div>
                        <h1 className="font-display text-2xl leading-none">Monitor de Cocina</h1>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-1">Esquites La Parroquia · Real-time</p>
                    </div>
                </div>
                <div className="flex items-center gap-6">
                    <div className="text-right">
                        <div className="text-xs text-muted-foreground uppercase">Pendientes</div>
                        <div className="text-2xl font-bold text-gold">{orders?.filter(o => o.kds_status === 'pendiente').length}</div>
                    </div>
                    <div className="h-8 w-px bg-slate-800" />
                    <div className="text-right">
                        <div className="text-xs text-muted-foreground uppercase">Preparando</div>
                        <div className="text-2xl font-bold text-success">{orders?.filter(o => o.kds_status === 'preparando').length}</div>
                    </div>
                </div>
            </header>

            <main className="min-h-screen bg-[radial-gradient(ellipse_at_top,var(--tw-gradient-stops))] from-slate-900 via-purple-900 to-slate-900 p-4 md:p-8 overflow-hidden">
                {orders?.length === 0 && (
                    <div className="w-full flex flex-col items-center justify-center opacity-30 select-none">
                        <ChefHat className="size-32 mb-4" />
                        <p className="text-2xl font-display">No hay pedidos activos</p>
                    </div>
                )}
                {orders?.map(order => (
                    <OrderCard
                        key={order.id}
                        order={order}
                        onNext={() => handleStatus(order.id, order.kds_status || "pendiente")}
                    />
                ))}
            </main>
        </div>
    );
}

function OrderCard({ order, onNext }: any) {
    const [elapsed, setElapsed] = useState("");

    useEffect(() => {
        const update = () => setElapsed(formatDistanceToNow(new Date(order.created_at), { addSuffix: false, locale: es }));
        update();
        const interval = setInterval(update, 1000);
        return () => clearInterval(interval);
    }, [order.created_at]);

    const isOld = (Date.now() - new Date(order.created_at).getTime()) > 10 * 60 * 1000; // 10 mins

    return (
        <div className={`w-[320px] shrink-0 flex flex-col rounded-2xl border-2 overflow-hidden shadow-2xl transition-all ${order.kds_status === 'preparando' ? 'border-success bg-slate-900' : 'border-slate-800 bg-slate-900/50'}`}>
            <div className={`p-3 flex justify-between items-center ${order.kds_status === 'preparando' ? 'bg-success/10' : 'bg-slate-800/50'}`}>
                <div>
                    <div className="text-[10px] uppercase text-muted-foreground font-bold">Folio</div>
                    <div className="text-2xl font-display font-black">#{String(order.folio).padStart(4, '0')}</div>
                </div>
                <div className="text-right">
                    <div className={`flex items-center gap-1 text-sm font-mono ${isOld ? 'text-destructive animate-pulse' : 'text-gold'}`}>
                        <Clock className="size-3" /> {elapsed}
                    </div>
                    {isOld && <div className="text-[8px] text-destructive font-bold uppercase">Urgente</div>}
                </div>
            </div>

            <div className="flex-1 p-4 space-y-4 overflow-y-auto min-h-0">
                {order.sale_items.map((item: any) => (
                    <div key={item.id} className="space-y-1">
                        <div className="flex items-start gap-2">
                            <span className="bg-slate-800 text-gold px-2 py-0.5 rounded font-bold text-lg">{item.quantity}</span>
                            <span className="text-lg font-bold leading-tight">{item.product_name}</span>
                        </div>
                        {item.sale_item_modifiers?.length > 0 && (
                            <div className="ml-9 flex flex-wrap gap-1">
                                {item.sale_item_modifiers.map((m: any, idx: number) => (
                                    <span key={idx} className="text-[10px] bg-gold/10 text-gold-soft px-2 py-0.5 rounded border border-gold/20 font-semibold">
                                        {m.modifier_name}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            <div className="p-3 bg-slate-950/50 mt-auto">
                <button
                    onClick={onNext}
                    className={`w-full py-4 rounded-xl font-black text-lg flex items-center justify-center gap-3 transition-all active:scale-95 ${order.kds_status === 'pendiente'
                        ? 'bg-gold text-black hover:bg-gold-soft'
                        : 'bg-success text-white hover:bg-success/90 shadow-[0_0_20px_rgba(34,197,94,0.3)]'
                        }`}
                >
                    {order.kds_status === 'pendiente' ? (
                        <><PlayCircle className="size-6" /> EMPEZAR</>
                    ) : (
                        <><CheckCircle2 className="size-6" /> LISTO</>
                    )}
                </button>
            </div>
        </div>
    );
}
