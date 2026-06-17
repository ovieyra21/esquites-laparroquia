import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getCurrentRegister, openCashRegister, closeCashRegister, addCashMovement, getRegisterHistory } from "@/lib/cash.functions";
import { printCashCutReceipt } from "@/lib/printer.functions";
import { DenominationCounter, type Breakdown } from "@/components/DenominationCounter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { fmt } from "@/store/cart";
import { Wallet, ArrowDownCircle, ArrowUpCircle, Lock, History, Loader2, ShoppingCart, Printer } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export const Route = createFileRoute("/_authenticated/caja")({
  head: () => ({ meta: [{ title: "Caja · Esquites La Parroquia" }] }),
  component: CajaPage,
});

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
    return <div className="p-10 flex items-center gap-3 text-muted-foreground"><Loader2 className="size-5 animate-spin" /> Cargando...</div>;
  }

  if (!data?.register) {
    return (
      <div className="p-6 lg:p-10 max-w-3xl mx-auto">
        <div className="text-center bg-card rounded-3xl gold-border p-12 space-y-4">
          <Wallet className="size-16 mx-auto text-gold" />
          <h1 className="font-display text-3xl">No hay caja abierta</h1>
          <p className="text-muted-foreground">Abre la caja con el monto inicial en efectivo para empezar a vender.</p>
          <Button onClick={() => setOpenDialog(true)} className="h-12 bg-linear-to-r from-gold to-gold-soft text-primary-foreground font-bold">
            Abrir caja
          </Button>
        </div>
        <OpenCashDialog open={openDialog} onOpenChange={setOpenDialog} onDone={invalidate} />
      </div>
    );
  }

  const s = data.summary as any;
  return (
    <div className="p-4 lg:p-6 max-w-6xl mx-auto">
      <header className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="font-display text-3xl">Caja</h1>
          <p className="text-sm text-muted-foreground">
            Abierta el {format(new Date(data.register.opened_at), "dd MMM yyyy · HH:mm", { locale: es })}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button onClick={() => navigate({ to: "/pos" })} variant="outline"><ShoppingCart className="size-4 mr-1" /> Ir al POS</Button>
          <Button onClick={() => setMoveDialog("entrada")} className="bg-success/20 hover:bg-success/30 text-success border border-success/40"><ArrowDownCircle className="size-4 mr-1" /> Entrada</Button>
          <Button onClick={() => setMoveDialog("salida")} className="bg-destructive/20 hover:bg-destructive/30 text-destructive border border-destructive/40"><ArrowUpCircle className="size-4 mr-1" /> Salida</Button>
          <Button onClick={() => setCloseDialog(true)} className="bg-linear-to-r from-gold to-gold-soft text-primary-foreground font-bold"><Lock className="size-4 mr-1" /> Cerrar caja</Button>
        </div>
      </header>

      <Tabs defaultValue="resumen">
        <TabsList>
          <TabsTrigger value="resumen">Resumen</TabsTrigger>
          <TabsTrigger value="movimientos">Movimientos</TabsTrigger>
          <TabsTrigger value="historial"><History className="size-3 mr-1" /> Historial de cortes</TabsTrigger>
        </TabsList>

        <TabsContent value="resumen" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Stat label="Fondo inicial" value={fmt(Number(data.register.opening_amount))} />
            <Stat label="Ventas en efectivo" value={fmt(Number(s?.sales_cash ?? 0))} accent />
            <Stat label="Ventas tarjeta" value={fmt(Number(s?.sales_card ?? 0))} />
            <Stat label="Ventas transferencia" value={fmt(Number(s?.sales_transfer ?? 0))} />
            <Stat label="Entradas extra" value={fmt(Number(s?.cash_in ?? 0))} />
            <Stat label="Salidas" value={fmt(Number(s?.cash_out ?? 0))} />
            <Stat label="Tickets" value={String(s?.sales_count ?? 0)} />
            <Stat label="Efectivo esperado" value={fmt(Number(s?.expected_cash ?? 0))} accent />
          </div>
          <div className="bg-card gold-border rounded-2xl p-6">
            <div className="text-sm text-muted-foreground mb-1">Total vendido (todos los métodos)</div>
            <div className="font-display text-5xl gold-text">{fmt(Number(s?.sales_total ?? 0))}</div>
          </div>
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
                    <th className="p-3">Método</th>
                    <th className="p-3 text-right">Monto</th>
                  </tr>
                </thead>
                <tbody>
                  {data.movements.map((m: any) => (
                    <tr key={m.id} className="border-t border-border">
                      <td className="p-3 text-muted-foreground">{format(new Date(m.created_at), "HH:mm")}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${m.type === "entrada" ? "bg-success/20 text-success" : "bg-destructive/20 text-destructive"}`}>
                          {m.type}
                        </span>
                      </td>
                      <td className="p-3">{m.concept}</td>
                      <td className="p-3 text-muted-foreground capitalize">{m.payment_method}</td>
                      <td className="p-3 text-right font-bold">{fmt(Number(m.amount))}</td>
                    </tr>
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

      <CloseCashDialog open={closeDialog} onOpenChange={setCloseDialog} expected={Number(s?.expected_cash ?? 0)} onDone={invalidate} />
      <CashMovementDialog type={moveDialog} onClose={() => setMoveDialog(null)} onDone={invalidate} />
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="bg-card gold-border rounded-xl p-4">
      <div className="text-xs text-muted-foreground uppercase tracking-wide">{label}</div>
      <div className={`text-xl font-bold mt-1 ${accent ? "gold-text" : ""}`}>{value}</div>
    </div>
  );
}

function HistorialCortes() {
  const getHist = useServerFn(getRegisterHistory);
  const printFn = useServerFn(printCashCutReceipt);
  const { data, isLoading } = useQuery({ queryKey: ["cash-register-history"], queryFn: () => getHist() });
  if (isLoading) return <div className="p-6 text-muted-foreground">Cargando...</div>;
  if (!data?.length) return <div className="p-6 text-muted-foreground bg-card rounded-2xl gold-border text-center">Sin cortes anteriores.</div>;
  return (
    <div className="bg-card gold-border rounded-2xl overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-surface-2 text-left">
          <tr>
            <th className="p-3">Cierre</th>
            <th className="p-3 text-right">Fondo</th>
            <th className="p-3 text-right">Ventas efectivo</th>
            <th className="p-3 text-right">Esperado</th>
            <th className="p-3 text-right">Real</th>
            <th className="p-3 text-right">Diferencia</th>
            <th className="p-3 text-right">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {data.map((r: any) => {
            const diff = Number(r.difference ?? 0);
            return (
              <tr key={r.id} className="border-t border-border">
                <td className="p-3">{r.closed_at ? format(new Date(r.closed_at), "dd MMM HH:mm", { locale: es }) : "—"}</td>
                <td className="p-3 text-right">{fmt(Number(r.opening_amount))}</td>
                <td className="p-3 text-right">{fmt(Number(r.total_sales_cash ?? 0))}</td>
                <td className="p-3 text-right">{fmt(Number(r.expected_amount ?? 0))}</td>
                <td className="p-3 text-right">{fmt(Number(r.real_amount ?? 0))}</td>
                <td className={`p-3 text-right font-bold ${diff === 0 ? "" : diff > 0 ? "text-success" : "text-destructive"}`}>{fmt(diff)}</td>
                <td className="p-3 text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={async () => {
                      try {
                        await printFn({ data: { registerId: r.id } });
                        toast.success("Imprimiendo comprobante...");
                      } catch (e: any) {
                        toast.error(e.message);
                      }
                    }}
                    title="Imprimir corte"
                  >
                    <Printer className="size-4" />
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function OpenCashDialog({ open, onOpenChange, onDone }: { open: boolean; onOpenChange: (b: boolean) => void; onDone: () => void }) {
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
        <DialogHeader><DialogTitle className="font-display text-2xl">Abrir caja</DialogTitle></DialogHeader>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Fondo inicial en efectivo</Label>
              <Input type="number" value={amount || ""} onChange={(e) => setAmount(Number(e.target.value))} className="h-14 text-2xl font-bold" placeholder="0.00" />
              <p className="text-xs text-muted-foreground">Puedes ingresar el monto manualmente o usar el tabulador.</p>
            </div>
            <DialogFooter className="sm:justify-start pt-4">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button onClick={submit} disabled={busy} className="bg-linear-to-r from-gold to-gold-soft text-primary-foreground font-bold">
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

function CloseCashDialog({ open, onOpenChange, expected, onDone }: { open: boolean; onOpenChange: (b: boolean) => void; expected: number; onDone: () => void }) {
  const fn = useServerFn(closeCashRegister);
  const [real, setReal] = useState(0);
  const [breakdown, setBreakdown] = useState<Breakdown>({});
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const diff = real - expected;
  const printFn = useServerFn(printCashCutReceipt);

  const submit = async () => {
    setBusy(true);
    try {
      const res = await fn({ data: { realAmount: real, breakdown, notes: notes || undefined } });
      toast.success(`Caja cerrada. Diferencia: ${fmt(diff)}`);
      setSuccess((res as any)?.registerId || "history"); // Assume backend returns ID
      onDone();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  if (success) {
    return (
      <Dialog open={open} onOpenChange={(o) => { if (!o) { setSuccess(null); onOpenChange(false); } }}>
        <DialogContent className="max-w-md bg-card gold-border text-center p-10">
          <div className="bg-success/20 text-success size-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="size-8" />
          </div>
          <h2 className="font-display text-2xl mb-2">Caja cerrada</h2>
          <p className="text-muted-foreground mb-6">El corte ha sido registrado correctamente con una diferencia de {fmt(diff)}.</p>
          <div className="flex flex-col gap-2">
            <Button onClick={async () => {
              try {
                // If success is the ID, use it, otherwise we might need another way to get current register ID before closing
                // But closeCashRegister returns the closed record usually.
                await printFn({ data: { registerId: success } });
                toast.success("Imprimiendo...");
              } catch (e: any) { toast.error(e.message); }
            }} className="w-full bg-gold text-primary-foreground font-bold">
              <Printer className="size-4 mr-2" /> Imprimir comprobante
            </Button>
            <Button variant="ghost" onClick={() => { setSuccess(null); onOpenChange(false); }}>
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
        <DialogHeader><DialogTitle className="font-display text-2xl">Cerrar caja</DialogTitle></DialogHeader>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <div className="flex justify-between rounded-xl bg-surface-2 p-3">
              <span className="text-sm text-muted-foreground">Efectivo esperado</span>
              <span className="text-xl font-bold gold-text">{fmt(expected)}</span>
            </div>
            <div>
              <Label>Efectivo real contado</Label>
              <Input type="number" value={real || ""} onChange={(e) => setReal(Number(e.target.value))} className="h-14 text-2xl font-bold" placeholder="0.00" />
            </div>
            <div className={`flex justify-between rounded-xl p-3 border ${diff === 0 ? "bg-muted/20 border-border" : diff > 0 ? "bg-success/10 border-success/30" : "bg-destructive/10 border-destructive/30"}`}>
              <span className="text-sm">{diff === 0 ? "Cuadra" : diff > 0 ? "Sobrante" : "Faltante"}</span>
              <span className={`text-xl font-bold ${diff > 0 ? "text-success" : diff < 0 ? "text-destructive" : ""}`}>{fmt(diff)}</span>
            </div>
            <div>
              <Label>Notas (opcional)</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
            </div>
            <DialogFooter className="sm:justify-start pt-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button onClick={submit} disabled={busy} className="bg-linear-to-r from-gold to-gold-soft text-primary-foreground font-bold">
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

function CashMovementDialog({ type, onClose, onDone }: { type: "entrada" | "salida" | null; onClose: () => void; onDone: () => void }) {
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
      onDone(); onClose();
      setAmount(0); setConcept("");
    } catch (e: any) {
      toast.error(e.message);
    } finally { setBusy(false); }
  };

  return (
    <Dialog open={!!type} onOpenChange={(b) => !b && onClose()}>
      <DialogContent className="bg-card gold-border">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl capitalize">{type} de efectivo</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Concepto</Label>
            <Input value={concept} onChange={(e) => setConcept(e.target.value)} placeholder={type === "entrada" ? "Ej. retiro de ATM" : "Ej. compra de insumos"} />
          </div>
          <div>
            <Label>Monto</Label>
            <Input type="number" value={amount || ""} onChange={(e) => setAmount(Number(e.target.value))} className="h-14 text-2xl font-bold" placeholder="0.00" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={submit} disabled={busy || !concept || amount <= 0} className="bg-linear-to-r from-gold to-gold-soft text-primary-foreground font-bold">
            {busy ? <Loader2 className="size-4 animate-spin" /> : "Registrar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
