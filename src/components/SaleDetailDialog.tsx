import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Printer, X, Ban, Loader2 } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { getSaleDetail, cancelSaleFn, type SaleDetail } from "@/lib/history.functions";
import { buildTicketHash } from "@/lib/utils";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const fmt = (n: number) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(n);

const paymentLabels: Record<string, string> = {
  efectivo: "Efectivo",
  tarjeta: "Tarjeta",
  transferencia: "Transferencia",
  mixto: "Mixto",
};

export function SaleDetailDialog({
  saleId,
  open,
  onOpenChange,
  onCancelled,
}: {
  saleId: string | null;
  open: boolean;
  onOpenChange: (b: boolean) => void;
  onCancelled?: () => void;
}) {
  const getDetail = useServerFn(getSaleDetail);
  const doCancel = useServerFn(cancelSaleFn);
  const [detail, setDetail] = useState<SaleDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (open && saleId) {
      setLoading(true);
      getDetail({ data: { saleId } })
        .then((d) => setDetail(d as SaleDetail))
        .catch((e: any) => toast.error(e.message))
        .finally(() => setLoading(false));
    } else {
      setDetail(null);
    }
  }, [open, saleId, getDetail]);

  const handleReprint = () => {
    if (!detail) return;
    const hash = buildTicketHash({
      folio: String(detail.folio),
      createdAt: detail.created_at,
      cashier: detail.cashier_name,
      subtotal: detail.subtotal,
      tax: detail.tax,
      total: detail.total,
      paymentMethod: detail.payment_method,
      cashReceived: detail.cash_received,
      changeAmount: detail.change_amount,
      discount: detail.discount,
      discountReason: detail.discount_reason,
      isCourtesy: detail.is_courtesy,
      kitchenNotes: detail.kitchen_notes,
      items: detail.items.map((i) => ({
        name: i.product_name,
        quantity: i.quantity,
        unitPrice: i.unit_price,
        modifiers: i.modifiers,
      })),
    });
    window.open(`/ticket/print#${hash}`, "_blank", "width=380,height=600");
  };

  const handleCancel = async () => {
    if (!saleId || !detail) return;
    setCancelling(true);
    try {
      await doCancel({ data: { saleId } });
      toast.success("Venta cancelada correctamente.");
      setDetail({ ...detail, cancelled: true, cancelled_at: new Date().toISOString() });
      onCancelled?.();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setCancelling(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card gold-border max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-xl flex items-center gap-2">
            Venta #{detail?.folio ?? "..."}
            {detail?.cancelled && (
              <Badge variant="destructive" className="text-[10px]">Cancelada</Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        {loading && (
          <div className="flex justify-center py-12">
            <Loader2 className="size-8 animate-spin text-gold" />
          </div>
        )}

        {detail && !loading && (
          <div className="space-y-4">
            {/* Info Header */}
            <div className="grid grid-cols-2 gap-2 text-sm bg-surface-2 rounded-xl p-3">
              <div>
                <span className="text-muted-foreground text-xs">Fecha</span>
                <p className="font-medium">
                  {format(new Date(detail.created_at), "dd/MM/yyyy HH:mm", { locale: es })}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground text-xs">Cajero</span>
                <p className="font-medium">{detail.cashier_name}</p>
              </div>
              <div>
                <span className="text-muted-foreground text-xs">Cliente</span>
                <p className="font-medium">{detail.customer_name || "—"}</p>
              </div>
              <div>
                <span className="text-muted-foreground text-xs">Pago</span>
                <p className="font-medium uppercase">
                  {paymentLabels[detail.payment_method] || detail.payment_method}
                </p>
              </div>
            </div>

            {detail.kitchen_notes && (
              <div className="bg-yellow-400/10 border border-yellow-400/30 rounded-xl p-3 text-sm">
                <span className="text-[10px] font-bold text-yellow-500 uppercase tracking-wider">Notas cocina:</span>
                <p className="text-foreground mt-0.5">{detail.kitchen_notes}</p>
              </div>
            )}

            {/* Items */}
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Productos
              </h4>
              <div className="space-y-2">
                {detail.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-start bg-surface p-2 rounded-lg">
                    <div>
                      <span className="font-medium text-sm">
                        {item.quantity}x {item.product_name}
                      </span>
                      {item.modifiers.length > 0 && (
                        <div className="text-[11px] text-gold mt-0.5">
                          {item.modifiers.map((m, mi) => (
                            <span key={mi}>+ {m}{mi < item.modifiers.length - 1 ? ", " : ""}</span>
                          ))}
                        </div>
                      )}
                    </div>
                    <span className="font-semibold text-sm">{fmt(item.total)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Totals */}
            <div className="bg-surface-2 rounded-xl p-3 space-y-1 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span><span>{fmt(detail.subtotal)}</span>
              </div>
              {detail.discount != null && detail.discount > 0 && (
                <>
                  <div className="flex justify-between text-success font-semibold">
                    <span>Descuento</span><span>- {fmt(detail.discount)}</span>
                  </div>
                  {detail.discount_reason && (
                    <div className="flex justify-between text-xs text-muted-foreground italic">
                      <span>Motivo:</span><span>{detail.discount_reason}</span>
                    </div>
                  )}
                </>
              )}
              {detail.is_courtesy && (
                <div className="text-center font-black text-sm tracking-widest border border-dashed border-gold/40 rounded py-1 text-gold">
                  *** CORTESÍA ***
                </div>
              )}
              <div className="flex justify-between text-muted-foreground">
                <span>Impuestos</span><span>{fmt(detail.tax)}</span>
              </div>
              <div className="flex justify-between font-bold text-lg pt-1 border-t border-border">
                <span>TOTAL</span><span className="gold-text">{fmt(detail.total)}</span>
              </div>
              {detail.cash_received != null && (
                <>
                  <div className="flex justify-between text-muted-foreground pt-1">
                    <span>Recibido</span><span>{fmt(detail.cash_received)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Cambio</span><span>{fmt(detail.change_amount ?? 0)}</span>
                  </div>
                </>
              )}
            </div>

            {/* Cancellation info */}
            {detail.cancelled && detail.cancelled_at && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-3 text-sm">
                <p className="font-semibold text-destructive">Venta cancelada</p>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(detail.cancelled_at), "dd/MM/yyyy HH:mm", { locale: es })}
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                onClick={handleReprint}
                className="flex-1"
              >
                <Printer className="size-4 mr-2" /> Reimprimir
              </Button>
              {!detail.cancelled && (
                <Button
                  variant="destructive"
                  onClick={handleCancel}
                  disabled={cancelling}
                  className="flex-1"
                >
                  {cancelling ? (
                    <Loader2 className="size-4 mr-2 animate-spin" />
                  ) : (
                    <Ban className="size-4 mr-2" />
                  )}
                  Cancelar venta
                </Button>
              )}
              <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
                <X className="size-4" />
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
