import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Banknote, CreditCard, ArrowLeftRight, Shuffle, Check, QrCode } from "lucide-react";
import { fmt } from "@/store/cart";
import type { PaymentMethod } from "@/store/sales";

const METHODS: { id: PaymentMethod; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "efectivo", label: "Efectivo", icon: Banknote },
  { id: "tarjeta", label: "Tarjeta", icon: CreditCard },
  { id: "digital", label: "Pago digital", icon: QrCode },
  { id: "transferencia", label: "Transferencia", icon: ArrowLeftRight },
  { id: "mixto", label: "Mixto", icon: Shuffle },
];

const QUICK = [50, 100, 200, 500, 1000];

export function CheckoutDialog({
  open,
  onOpenChange,
  total,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (b: boolean) => void;
  total: number;
  onConfirm: (method: PaymentMethod, received?: number, change?: number) => void;
}) {
  const [method, setMethod] = useState<PaymentMethod>("efectivo");
  const [received, setReceived] = useState<number>(0);

  const change = Math.max(0, received - total);
  const canConfirm = method === "digital" || method !== "efectivo" || received >= total;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card gold-border max-w-lg max-h-[92vh] p-0 gap-0 flex flex-col">
        <DialogHeader className="p-4 pb-2 shrink-0">
          <DialogTitle className="font-display text-xl sm:text-2xl">Cobrar venta</DialogTitle>
        </DialogHeader>

        <div className="overflow-y-auto px-4 flex-1 min-h-0 space-y-3">
        <div className="grid grid-cols-5 gap-2">
          {METHODS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setMethod(id)}
              className={`flex flex-col items-center gap-1 p-3 rounded-xl border transition ${
                method === id
                  ? "border-gold bg-gold/10 text-foreground"
                  : "border-border text-muted-foreground hover:border-gold/40"
              }`}
            >
              <Icon className="size-5" />
              <span className="text-xs font-medium">{label}</span>
            </button>
          ))}
        </div>

        <div className="rounded-xl bg-surface-2 p-4 space-y-2">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Total a cobrar</span>
            <span className="text-2xl font-bold gold-text">{fmt(total)}</span>
          </div>
        </div>

        {method === "efectivo" && (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              {QUICK.map((q) => (
                <Button
                  key={q}
                  variant="outline"
                  onClick={() => setReceived(q)}
                  className="h-12 text-base"
                >
                  ${q}
                </Button>
              ))}
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Monto recibido</label>
              <Input
                type="number"
                value={received || ""}
                onChange={(e) => setReceived(Number(e.target.value))}
                className="h-14 text-2xl font-bold"
                placeholder="0.00"
              />
            </div>
            <div className="flex justify-between items-center rounded-xl bg-success/10 border border-success/30 p-3">
              <span className="text-sm">Cambio</span>
              <span className="text-2xl font-bold text-success">{fmt(change)}</span>
            </div>
          </div>
        </div>

        <div className="p-4 pt-3 shrink-0 border-t border-border">
          <Button
            disabled={!canConfirm}
            onClick={() => onConfirm(method, method === "efectivo" ? received : undefined, method === "efectivo" ? change : undefined)}
            className="w-full h-14 text-lg font-bold bg-success hover:bg-success/90 text-success-foreground"
          >
            <Check className="size-5 mr-2" /> Confirmar cobro
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
