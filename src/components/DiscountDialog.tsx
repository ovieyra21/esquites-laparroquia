import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Gift, Percent, DollarSign, X } from "lucide-react";
import { fmt } from "@/store/cart";

type Mode = "amount" | "percent" | "courtesy";

export function DiscountDialog({
  open,
  onOpenChange,
  subtotal,
  currentDiscount,
  onApply,
  onClear,
}: {
  open: boolean;
  onOpenChange: (b: boolean) => void;
  subtotal: number;
  currentDiscount: number;
  onApply: (discount: number, reason: string, isCourtesy: boolean) => void;
  onClear: () => void;
}) {
  const [mode, setMode] = useState<Mode>("amount");
  const [amount, setAmount] = useState<number>(0);
  const [percent, setPercent] = useState<number>(0);
  const [reason, setReason] = useState<string>("");

  const computed =
    mode === "courtesy"
      ? subtotal
      : mode === "percent"
      ? Math.min(subtotal, (subtotal * Math.max(0, Math.min(100, percent))) / 100)
      : Math.min(subtotal, Math.max(0, amount));

  const handleApply = () => {
    if (computed <= 0 && mode !== "courtesy") return;
    onApply(computed, reason.trim(), mode === "courtesy");
    onOpenChange(false);
    setAmount(0);
    setPercent(0);
    setReason("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card gold-border max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-xl flex items-center gap-2">
            <Gift className="size-5 text-gold" /> Descuento / Cortesía
          </DialogTitle>
          <DialogDescription>
            Solo administradores. Subtotal actual: <strong className="gold-text">{fmt(subtotal)}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            <ModeBtn active={mode === "amount"} onClick={() => setMode("amount")} icon={<DollarSign className="size-4" />} label="Monto" />
            <ModeBtn active={mode === "percent"} onClick={() => setMode("percent")} icon={<Percent className="size-4" />} label="Porcentaje" />
            <ModeBtn active={mode === "courtesy"} onClick={() => setMode("courtesy")} icon={<Gift className="size-4" />} label="Cortesía" />
          </div>

          {mode === "amount" && (
            <div>
              <label className="text-xs text-muted-foreground">Monto a descontar</label>
              <Input
                type="number"
                min={0}
                max={subtotal}
                value={amount || ""}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="h-14 text-2xl font-bold"
                placeholder="0.00"
              />
            </div>
          )}

          {mode === "percent" && (
            <div>
              <label className="text-xs text-muted-foreground">Porcentaje (0 - 100)</label>
              <Input
                type="number"
                min={0}
                max={100}
                value={percent || ""}
                onChange={(e) => setPercent(Number(e.target.value))}
                className="h-14 text-2xl font-bold"
                placeholder="0"
              />
              <div className="grid grid-cols-4 gap-2 mt-2">
                {[5, 10, 15, 20].map((p) => (
                  <Button key={p} variant="outline" onClick={() => setPercent(p)} className="h-10">{p}%</Button>
                ))}
              </div>
            </div>
          )}

          {mode === "courtesy" && (
            <div className="rounded-xl bg-gold/10 border border-gold/30 p-4 text-sm">
              Se marcará la venta como <strong>cortesía</strong>: el total quedará en {fmt(0)}.
              Requiere un motivo.
            </div>
          )}

          <div>
            <label className="text-xs text-muted-foreground">
              Motivo {mode === "courtesy" ? "(obligatorio)" : "(opcional)"}
            </label>
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ej. Cliente frecuente, cortesía dueño, promoción..."
              className="h-11"
            />
          </div>

          <div className="rounded-xl bg-surface-2 p-3 flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Descuento a aplicar</span>
            <span className="text-2xl font-bold text-success">- {fmt(computed)}</span>
          </div>

          <div className="flex gap-2">
            {currentDiscount > 0 && (
              <Button
                variant="outline"
                onClick={() => { onClear(); onOpenChange(false); }}
                className="flex-1"
              >
                <X className="size-4 mr-1" /> Quitar descuento
              </Button>
            )}
            <Button
              onClick={handleApply}
              disabled={(mode !== "courtesy" && computed <= 0) || (mode === "courtesy" && !reason.trim())}
              className="flex-1 h-12 font-bold bg-success hover:bg-success/90 text-success-foreground"
            >
              Aplicar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ModeBtn({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1 p-3 rounded-xl border transition ${
        active ? "border-gold bg-gold/10 text-foreground" : "border-border text-muted-foreground hover:border-gold/40"
      }`}
    >
      {icon}
      <span className="text-xs font-medium">{label}</span>
    </button>
  );
}
