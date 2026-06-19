import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { fmt } from "@/store/cart";
import {
  Loader2,
  QrCode,
  ExternalLink,
  ShieldCheck,
  Clock,
  RefreshCw,
  X,
  BadgeCheck,
  Banknote,
} from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import {
  createPaymentPreference,
  checkPaymentStatus,
} from "@/lib/mercadopago.functions";
import { toast } from "sonner";
import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

type PaymentState = "creating" | "pending" | "paid" | "error";

export function PaymentQRDialog({
  saleId,
  amount,
  description,
  open,
  onOpenChange,
  onPaid,
}: {
  saleId: string;
  amount: number;
  description: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPaid: () => void;
}) {
  const createPref = useServerFn(createPaymentPreference);
  const checkStatus = useServerFn(checkPaymentStatus);
  const [state, setState] = useState<PaymentState>("creating");
  const [initPoint, setInitPoint] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const pollRef = useRef<ReturnType<typeof setInterval>>();
  const pollCount = useRef(0);

  const startPayment = async () => {
    setState("creating");
    setErrorMsg("");
    pollCount.current = 0;
    try {
      const result = await createPref({
        data: {
          externalReference: saleId,
          title: "Venta · Esquites La Parroquia",
          amount,
          description,
        },
      });
      setInitPoint(result.initPoint || result.sandboxInitPoint);
      if (result.qrBase64) {
        setQrDataUrl(`data:image/png;base64,${result.qrBase64}`);
      }
      setState("pending");
      startPolling();
    } catch (e: any) {
      setErrorMsg(e.message || "Error al crear el pago");
      setState("error");
      toast.error("No se pudo crear el pago digital");
    }
  };

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = undefined;
    }
  };

  const startPolling = () => {
    stopPolling();
    pollRef.current = setInterval(async () => {
      pollCount.current++;
      try {
        const result = await checkStatus({
          data: { externalReference: saleId },
        });
        if (result.paid) {
          stopPolling();
          setState("paid");
          toast.success("¡Pago recibido!", {
            description: `$${fmt(amount)} via ${result.paymentMethod || "digital"}`,
          });
          setTimeout(() => {
            onPaid();
            onOpenChange(false);
          }, 1500);
        }
        // Stop polling after 5 minutes (100 polls at 3s interval)
        if (pollCount.current > 100) {
          stopPolling();
          setErrorMsg("Tiempo de espera agotado");
          setState("error");
        }
      } catch {
        // polling errors are expected sometimes, ignore
      }
    }, 3000);
  };

  useEffect(() => {
    if (open) {
      startPayment();
    }
    return () => stopPolling();
  }, [open, saleId]);

  const handleOpenLink = () => {
    if (initPoint) window.open(initPoint, "_blank");
  };

  const openWithCash = () => {
    stopPolling();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) stopPolling(); onOpenChange(o); }}>
      <DialogContent className="max-w-sm bg-card gold-border">
        <DialogHeader>
          <DialogTitle className="font-display text-lg flex items-center gap-2">
            <QrCode className="size-5 text-gold" />
            Pago digital · Mercado Pago
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-2">
          {/* Amount */}
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-1">Total a pagar</p>
            <p className="text-3xl font-black text-gold">${fmt(amount)}</p>
          </div>

          {/* QR Code */}
          {state === "creating" && (
            <div className="w-full flex flex-col items-center gap-3 py-6">
              <Loader2 className="size-10 animate-spin text-gold" />
              <p className="text-sm text-muted-foreground">
                Generando código QR...
              </p>
            </div>
          )}

          {state === "pending" && (
            <>
              <div className="relative">
                <div className="rounded-2xl border-2 border-gold/40 bg-white p-2">
                  {qrDataUrl ? (
                    <img
                      src={qrDataUrl}
                      alt="QR de pago"
                      className="size-56 rounded-xl"
                    />
                  ) : (
                    <div className="size-56 rounded-xl bg-surface-2 flex items-center justify-center">
                      <QrCode className="size-16 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div className="absolute -inset-1 rounded-2xl bg-gold/10 animate-pulse -z-10" />
              </div>

              <div className="flex items-center gap-2 text-emerald-500 bg-emerald-500/5 px-3 py-1.5 rounded-full">
                <div className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-medium">Esperando pago...</span>
              </div>

              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={handleOpenLink}
              >
                <ExternalLink className="size-3.5" />
                Abrir enlace de pago
              </Button>
            </>
          )}

          {state === "paid" && (
            <div className="flex flex-col items-center gap-3 py-6">
              <div className="size-16 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <BadgeCheck className="size-10 text-emerald-500" />
              </div>
              <p className="text-lg font-bold text-emerald-600">¡Pago confirmado!</p>
              <p className="text-sm text-muted-foreground">Cerrando...</p>
            </div>
          )}

          {state === "error" && (
            <div className="flex flex-col items-center gap-3 py-4">
              <div className="size-14 rounded-full bg-red-500/10 flex items-center justify-center">
                <X className="size-7 text-red-500" />
              </div>
              <p className="text-sm font-medium text-red-500 text-center">
                {errorMsg || "Error de pago"}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={startPayment}
                  className="gap-1.5"
                >
                  <RefreshCw className="size-3.5" />
                  Reintentar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={openWithCash}
                  className="gap-1.5"
                >
                  <Banknote className="size-3.5" />
                  Cobrar efectivo
                </Button>
              </div>
            </div>
          )}

          {/* Info footer */}
          <div className="w-full border-t border-border pt-3 space-y-1">
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <ShieldCheck className="size-3" />
              Pago seguro con Mercado Pago
            </div>
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <Clock className="size-3" />
              Escanea el QR con cualquier app bancaria
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
