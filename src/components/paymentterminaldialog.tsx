import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { fmt } from "@/store/cart";
import {
  Loader2,
  CreditCard,
  SmartphoneNfc,
  BadgeCheck,
  X,
  AlarmClock,
  Banknote,
} from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import {
  createTerminalPayment,
  checkTerminalPaymentStatus,
} from "@/lib/mercadopago.functions";
import { toast } from "sonner";
import { useState, useEffect, useRef } from "react";

export function PaymentTerminalDialog({
  saleId,
  amount,
  description,
  provider,
  deviceId,
  open,
  onOpenChange,
  onPaid,
}: {
  saleId: string;
  amount: number;
  description: string;
  provider: "mercadopago_point" | "zettle";
  deviceId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPaid: () => void;
}) {
  const createPayment = useServerFn(createTerminalPayment);
  const checkPayment = useServerFn(checkTerminalPaymentStatus);
  const [state, setState] = useState<"connecting" | "waiting" | "approved" | "rejected" | "error">("connecting");
  const [terminalId, setTerminalId] = useState("");
  const [cardInfo, setCardInfo] = useState<{ brand?: string; lastFour?: string }>({});
  const [errorMsg, setErrorMsg] = useState("");
  const pollRef = useRef<ReturnType<typeof setInterval>>();
  const countRef = useRef(0);

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = undefined;
    }
  };

  const startTerminalPayment = async () => {
    setState("connecting");
    setErrorMsg("");
    countRef.current = 0;
    try {
      const result = await createPayment({
        data: {
          provider,
          deviceId,
          amount,
          description,
          externalReference: saleId,
        },
      });
      setTerminalId(result.terminalId);
      setState("waiting");
      startPolling(result.terminalId);
    } catch (e: any) {
      setErrorMsg(e.message);
      setState("error");
      toast.error("No se pudo conectar con la terminal");
    }
  };

  const startPolling = (termId: string) => {
    stopPolling();
    pollRef.current = setInterval(async () => {
      countRef.current++;
      try {
        const result = await checkPayment({
          data: { provider, terminalId: termId },
        });

        if (!result.finished) return;

        stopPolling();
        if (result.approved) {
          setCardInfo({
            brand: result.cardBrand,
            lastFour: result.lastFour,
          });
          setState("approved");
          toast.success("¡Pago aprobado!", {
            description: `$${fmt(amount)}${result.cardBrand ? ` · ${result.cardBrand}` : ""}`,
          });
          setTimeout(() => {
            onPaid();
            onOpenChange(false);
          }, 1500);
        } else {
          setState("rejected");
          setErrorMsg(result.status || "Pago rechazado");
        }
      } catch {
        // polling errors ok
      }

      // Timeout after 2 minutes
      if (countRef.current > 40) {
        stopPolling();
        setErrorMsg("Tiempo de espera agotado");
        setState("error");
      }
    }, 3000);
  };

  useEffect(() => {
    if (open) startTerminalPayment();
    return () => stopPolling();
  }, [open, saleId]);

  const providerName = provider === "mercadopago_point" ? "Mercado Pago Point" : "PayPal Zettle";

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) stopPolling(); onOpenChange(o); }}>
      <DialogContent className="max-w-sm bg-card gold-border">
        <DialogHeader>
          <DialogTitle className="font-display text-lg flex items-center gap-2">
            <CreditCard className="size-5 text-gold" />
            Terminal · {providerName}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-5 py-4">
          {/* Amount */}
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-1">Total a cobrar</p>
            <p className="text-4xl font-black text-gold">${fmt(amount)}</p>
          </div>

          {/* States */}
          {state === "connecting" && (
            <div className="flex flex-col items-center gap-3 py-4">
              <div className="size-20 rounded-2xl bg-blue-500/10 flex items-center justify-center">
                <Loader2 className="size-10 text-blue-500 animate-spin" />
              </div>
              <p className="text-sm font-medium">Conectando con la terminal...</p>
            </div>
          )}

          {state === "waiting" && (
            <>
              <div className="relative">
                <div className="size-24 rounded-full bg-gold/10 flex items-center justify-center">
                  <SmartphoneNfc className="size-12 text-gold animate-pulse" />
                </div>
                <div className="absolute -inset-1 rounded-full bg-gold/10 animate-ping" />
              </div>

              <div className="text-center space-y-1">
                <p className="text-base font-bold">
                  Acerque tarjeta o dispositivo
                </p>
                <p className="text-xs text-muted-foreground">
                  La terminal mostrará <strong>${fmt(amount)}</strong>
                </p>
              </div>

              <div className="flex items-center gap-2 text-amber-500 bg-amber-500/5 px-3 py-1.5 rounded-full">
                <div className="size-2 rounded-full bg-amber-500 animate-pulse" />
                <span className="text-xs font-medium">Esperando pago...</span>
              </div>

              <div className="flex gap-3">
                <div className="size-3 rounded bg-surface-2 flex items-center justify-center text-[8px] text-muted-foreground">
                  💳
                </div>
                <div className="size-3 rounded bg-surface-2 flex items-center justify-center text-[8px] text-muted-foreground">
                  📱
                </div>
                <div className="size-3 rounded bg-surface-2 flex items-center justify-center text-[8px] text-muted-foreground">
                  ⌚
                </div>
              </div>
            </>
          )}

          {state === "approved" && (
            <div className="flex flex-col items-center gap-3 py-3">
              <div className="size-20 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <BadgeCheck className="size-12 text-emerald-500" />
              </div>
              <p className="text-xl font-bold text-emerald-600">¡Pago aprobado!</p>
              {cardInfo.brand && (
                <p className="text-sm text-muted-foreground">
                  {cardInfo.brand} {cardInfo.lastFour ? `****${cardInfo.lastFour}` : ""}
                </p>
              )}
            </div>
          )}

          {state === "rejected" && (
            <div className="flex flex-col items-center gap-3 py-3">
              <div className="size-20 rounded-full bg-red-500/10 flex items-center justify-center">
                <X className="size-12 text-red-500" />
              </div>
              <p className="text-lg font-bold text-red-500">Pago rechazado</p>
              <p className="text-sm text-muted-foreground text-center">{errorMsg}</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={startTerminalPayment}>
                  Reintentar
                </Button>
                <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
                  <Banknote className="size-3.5 mr-1" /> Efectivo
                </Button>
              </div>
            </div>
          )}

          {state === "error" && (
            <div className="flex flex-col items-center gap-3 py-3">
              <div className="size-20 rounded-full bg-red-500/10 flex items-center justify-center">
                <AlarmClock className="size-12 text-red-500" />
              </div>
              <p className="text-sm font-medium text-red-500 text-center">
                {errorMsg || "Error de conexión"}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={startTerminalPayment}>
                  Reintentar
                </Button>
                <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
                  <Banknote className="size-3.5 mr-1" /> Efectivo
                </Button>
              </div>
            </div>
          )}

          {/* Info */}
          <div className="w-full border-t border-border pt-3 text-[10px] text-muted-foreground text-center">
            Terminal {providerName} · Cobro seguro
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
