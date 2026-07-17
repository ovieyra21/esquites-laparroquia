import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useCallback } from "react";
import {
  getCurrentRegister,
  openCashRegister,
  closeCashRegister,
  addCashMovement,
  deleteCashMovement,
  updateCashMovement,
  getRegisterHistory,
  getCashCutDetail,
} from "@/lib/cash.functions";
import { getPrintSettings } from "@/lib/settings.functions";
import { smartPrintCorte } from "@/lib/escpos";
import { DenominationCounter, type Breakdown } from "@/components/DenominationCounter";

// ─── Importaciones de UI ──────────────────────────────────────────────────────
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  Loader2,
  Wallet,
  ShoppingCart,
  ArrowDownCircle,
  ArrowUpCircle,
  Lock,
  DollarSign,
  TrendingUp,
  Receipt,
  CreditCard,
  ArrowLeftRight,
  History,
  ChevronDown,
  ChevronRight,
  Printer,
  Monitor,
  Pencil,
  Trash2,
} from "lucide-react";

// ─── Route ──────────────────────────────────────────────────────────────────
export const Route = createFileRoute("/_authenticated/caja")({
  head: () => ({ meta: [{ title: "Caja · Esquites La Parroquia" }] }),
  component: CajaPage,
});

// ─── Helpers ────────────────────────────────────────────────────────────────

// Formateador de moneda
const fmt = (v: number) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(v);

// Función segura para formatear fechas
function safeFormatDate(dateStr: string | null | undefined, formatStr: string = "dd MMM yyyy · HH:mm"): string {
  if (!dateStr) return "Fecha no disponible";
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "Fecha inválida";
    return format(date, formatStr, { locale: es });
  } catch {
    return "Fecha inválida";
  }
}

function safeFormatDateShort(dateStr: string | null | undefined): string {
  return safeFormatDate(dateStr, "dd MMM yyyy");
}

function safeFormatTime(dateStr: string | null | undefined): string {
  return safeFormatDate(dateStr, "HH:mm");
}

// Función para obtener valor numérico seguro
function safeNumber(value: any): number {
  if (value === null || value === undefined || value === '') return 0;
  return parseFloat(String(value)) || 0;
}

/** Imprime el corte vía proxy ESC/POS; si no está disponible, abre la vista de impresión por navegador. */
async function printCorteSmart(registerId: string, navigate: (o: { to: string }) => void) {
  try {
    const [detail, ps] = await Promise.all([
      getCashCutDetail({ data: { registerId } }),
      getPrintSettings(),
    ]);
    const mode = await smartPrintCorte(detail as any, ps as any);
    if (mode === "browser") navigate({ to: `/corte/${registerId}` });
  } catch {
    navigate({ to: `/corte/${registerId}` });
  }
}

// ─── Componente Principal ──────────────────────────────────────────────────
function CajaPage() {
  const qc = useQueryClient();
  
  const { data, isLoading } = useQuery({
    queryKey: ["cash-register-current"],
    queryFn: () => getCurrentRegister(),
    refetchInterval: 15_000,
  });

  const [openDialog, setOpenDialog] = useState(false);
  const [closeDialog, setCloseDialog] = useState(false);
  const [moveDialog, setMoveDialog] = useState<"entrada" | "salida" | null>(null);
  const navigate = useNavigate();

  const invalidate = () => qc.invalidateQueries({ queryKey: ["cash-register-current"] });

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
    const key = e.key.toLowerCase();
    if ((e.ctrlKey || e.metaKey) && key === "e" && data?.register) {
      e.preventDefault();
      setMoveDialog("entrada");
    } else if ((e.ctrlKey || e.metaKey) && key === "s" && data?.register) {
      e.preventDefault();
      setMoveDialog("salida");
    } else if ((e.ctrlKey || e.metaKey) && key === "x" && data?.register) {
      e.preventDefault();
      setCloseDialog(true);
    } else if ((e.ctrlKey || e.metaKey) && key === "p") {
      e.preventDefault();
      navigate({ to: "/pos" });
    }
  }, [data, navigate]);

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  if (isLoading) {
    return (
      <div className="p-10 flex items-center gap-3 text-muted-foreground">
        <Loader2 className="size-5 animate-spin" /> Cargando...
      </div>
    );
  }

  const registerOpen = !!data?.register;
  const summary = data?.summary as any;
  const reg = data?.register as any;
  const totalSales = safeNumber(summary?.sales_cash) + safeNumber(summary?.sales_card) + safeNumber(summary?.sales_transfer);
  const expected = safeNumber(summary?.expected_cash);
  const cashFloat = safeNumber(reg?.opening_amount);

  return (
    <div className={registerOpen ? "p-4 lg:p-6 max-w-6xl mx-auto space-y-6" : "p-6 lg:p-10 max-w-3xl mx-auto space-y-6"}>
      {registerOpen ? (
        <>
          {/* Header */}
          <header className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="font-display text-3xl">Caja</h1>
              <p className="text-sm text-muted-foreground">
                Abierta el {safeFormatDate(reg.opened_at)}
              </p>
              <p className="text-[10px] text-muted-foreground/50 mt-0.5">
                Ctrl+E entrada · Ctrl+S salida · Ctrl+X cerrar · Ctrl+P POS
              </p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button onClick={() => navigate({ to: "/pos" })} variant="outline">
                <ShoppingCart className="size-4 mr-1" /> Ir al POS
              </Button>
              <Button
                onClick={() => setMoveDialog("entrada")}
                className="bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-600 border border-emerald-600/40"
              >
                <ArrowDownCircle className="size-4 mr-1" /> Entrada
              </Button>
              <Button
                onClick={() => setMoveDialog("salida")}
                className="bg-red-600/20 hover:bg-red-600/30 text-red-600 border border-red-600/40"
              >
                <ArrowUpCircle className="size-4 mr-1" /> Salida
              </Button>
              <Button
                onClick={() => setCloseDialog(true)}
                className="bg-linear-to-r from-gold to-gold-soft text-primary-foreground font-bold"
              >
                <Lock className="size-4 mr-1" /> Cerrar caja
              </Button>
            </div>
          </header>

          {/* Quick Overview */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <MiniStat icon={DollarSign} label="Fondo inicial" value={fmt(cashFloat)} color="text-slate-400" />
            <MiniStat icon={TrendingUp} label="Total vendido" value={fmt(totalSales)} color="text-emerald-500" />
            <MiniStat icon={Receipt} label="Tickets" value={String(safeNumber(summary?.sales_count))} color="text-blue-400" />
            <MiniStat icon={DollarSign} label="Efectivo esperado" value={fmt(expected)} color="text-amber-400" />
            <MiniStat icon={Wallet} label="En caja (est.)" value={fmt(expected)} color="text-amber-500" />
          </div>

          <Tabs defaultValue="resumen">
            <TabsList>
              <TabsTrigger value="resumen">Resumen</TabsTrigger>
              <TabsTrigger value="movimientos">Movimientos</TabsTrigger>
              <TabsTrigger value="historial">
                <History className="size-3 mr-1" /> Historial de cortes
              </TabsTrigger>
            </TabsList>

            <TabsContent value="resumen" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <MethodCard icon={DollarSign} label="Ventas en efectivo" value={safeNumber(summary?.sales_cash)} color="emerald" />
                <MethodCard icon={CreditCard} label="Ventas tarjeta" value={safeNumber(summary?.sales_card)} color="blue" />
                <MethodCard icon={ArrowLeftRight} label="Ventas transferencia" value={safeNumber(summary?.sales_transfer)} color="purple" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="bg-card gold-border rounded-2xl p-4">
                  <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Entradas extra</div>
                  <div className="text-xl font-bold text-emerald-500">{fmt(safeNumber(summary?.cash_in))}</div>
                </div>
                <div className="bg-card gold-border rounded-2xl p-4">
                  <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Salidas</div>
                  <div className="text-xl font-bold text-red-500">{fmt(safeNumber(summary?.cash_out))}</div>
                </div>
              </div>
              <div className="bg-card gold-border rounded-2xl p-6 text-center">
                <div className="text-sm text-muted-foreground mb-1">Total vendido (todos los métodos)</div>
                <div className="font-display text-5xl gold-text">{fmt(totalSales)}</div>
              </div>
              {totalSales > 0 && (
                <div className="bg-card gold-border rounded-2xl p-4 space-y-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Composición de ventas</h4>
                  <div className="h-3 rounded-full bg-surface-2 overflow-hidden flex">
                    {safeNumber(summary?.sales_cash) > 0 && <div className="h-full bg-emerald-500 transition-all" style={{ width: `${(safeNumber(summary?.sales_cash) / totalSales) * 100}%` }} />}
                    {safeNumber(summary?.sales_card) > 0 && <div className="h-full bg-blue-500 transition-all" style={{ width: `${(safeNumber(summary?.sales_card) / totalSales) * 100}%` }} />}
                    {safeNumber(summary?.sales_transfer) > 0 && <div className="h-full bg-purple-500 transition-all" style={{ width: `${(safeNumber(summary?.sales_transfer) / totalSales) * 100}%` }} />}
                  </div>
                  <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><span className="size-2.5 rounded-full bg-emerald-500 inline-block" /> Efectivo</span>
                    <span className="flex items-center gap-1"><span className="size-2.5 rounded-full bg-blue-500 inline-block" /> Tarjeta</span>
                    <span className="flex items-center gap-1"><span className="size-2.5 rounded-full bg-purple-500 inline-block" /> Transferencia</span>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="movimientos" className="mt-4">
              <div className="bg-card gold-border rounded-2xl overflow-hidden">
                {data.movements.length === 0 ? (
                  <div className="p-10 text-center text-muted-foreground">Sin movimientos de efectivo.</div>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="bg-surface-2 text-left">
                      <tr>
                        <th className="p-3">Hora</th>
                        <th className="p-3">Tipo</th>
                        <th className="p-3">Concepto</th>
                        <th className="p-3 hidden sm:table-cell">Método</th>
                        <th className="p-3 text-right">Monto</th>
                        <th className="p-3 w-16" />
                      </tr>
                    </thead>
                    <tbody>
                      {data.movements.map((m: any) => (
                        <MovimientoRow key={m.id} movement={m} onDeleted={invalidate} />
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </TabsContent>

            <TabsContent value="historial" className="mt-4">
              <HistorialCortes />
            </TabsContent>
          </Tabs>

          <CashMovementDialog type={moveDialog} onClose={() => setMoveDialog(null)} onDone={invalidate} />
        </>
      ) : (
        <>
          <div className="text-center bg-card rounded-3xl gold-border p-12 space-y-4">
            <Wallet className="size-16 mx-auto text-gold" />
            <h1 className="font-display text-3xl">No hay caja abierta</h1>
            <p className="text-muted-foreground">
              Abre la caja con el monto inicial en efectivo para empezar a vender.
            </p>
            <Button onClick={() => setOpenDialog(true)} className="h-12 bg-linear-to-r from-gold to-gold-soft text-primary-foreground font-bold">
              Abrir caja
            </Button>
          </div>
          <UltimoCorte />
          <OpenCashDialog open={openDialog} onOpenChange={setOpenDialog} onDone={invalidate} />
        </>
      )}

      <CloseCashDialog
        open={closeDialog}
        onOpenChange={setCloseDialog}
        expected={expected}
        onDone={invalidate}
      />
    </div>
  );
}

// ─── Último Corte ──────────────────────────────────────────────────────────
function UltimoCorte() {
  const { data, isLoading } = useQuery({
    queryKey: ["cash-register-history"],
    queryFn: () => getRegisterHistory(),
  });
  if (isLoading) return null;
  if (!data?.length) return null;
  const last = data[0];
  const diff = safeNumber(last.difference);
  return (
    <div className="bg-card gold-border rounded-2xl p-5 space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Último corte
      </h3>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold">{safeFormatDate(last.closed_at)}</p>
          <p className="text-xs text-muted-foreground">
            Total: {fmt(safeNumber(last.total_sales_cash) + safeNumber(last.total_sales_card) + safeNumber(last.total_sales_transfer))}
          </p>
        </div>
        <span className={`text-sm font-bold ${diff === 0 ? "text-emerald-500" : diff > 0 ? "text-amber-500" : "text-red-500"}`}>
          {diff === 0 ? "✓ Cuadra" : diff > 0 ? `Sobrante ${fmt(diff)}` : `Faltante ${fmt(diff)}`}
        </span>
      </div>
    </div>
  );
}

// ─── Mini Stat ───────────────────────────────────────────────────────────────
function MiniStat({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: any;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="bg-card gold-border rounded-xl p-3">
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className={`size-3.5 ${color}`} />
        <span className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</span>
      </div>
      <div className={`text-lg font-bold ${color}`}>{value}</div>
    </div>
  );
}

// ─── Method Card ─────────────────────────────────────────────────────────────
function MethodCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: any;
  label: string;
  value: number;
  color: string;
}) {
  const colorMap: Record<string, string> = {
    emerald: "border-emerald-500/20 bg-emerald-500/5 text-emerald-600",
    blue: "border-blue-500/20 bg-blue-500/5 text-blue-600",
    purple: "border-purple-500/20 bg-purple-500/5 text-purple-600",
  };
  return (
    <div className={`rounded-2xl border p-4 ${colorMap[color] || ""}`}>
      <div className="flex items-center gap-2 mb-1">
        <Icon className="size-4 opacity-70" />
        <span className="text-xs opacity-70">{label}</span>
      </div>
      <div className="text-2xl font-bold">{fmt(value)}</div>
    </div>
  );
}

// ─── Historial ──────────────────────────────────────────────────────────────
function HistorialCortes() {
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({
    queryKey: ["cash-register-history"],
    queryFn: () => getRegisterHistory(),
  });
  const [expanded, setExpanded] = useState<string | null>(null);

  if (isLoading)
    return <div className="p-6 text-muted-foreground">Cargando...</div>;
  if (!data?.length)
    return (
      <div className="p-6 text-muted-foreground bg-card rounded-2xl gold-border text-center">
        Sin cortes anteriores.
      </div>
    );

  return (
    <div className="space-y-2">
      {data.map((r: any) => {
        const diff = safeNumber(r.difference);
        const isExpanded = expanded === r.id;
        const totalCorte = safeNumber(r.total_sales_cash) + safeNumber(r.total_sales_card) + safeNumber(r.total_sales_transfer);
        
        return (
          <div key={r.id} className="bg-card gold-border rounded-2xl overflow-hidden">
            <button
              onClick={() => setExpanded(isExpanded ? null : r.id)}
              className="w-full p-4 flex items-center justify-between hover:bg-surface/50 transition text-left"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`size-2 rounded-full ${
                    diff === 0 ? "bg-emerald-500" : diff > 0 ? "bg-amber-500" : "bg-red-500"
                  }`}
                />
                <div>
                  <div className="font-semibold text-sm">
                    Corte {safeFormatDateShort(r.closed_at)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {safeFormatTime(r.closed_at)} · Total: {fmt(totalCorte)}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`text-sm font-bold ${
                    diff === 0 ? "text-emerald-500" : diff > 0 ? "text-amber-500" : "text-red-500"
                  }`}
                >
                  {diff === 0 ? "Cuadra" : diff > 0 ? `+${fmt(diff)}` : fmt(diff)}
                </span>
                {isExpanded ? (
                  <ChevronDown className="size-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="size-4 text-muted-foreground" />
                )}
              </div>
            </button>

            {isExpanded && (
              <div className="px-4 pb-4 border-t border-border grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3">
                <Detail label="Fondo inicial" value={fmt(safeNumber(r.opening_amount))} />
                <Detail label="Ventas efectivo" value={fmt(safeNumber(r.total_sales_cash))} />
                <Detail label="Ventas tarjeta" value={fmt(safeNumber(r.total_sales_card))} />
                <Detail label="Ventas transferencia" value={fmt(safeNumber(r.total_sales_transfer))} />
                <Detail label="Esperado" value={fmt(safeNumber(r.expected_amount))} />
                <Detail label="Real" value={fmt(safeNumber(r.real_amount))} />
                <Detail
                  label="Diferencia"
                  value={fmt(diff)}
                  accent={diff !== 0}
                  accentColor={diff > 0 ? "text-amber-500" : "text-red-500"}
                />
                <Detail label="Notas" value={r.notes || "—"} />
                <div className="col-span-full flex justify-end gap-2 pt-2">
                  <Button
                    size="sm"
                    variant="default"
                    className="bg-gold hover:bg-gold/90 text-black font-bold"
                    onClick={() => printCorteSmart(r.id, navigate)}
                  >
                    <Printer className="size-3.5 mr-1" /> Imprimir corte
                  </Button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function Detail({
  label,
  value,
  accent,
  accentColor,
}: {
  label: string;
  value: string;
  accent?: boolean;
  accentColor?: string;
}) {
  return (
    <div>
      <div className="text-[10px] text-muted-foreground uppercase">{label}</div>
      <div className={`text-sm font-semibold ${accent ? accentColor : ""}`}>{value}</div>
    </div>
  );
}

// ─── MovimientoRow ──────────────────────────────────────────────────────────
function MovimientoRow({ movement, onDeleted }: { movement: any; onDeleted: () => void }) {
  const [editing, setEditing] = useState(false);
  const [concept, setConcept] = useState(movement.concept || "");
  const [amount, setAmount] = useState(safeNumber(movement.amount));
  const [deleting, setDeleting] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleSave = async () => {
    setBusy(true);
    try {
      await updateCashMovement({
        data: {
          movementId: movement.id,
          amount,
          concept: concept || "Sin concepto",
          paymentMethod: movement.payment_method,
        },
      });
      toast.success("Movimiento actualizado");
      setEditing(false);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    setBusy(true);
    try {
      await deleteCashMovement({ data: { movementId: movement.id } });
      toast.success("Movimiento eliminado");
      setDeleting(false);
      onDeleted();
    } catch (e: any) {
      toast.error(e.message);
      setDeleting(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <tr className="border-t border-border hover:bg-surface/50">
        <td className="p-3 text-muted-foreground whitespace-nowrap">
          {safeFormatTime(movement.created_at)}
        </td>
        <td className="p-3">
          <span
            className={`px-2 py-0.5 rounded text-xs font-semibold ${
              movement.type === "entrada"
                ? "bg-emerald-500/20 text-emerald-600"
                : "bg-red-500/20 text-red-600"
            }`}
          >
            {movement.type === "entrada" ? (
              <ArrowDownCircle className="size-3 inline mr-0.5" />
            ) : (
              <ArrowUpCircle className="size-3 inline mr-0.5" />
            )}
            {movement.type}
          </span>
        </td>
        <td className="p-3">
          {editing ? (
            <div className="flex gap-1 items-center">
              <Input
                value={concept}
                onChange={(e) => setConcept(e.target.value)}
                className="h-8 text-sm"
                autoFocus
              />
            </div>
          ) : (
            movement.concept || <span className="text-muted-foreground italic">—</span>
          )}
        </td>
        <td className="p-3 text-muted-foreground capitalize hidden sm:table-cell">
          {movement.payment_method || "efectivo"}
        </td>
        <td
          className={`p-3 text-right font-bold ${
            movement.type === "entrada" ? "text-emerald-500" : "text-red-500"
          }`}
        >
          {editing ? (
            <Input
              type="number"
              value={amount || ""}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="h-8 text-sm w-24 ml-auto text-right font-bold"
              step="any"
            />
          ) : (
            <>
              {movement.type === "entrada" ? "+" : "-"}
              {fmt(safeNumber(movement.amount))}
            </>
          )}
        </td>
        <td className="p-3">
          {editing ? (
            <div className="flex gap-1">
              <Button size="icon" variant="ghost" className="size-7" onClick={handleSave} disabled={busy}>
                {busy ? <Loader2 className="size-3 animate-spin" /> : <span className="text-xs font-bold">✓</span>}
              </Button>
              <Button size="icon" variant="ghost" className="size-7" onClick={() => setEditing(false)}>
                <span className="text-xs">✕</span>
              </Button>
            </div>
          ) : (
            <div className="flex gap-1">
              <Button size="icon" variant="ghost" className="size-7 text-muted-foreground hover:text-amber-500" onClick={() => { setConcept(movement.concept || ""); setAmount(safeNumber(movement.amount)); setEditing(true); }}>
                <Pencil className="size-3" />
              </Button>
              <Button size="icon" variant="ghost" className="size-7 text-muted-foreground hover:text-red-500" onClick={() => setDeleting(true)}>
                <Trash2 className="size-3" />
              </Button>
            </div>
          )}
        </td>
      </tr>
      <AlertDialog open={deleting} onOpenChange={setDeleting}>
        <AlertDialogContent className="bg-card gold-border">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar movimiento?</AlertDialogTitle>
            <AlertDialogDescription>
              {movement.concept || "Sin concepto"} — {fmt(safeNumber(movement.amount))}
              <br />
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700 text-white">
              {busy ? <Loader2 className="size-4 animate-spin" /> : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ─── Dialogs ─────────────────────────────────────────────────────────────────

function OpenCashDialog({
  open,
  onOpenChange,
  onDone,
}: {
  open: boolean;
  onOpenChange: (b: boolean) => void;
  onDone: () => void;
}) {
  const [amount, setAmount] = useState(0);
  const [breakdown, setBreakdown] = useState<Breakdown>({});
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      await openCashRegister({ data: { openingAmount: amount, breakdown } });
      toast.success("Caja abierta");
      onDone();
      onOpenChange(false);
      setAmount(0);
      setBreakdown({});
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-card gold-border">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Abrir caja</DialogTitle>
        </DialogHeader>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Fondo inicial en efectivo</Label>
              <Input
                type="number"
                value={amount || ""}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="h-14 text-2xl font-bold"
                placeholder="0.00"
              />
              <p className="text-xs text-muted-foreground">
                Puedes ingresar el monto manualmente o usar el tabulador.
              </p>
            </div>
            <DialogFooter className="sm:justify-start pt-4">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button
                onClick={submit}
                disabled={busy}
                className="bg-linear-to-r from-gold to-gold-soft text-primary-foreground font-bold"
              >
                {busy ? <Loader2 className="size-4 animate-spin" /> : "Abrir caja"}
              </Button>
            </DialogFooter>
          </div>
          <div className="bg-surface-2 p-4 rounded-2xl border border-border">
            <DenominationCounter
              onTotalChange={setAmount}
              onBreakdownChange={setBreakdown}
              initialBreakdown={breakdown}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CloseCashDialog({
  open,
  onOpenChange,
  expected,
  onDone,
}: {
  open: boolean;
  onOpenChange: (b: boolean) => void;
  expected: number;
  onDone: () => void;
}) {
  const [real, setReal] = useState(0);
  const [breakdown, setBreakdown] = useState<Breakdown>({});
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [closedRegId, setClosedRegId] = useState<string | null>(null);
  const [closedDiff, setClosedDiff] = useState(0);
  const diff = real - expected;

  const navigate = useNavigate();

  const submit = async () => {
    setBusy(true);
    try {
      const res: any = await closeCashRegister({
        data: { realAmount: real, breakdown, notes: notes || undefined },
      });
      setClosedRegId(res.registerId);
      setClosedDiff(res.difference ?? diff);
      toast.success(`Caja cerrada. Diferencia: ${fmt(res.difference ?? diff)}`);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const handleBrowserPrint = () => {
    if (closedRegId) {
      void printCorteSmart(closedRegId, navigate);
    }
  };

  const dismissSuccess = () => {
    setClosedRegId(null);
    onOpenChange(false);
    onDone();
  };

  if (closedRegId) {
    const d = closedDiff;
    return (
      <Dialog
        open={open}
        onOpenChange={(o) => {
          if (!o) dismissSuccess();
        }}
      >
        <DialogContent className="max-w-md bg-card gold-border text-center p-8">
          <div className="bg-emerald-500/20 text-emerald-500 size-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="size-8" />
          </div>
          <h2 className="font-display text-2xl mb-2">Caja cerrada</h2>
          <div className="space-y-1 mb-4">
            <p className="text-muted-foreground text-sm">
              El corte ha sido registrado correctamente.
            </p>
            <p className="text-2xl font-bold gold-text">{fmt(expected + d)}</p>
            <p
              className={`text-sm font-bold ${
                d === 0 ? "text-emerald-500" : d > 0 ? "text-amber-500" : "text-red-500"
              }`}
            >
              {d === 0
                ? "Cuadra perfecto ✓"
                : d > 0
                  ? `Sobrante: ${fmt(d)}`
                  : `Faltante: ${fmt(d)}`}
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <Button onClick={handleBrowserPrint} className="w-full bg-emerald-600 hover:bg-emerald-700 font-bold">
              <Monitor className="size-4 mr-2" /> Imprimir comprobante
            </Button>
            <Button variant="outline" onClick={dismissSuccess}>
              Finalizar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl bg-card gold-border">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Cerrar caja</DialogTitle>
        </DialogHeader>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <div className="flex justify-between rounded-xl bg-surface-2 p-3">
              <span className="text-sm text-muted-foreground">Efectivo esperado</span>
              <span className="text-xl font-bold gold-text">{fmt(expected)}</span>
            </div>
            <div>
              <Label>Efectivo real contado</Label>
              <Input
                type="number"
                value={real || ""}
                onChange={(e) => setReal(Number(e.target.value))}
                className="h-14 text-2xl font-bold"
                placeholder="0.00"
              />
            </div>
            <div
              className={`flex justify-between rounded-xl p-3 border ${
                diff === 0
                  ? "bg-muted/20 border-border"
                  : diff > 0
                    ? "bg-amber-500/10 border-amber-500/30"
                    : "bg-red-500/10 border-red-500/30"
              }`}
            >
              <span className="text-sm">
                {diff === 0 ? "Cuadra" : diff > 0 ? "Sobrante" : "Faltante"}
              </span>
              <span
                className={`text-xl font-bold ${
                  diff > 0 ? "text-amber-500" : diff < 0 ? "text-red-500" : ""
                }`}
              >
                {fmt(diff)}
              </span>
            </div>
            <div>
              <Label>Notas (opcional)</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
            </div>
            <DialogFooter className="sm:justify-start pt-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button
                onClick={submit}
                disabled={busy}
                className="bg-linear-to-r from-gold to-gold-soft text-primary-foreground font-bold"
              >
                {busy ? <Loader2 className="size-4 animate-spin" /> : "Confirmar cierre"}
              </Button>
            </DialogFooter>
          </div>
          <div className="bg-surface-2 p-4 rounded-2xl border border-border">
            <DenominationCounter
              onTotalChange={setReal}
              onBreakdownChange={setBreakdown}
              initialBreakdown={breakdown}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

const QUICK_AMOUNTS = [50, 100, 200, 500, 1000];
const MOVEMENT_TEMPLATES: Record<string, { entrada?: string[]; salida?: string[] }> = {
  sugeridos: {
    entrada: ["Retiro de ATM", "Préstamo", "Pago de cliente", "Otro"],
    salida: ["Compra de insumos", "Pago a proveedor", "Gasolina", "Otro"],
  },
};

function CashMovementDialog({
  type,
  onClose,
  onDone,
}: {
  type: "entrada" | "salida" | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const [amount, setAmount] = useState(0);
  const [concept, setConcept] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("efectivo");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!type) return;
    setBusy(true);
    try {
      await addCashMovement({ data: { type, amount, concept: concept || "Sin concepto", paymentMethod } });
      toast.success(`${type === "entrada" ? "Entrada" : "Salida"} registrada`);
      onDone();
      onClose();
      setAmount(0);
      setConcept("");
      setPaymentMethod("efectivo");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const templates = type ? MOVEMENT_TEMPLATES.sugeridos[type] : [];

  return (
    <Dialog open={!!type} onOpenChange={(b) => !b && onClose()}>
      <DialogContent className="bg-card gold-border max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl capitalize">
            {type} de efectivo
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Concepto <span className="text-muted-foreground text-xs">(opcional)</span></Label>
            <Input
              value={concept}
              onChange={(e) => setConcept(e.target.value)}
              placeholder={type === "entrada" ? "Ej. retiro de ATM" : "Ej. compra de insumos"}
            />
            {templates && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {templates.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setConcept(t)}
                    className={`text-xs px-2.5 py-1 rounded-full border transition ${
                      concept === t
                        ? "bg-gold/20 border-gold text-gold"
                        : "border-border text-muted-foreground hover:border-gold/50"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div>
            <Label>Monto</Label>
            <Input
              type="number"
              value={amount || ""}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="h-14 text-2xl font-bold"
              placeholder="0.00"
              step="any"
            />
            <div className="flex gap-1.5 mt-2 flex-wrap">
              {QUICK_AMOUNTS.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => setAmount(q)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-semibold border transition ${
                    amount === q
                      ? "bg-gold/20 border-gold text-gold"
                      : "border-border text-muted-foreground hover:border-gold/50"
                  }`}
                >
                  ${q}
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label>Método de pago</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="efectivo">Efectivo</SelectItem>
                <SelectItem value="tarjeta">Tarjeta</SelectItem>
                <SelectItem value="transferencia">Transferencia</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={submit}
            disabled={busy || amount === 0}
            className="bg-linear-to-r from-gold to-gold-soft text-primary-foreground font-bold"
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : "Registrar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}