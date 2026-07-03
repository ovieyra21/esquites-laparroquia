import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  getCurrentRegister,
  openCashRegister,
  closeCashRegister,
  addCashMovement,
  getRegisterHistory,
  getCashCutDetail,
} from "@/lib/cash.functions";
import { getPrintSettings } from "@/lib/settings.functions";
import { smartPrintCorte } from "@/lib/escpos";

import { DenominationCounter, type Breakdown } from "@/components/DenominationCounter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { fmt } from "@/store/cart";
import {
  Wallet,
  ArrowDownCircle,
  ArrowUpCircle,
  Lock,
  History,
  Loader2,
  ShoppingCart,
  Printer,
  Monitor,
  DollarSign,
  CreditCard,
  ArrowLeftRight,
  Receipt,
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export const Route = createFileRoute("/_authenticated/caja")({
  head: () => ({ meta: [{ title: "Caja · Esquites La Parroquia" }] }),
  component: CajaPage,
});

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

function CajaPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const getCurrent = useServerFn(getCurrentRegister);
  const { data, isLoading } = useQuery({
    queryKey: ["cash-register-current"],
    queryFn: () => getCurrent(),
    refetchInterval: 15_000,
  });

  const [openDialog, setOpenDialog] = useState(false);
  const [closeDialog, setCloseDialog] = useState(false);
  const [moveDialog, setMoveDialog] = useState<"entrada" | "salida" | null>(null);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["cash-register-current"] });

  if (isLoading) {
    return (
      <div className="p-10 flex items-center gap-3 text-muted-foreground">
        <Loader2 className="size-5 animate-spin" /> Cargando...
      </div>
    );
  }

  if (!data?.register) {
    return (
      <div className="p-6 lg:p-10 max-w-3xl mx-auto">
        <div className="text-center bg-card rounded-3xl gold-border p-12 space-y-4">
          <Wallet className="size-16 mx-auto text-gold" />
          <h1 className="font-display text-3xl">No hay caja abierta</h1>
          <p className="text-muted-foreground">
            Abre la caja con el monto inicial en efectivo para empezar a vender.
          </p>
          <Button
            onClick={() => setOpenDialog(true)}
            className="h-12 bg-linear-to-r from-gold to-gold-soft text-primary-foreground font-bold"
          >
            Abrir caja
          </Button>
        </div>
        <OpenCashDialog open={openDialog} onOpenChange={setOpenDialog} onDone={invalidate} />
      </div>
    );
  }

  const s = data.summary as any;
  const reg = data.register as any;
  const totalSales = Number(s?.sales_cash ?? 0) + Number(s?.sales_card ?? 0) + Number(s?.sales_transfer ?? 0);
  const expected = Number(s?.expected_cash ?? 0);
  const cashFloat = Number(reg.opening_amount);

  return (
    <div className="p-4 lg:p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl">Caja</h1>
          <p className="text-sm text-muted-foreground">
            Abierta el{" "}
            {format(new Date(reg.opened_at), "dd MMM yyyy · HH:mm", { locale: es })}
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
        <MiniStat
          icon={DollarSign}
          label="Fondo inicial"
          value={fmt(cashFloat)}
          color="text-slate-400"
        />
        <MiniStat
          icon={TrendingUp}
          label="Total vendido"
          value={fmt(totalSales)}
          color="text-emerald-500"
        />
        <MiniStat
          icon={Receipt}
          label="Tickets"
          value={String(s?.sales_count ?? 0)}
          color="text-blue-400"
        />
        <MiniStat
          icon={DollarSign}
          label="Efectivo esperado"
          value={fmt(expected)}
          color="text-amber-400"
        />
        <MiniStat
          icon={Wallet}
          label="En caja (est.)"
          value={fmt(cashFloat + expected)}
          color="text-amber-500"
        />
      </div>

      <Tabs defaultValue="resumen">
        <TabsList>
          <TabsTrigger value="resumen">Resumen</TabsTrigger>
          <TabsTrigger value="movimientos">Movimientos</TabsTrigger>
          <TabsTrigger value="historial">
            <History className="size-3 mr-1" /> Historial de cortes
          </TabsTrigger>
        </TabsList>

        {/* ─── RESUMEN ─── */}
        <TabsContent value="resumen" className="space-y-4 mt-4">
          {/* Sales by method */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <MethodCard
              icon={DollarSign}
              label="Ventas en efectivo"
              value={Number(s?.sales_cash ?? 0)}
              color="emerald"
            />
            <MethodCard
              icon={CreditCard}
              label="Ventas tarjeta"
              value={Number(s?.sales_card ?? 0)}
              color="blue"
            />
            <MethodCard
              icon={ArrowLeftRight}
              label="Ventas transferencia"
              value={Number(s?.sales_transfer ?? 0)}
              color="purple"
            />
          </div>

          {/* Cash flow */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="bg-card gold-border rounded-2xl p-4">
              <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                Entradas extra
              </div>
              <div className="text-xl font-bold text-emerald-500">
                {fmt(Number(s?.cash_in ?? 0))}
              </div>
            </div>
            <div className="bg-card gold-border rounded-2xl p-4">
              <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                Salidas
              </div>
              <div className="text-xl font-bold text-red-500">
                {fmt(Number(s?.cash_out ?? 0))}
              </div>
            </div>
          </div>

          {/* Grand total */}
          <div className="bg-card gold-border rounded-2xl p-6 text-center">
            <div className="text-sm text-muted-foreground mb-1">
              Total vendido (todos los métodos)
            </div>
            <div className="font-display text-5xl gold-text">{fmt(totalSales)}</div>
          </div>

          {/* Sales composition bar */}
          {totalSales > 0 && (
            <div className="bg-card gold-border rounded-2xl p-4 space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Composición de ventas
              </h4>
              <div className="h-3 rounded-full bg-surface-2 overflow-hidden flex">
                {Number(s?.sales_cash ?? 0) > 0 && (
                  <div
                    className="h-full bg-emerald-500 transition-all"
                    style={{ width: `${(Number(s?.sales_cash ?? 0) / totalSales) * 100}%` }}
                  />
                )}
                {Number(s?.sales_card ?? 0) > 0 && (
                  <div
                    className="h-full bg-blue-500 transition-all"
                    style={{ width: `${(Number(s?.sales_card ?? 0) / totalSales) * 100}%` }}
                  />
                )}
                {Number(s?.sales_transfer ?? 0) > 0 && (
                  <div
                    className="h-full bg-purple-500 transition-all"
                    style={{ width: `${(Number(s?.sales_transfer ?? 0) / totalSales) * 100}%` }}
                  />
                )}
              </div>
              <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <span className="size-2.5 rounded-full bg-emerald-500 inline-block" /> Efectivo
                </span>
                <span className="flex items-center gap-1">
                  <span className="size-2.5 rounded-full bg-blue-500 inline-block" /> Tarjeta
                </span>
                <span className="flex items-center gap-1">
                  <span className="size-2.5 rounded-full bg-purple-500 inline-block" /> Transferencia
                </span>
              </div>
            </div>
          )}
        </TabsContent>

        {/* ─── MOVIMIENTOS ─── */}
        <TabsContent value="movimientos" className="mt-4">
          <div className="bg-card gold-border rounded-2xl overflow-hidden">
            {data.movements.length === 0 ? (
              <div className="p-10 text-center text-muted-foreground">
                Sin movimientos de efectivo.
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-surface-2 text-left">
                  <tr>
                    <th className="p-3">Hora</th>
                    <th className="p-3">Tipo</th>
                    <th className="p-3">Concepto</th>
                    <th className="p-3 hidden sm:table-cell">Método</th>
                    <th className="p-3 text-right">Monto</th>
                  </tr>
                </thead>
                <tbody>
                  {data.movements.map((m: any) => (
                    <tr key={m.id} className="border-t border-border hover:bg-surface/50">
                      <td className="p-3 text-muted-foreground whitespace-nowrap">
                        {format(new Date(m.created_at), "HH:mm")}
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-semibold ${
                            m.type === "entrada"
                              ? "bg-emerald-500/20 text-emerald-600"
                              : "bg-red-500/20 text-red-600"
                          }`}
                        >
                          {m.type === "entrada" ? (
                            <ArrowDownCircle className="size-3 inline mr-0.5" />
                          ) : (
                            <ArrowUpCircle className="size-3 inline mr-0.5" />
                          )}
                          {m.type}
                        </span>
                      </td>
                      <td className="p-3">{m.concept}</td>
                      <td className="p-3 text-muted-foreground capitalize hidden sm:table-cell">
                        {m.payment_method}
                      </td>
                      <td
                        className={`p-3 text-right font-bold ${
                          m.type === "entrada" ? "text-emerald-500" : "text-red-500"
                        }`}
                      >
                        {m.type === "entrada" ? "+" : "-"}
                        {fmt(Number(m.amount))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </TabsContent>

        {/* ─── HISTORIAL ─── */}
        <TabsContent value="historial" className="mt-4">
          <HistorialCortes />
        </TabsContent>
      </Tabs>

      <CloseCashDialog
        open={closeDialog}
        onOpenChange={setCloseDialog}
        expected={expected}
        onDone={invalidate}
      />
      <CashMovementDialog
        type={moveDialog}
        onClose={() => setMoveDialog(null)}
        onDone={invalidate}
      />
    </div>
  );
}

/* ─── Mini Stat ─── */
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

/* ─── Method Card ─── */
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

/* ─── Historial ─── */
function HistorialCortes() {
  const navigate = useNavigate();
  const getHist = useServerFn(getRegisterHistory);
  

  const { data, isLoading } = useQuery({
    queryKey: ["cash-register-history"],
    queryFn: () => getHist(),
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
        const diff = Number(r.difference ?? 0);
        const isExpanded = expanded === r.id;
        return (
          <div key={r.id} className="bg-card gold-border rounded-2xl overflow-hidden">
            {/* Row header */}
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
                    Corte{" "}
                    {r.closed_at
                      ? format(new Date(r.closed_at), "dd MMM yyyy", { locale: es })
                      : "—"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {r.closed_at
                      ? format(new Date(r.closed_at), "HH:mm", { locale: es })
                      : "—"}{" "}
                    · Total: {fmt(Number(r.total_sales_cash ?? 0) + Number(r.total_sales_card ?? 0) + Number(r.total_sales_transfer ?? 0))}
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

            {/* Expanded detail */}
            {isExpanded && (
              <div className="px-4 pb-4 border-t border-border grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3">
                <Detail label="Fondo inicial" value={fmt(Number(r.opening_amount))} />
                <Detail label="Ventas efectivo" value={fmt(Number(r.total_sales_cash ?? 0))} />
                <Detail label="Ventas tarjeta" value={fmt(Number(r.total_sales_card ?? 0))} />
                <Detail label="Ventas transferencia" value={fmt(Number(r.total_sales_transfer ?? 0))} />
                <Detail label="Esperado" value={fmt(Number(r.expected_amount ?? 0))} />
                <Detail label="Real" value={fmt(Number(r.real_amount ?? 0))} />
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

/* ─── Dialogs ─── */
function OpenCashDialog({
  open,
  onOpenChange,
  onDone,
}: {
  open: boolean;
  onOpenChange: (b: boolean) => void;
  onDone: () => void;
}) {
  const fn = useServerFn(openCashRegister);
  const [amount, setAmount] = useState(0);
  const [breakdown, setBreakdown] = useState<Breakdown>({});
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      await fn({ data: { openingAmount: amount, breakdown } });
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
  const fn = useServerFn(closeCashRegister);
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
      const res: any = await fn({
        data: { realAmount: real, breakdown, notes: notes || undefined },
      });
      setClosedRegId(res.registerId);
      setClosedDiff(res.difference ?? diff);
      toast.success(`Caja cerrada. Diferencia: ${fmt(res.difference ?? diff)}`);
      onDone();
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

  if (closedRegId) {
    const d = closedDiff;
    return (
      <Dialog
        open={open}
        onOpenChange={(o) => {
          if (!o) {
            setClosedRegId(null);
            onOpenChange(false);
          }
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
            <Button
              variant="outline"
              onClick={() => {
                setClosedRegId(null);
                onOpenChange(false);
              }}
            >
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

function CashMovementDialog({
  type,
  onClose,
  onDone,
}: {
  type: "entrada" | "salida" | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const fn = useServerFn(addCashMovement);
  const [amount, setAmount] = useState(0);
  const [concept, setConcept] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!type) return;
    setBusy(true);
    try {
      await fn({ data: { type, amount, concept, paymentMethod: "efectivo" } });
      toast.success(`${type === "entrada" ? "Entrada" : "Salida"} registrada`);
      onDone();
      onClose();
      setAmount(0);
      setConcept("");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={!!type} onOpenChange={(b) => !b && onClose()}>
      <DialogContent className="bg-card gold-border">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl capitalize">
            {type} de efectivo
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Concepto</Label>
            <Input
              value={concept}
              onChange={(e) => setConcept(e.target.value)}
              placeholder={type === "entrada" ? "Ej. retiro de ATM" : "Ej. compra de insumos"}
            />
          </div>
          <div>
            <Label>Monto</Label>
            <Input
              type="number"
              value={amount || ""}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="h-14 text-2xl font-bold"
              placeholder="0.00"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={submit}
            disabled={busy || !concept || amount <= 0}
            className="bg-linear-to-r from-gold to-gold-soft text-primary-foreground font-bold"
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : "Registrar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
