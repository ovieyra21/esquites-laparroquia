import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, X } from "lucide-react";
import { fmt } from "@/store/cart";
import type { Sale } from "@/store/sales";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { smartPrintTicket } from "@/lib/escpos";
import { getPrintSettings } from "@/lib/settings.functions";
import { useQuery } from "@tanstack/react-query";
import { useCallback } from "react";
import logoTicket from "@/assets/logo-ticket.png";

export function ReceiptDialog({
  sale,
  open,
  onOpenChange,
}: {
  sale: Sale | null;
  open: boolean;
  onOpenChange: (b: boolean) => void;
}) {
  const { data: printSettings } = useQuery({
    queryKey: ["print-settings"],
    queryFn: () => getPrintSettings(),
    enabled: open,
  });

  const handlePrint = useCallback(() => {
    if (!sale) return;
    void smartPrintTicket({
      folio: sale.folio,
      createdAt: sale.createdAt,
      cashier: sale.cashier,
      subtotal: sale.subtotal,
      tax: sale.tax,
      total: sale.total,
      paymentMethod: sale.payment,
      cashReceived: sale.received ?? null,
      changeAmount: sale.change ?? null,
      discount: sale.discount ?? null,
      discountReason: sale.discountReason ?? null,
      isCourtesy: sale.isCourtesy ?? null,
      kitchenNotes: sale.kitchenNotes ?? null,
      items: sale.items.map((i) => ({
        name: i.product.name,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        modifiers: i.modifiers.filter((m) => m.optionLabel).map((m) => m.optionLabel),
      })),
    }, printSettings);
  }, [sale, printSettings]);

  if (!sale) return null;
  const date = new Date(sale.createdAt);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card gold-border max-w-md p-0 overflow-hidden">
        <div className="bg-white text-black p-6 font-mono text-sm print:shadow-none" id="ticket-print">
          <div className="text-center mb-3">
            <img src={logoTicket} alt="Esquites La Parroquia" className="mx-auto w-32 h-32 object-contain mb-1" />
            <div className="text-xs">Acámbaro, Gto.</div>
          </div>
          <div className="border-t border-dashed border-black/40 my-2" />
          <div className="text-xs space-y-0.5">
            <div className="flex justify-between"><span>Folio:</span><span className="font-bold">{sale.folio}</span></div>
            <div className="flex justify-between"><span>Fecha:</span><span>{format(date, "dd/MM/yyyy", { locale: es })}</span></div>
            <div className="flex justify-between"><span>Hora:</span><span>{format(date, "HH:mm:ss")}</span></div>
            <div className="flex justify-between"><span>Cajero:</span><span>{sale.cashier}</span></div>
            {sale.isBuffered && (
              <div className="bg-destructive/10 text-destructive border border-destructive/20 text-[10px] p-1 text-center font-bold mt-2 uppercase tracking-tighter">
                Venta Local - Pendiente de Sincronización
              </div>
            )}
          </div>
          <div className="border-t border-dashed border-black/40 my-2" />
          <div className="space-y-2">
            {sale.items.map((i) => (
              <div key={i.uid}>
                <div className="flex justify-between font-semibold">
                  <span>{i.quantity}x {i.product.name}</span>
                  <span>{fmt(i.unitPrice * i.quantity)}</span>
                </div>
                {i.modifiers.filter((m) => m.optionLabel).map((m, idx) => (
                  <div key={idx} className="text-xs pl-3 opacity-70">+ {m.optionLabel}</div>
                ))}
              </div>
            ))}
          </div>
          <div className="border-t border-dashed border-black/40 my-2" />
          <div className="space-y-0.5 text-xs">
            <div className="flex justify-between"><span>Subtotal</span><span>{fmt(sale.subtotal)}</span></div>
            <div className="flex justify-between"><span>Impuestos</span><span>{fmt(sale.tax)}</span></div>
            <div className="flex justify-between text-base font-bold pt-1"><span>TOTAL</span><span>{fmt(sale.total)}</span></div>
            <div className="flex justify-between pt-1"><span>Pago:</span><span className="uppercase">{sale.payment}</span></div>
            {sale.received !== undefined && (
              <>
                <div className="flex justify-between"><span>Recibido</span><span>{fmt(sale.received)}</span></div>
                <div className="flex justify-between"><span>Cambio</span><span>{fmt(sale.change ?? 0)}</span></div>
              </>
            )}
          </div>
          <div className="border-t border-dashed border-black/40 my-2" />
          <div className="text-center text-xs italic mt-3">¡El sabor que nos une!</div>
          <div className="text-center text-[10px] mt-1 opacity-60">esquiteslaparroquia.mx</div>
        </div>

        <div className="grid grid-cols-2 gap-2 p-3 bg-card">
          <Button
            variant="default"
            onClick={handlePrint}
            className="bg-gold hover:bg-gold/90 text-black font-bold"
          >
            <Printer className="size-4 mr-2" /> Imprimir ticket
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <X className="size-4 mr-2" /> Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
