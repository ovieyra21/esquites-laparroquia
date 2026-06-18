
import { useEffect, useState, useCallback } from "react";
import { Wifi, WifiOff, RefreshCw, CheckCircle2, AlertCircle, Trash2, Eye, ListFilter } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { saveSale } from "@/lib/sales.functions";
import { toast } from "sonner";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { fmt } from "@/store/cart";

export function OfflineSync() {
    const [mounted, setMounted] = useState(false);
    const [isOnline, setIsOnline] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [buffer, setBuffer] = useState<any[]>([]);
    const sSale = useServerFn(saveSale);

    const loadBuffer = useCallback(() => {
        try {
            const data = JSON.parse(localStorage.getItem("buffered_sales") || "[]");
            setBuffer(data);
            return data;
        } catch {
            setBuffer([]);
            return [];
        }
    }, []);

    useEffect(() => {
        setMounted(true);
        setIsOnline(navigator.onLine);

        const handleOnline = () => {
            setIsOnline(true);
            setTimeout(() => {
                if (!syncing) syncAll();
            }, 1000);
        };
        const handleOffline = () => setIsOnline(false);

        window.addEventListener("online", handleOnline);
        window.addEventListener("offline", handleOffline);

        loadBuffer();

        return () => {
            window.removeEventListener("online", handleOnline);
            window.removeEventListener("offline", handleOffline);
        };
    }, [loadBuffer, syncing]);

    const syncAll = async () => {
        const data = loadBuffer();
        if (data.length === 0 || syncing || !navigator.onLine) return;

        setSyncing(true);
        let successCount = 0;
        const currentBuffer = [...data];
        const remaining = [];

        for (const sale of currentBuffer) {
            try {
                const { id, isBuffered, ...saleData } = sale;
                await sSale(saleData);
                successCount++;
            } catch (e) {
                console.error("Sync error for sale:", sale.folio, e);
                remaining.push({ ...sale, error: String(e) });
            }
        }

        localStorage.setItem("buffered_sales", JSON.stringify(remaining));
        setBuffer(remaining);
        setSyncing(false);

        if (successCount > 0) {
            toast.success(`Sincronización: ${successCount} venta(s) enviada(s).`, {
                icon: <CheckCircle2 className="text-emerald-500" />
            });
        }
        if (remaining.length > 0) {
            toast.error(`No se pudieron sincronizar ${remaining.length} venta(s).`, {
                description: "Revisa el historial para ver los errores.",
                icon: <AlertCircle className="text-destructive" />
            });
        }
    };

    const discardSale = (folio: string) => {
        const newBuffer = buffer.filter(s => s.folio !== folio);
        localStorage.setItem("buffered_sales", JSON.stringify(newBuffer));
        setBuffer(newBuffer);
        toast.info(`Venta ${folio} descartada.`);
    };

    const renderStatus = () => {
        if (!isOnline) {
            return (
                <div className="flex items-center gap-3 bg-destructive/90 text-white px-4 py-2 rounded-2xl shadow-xl animate-pulse backdrop-blur-md border border-white/10">
                    <WifiOff className="size-4" />
                    <div className="text-[10px] font-bold uppercase tracking-tight">Sin Conexión (Modo Offline)</div>
                </div>
            );
        }

        if (buffer.length > 0) {
            return (
                <div className="flex items-center gap-3 bg-surface/90 border border-border/50 p-1.5 pl-4 rounded-2xl shadow-xl backdrop-blur-md">
                    <div className="flex items-center gap-2">
                        <RefreshCw className={`size-4 text-gold ${syncing ? 'animate-spin' : ''}`} />
                        <span className="text-xs font-bold">{buffer.length} ventas locales</span>
                    </div>

                    <Dialog>
                        <DialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 rounded-xl px-3 hover:bg-surface-2 text-[10px] font-bold uppercase">
                                Gestionar
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl bg-surface border-border">
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-2 font-display">
                                    <Wifi className="size-5 text-emerald-500" />
                                    Sincronización de Ventas
                                </DialogTitle>
                            </DialogHeader>

                            <ScrollArea className="h-[400px] mt-4 rounded-xl border border-border bg-surface-2/30">
                                <Table>
                                    <TableHeader className="bg-surface-2 top-0 sticky z-10">
                                        <TableRow>
                                            <TableHead className="w-24">Folio</TableHead>
                                            <TableHead>Fecha</TableHead>
                                            <TableHead>Total</TableHead>
                                            <TableHead>Estado</TableHead>
                                            <TableHead className="text-right">Acciones</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {buffer.map((sale) => (
                                            <TableRow key={sale.folio}>
                                                <TableCell className="font-mono text-xs font-bold">{sale.folio}</TableCell>
                                                <TableCell className="text-xs opacity-70">
                                                    {new Date(sale.createdAt).toLocaleTimeString()}
                                                </TableCell>
                                                <TableCell className="font-bold">{fmt(sale.total)}</TableCell>
                                                <TableCell>
                                                    {sale.error ? (
                                                        <Badge variant="destructive" className="text-[10px]">Error</Badge>
                                                    ) : (
                                                        <Badge variant="secondary" className="text-[10px]">Pendiente</Badge>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right flex justify-end gap-2 text-muted-foreground">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-destructive hover:bg-destructive/10"
                                                        onClick={() => discardSale(sale.folio)}
                                                    >
                                                        <Trash2 className="size-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </ScrollArea>

                            <div className="flex justify-between items-center mt-6">
                                <div className="text-[9px] text-muted-foreground uppercase font-bold tracking-[0.2em] max-w-[60%]">
                                    {isOnline ? "Conexión detectada. Sincronización automática activa." : "Sin internet. Las ventas se guardan localmente para envío posterior."}
                                </div>
                                <Button
                                    onClick={syncAll}
                                    disabled={syncing || !isOnline}
                                    className="bg-gold hover:bg-gold/90 text-black font-bold rounded-xl h-10 px-6"
                                >
                                    {syncing ? <RefreshCw className="size-4 mr-2 animate-spin" /> : <RefreshCw className="size-4 mr-2" />}
                                    Sincronizar
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>
            );
        }

        return (
            <div className="opacity-20 hover:opacity-100 transition-opacity flex items-center gap-2 bg-emerald-500/10 text-emerald-500 px-3 py-1.5 rounded-full border border-emerald-500/20 text-[10px] font-bold uppercase tracking-widest backdrop-blur-sm">
                <Wifi className="size-3" /> Sistema en línea • {new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
            </div>
        );
    };

    return (
        <div className="fixed bottom-4 left-4 z-100">
            {mounted ? renderStatus() : null}
        </div>
    );
}
