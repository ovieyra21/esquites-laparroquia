import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, Share2, RotateCcw, Loader2, Monitor } from "lucide-react";
import { fmt } from "@/store/cart";
import type { Sale } from "@/store/sales";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useServerFn } from "@tanstack/react-start";
import { printSaleTicket } from "@/lib/printer.functions";
import { buildTicketHash } from "@/lib/utils";
import { toast } from "sonner";
import { useState, useCallback } from "react";
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
  if (!sale) return null;
  const date = new Date(sale.createdAt);
  const printThermal = useServerFn(printSaleTicket);
  const [printing, setPrinting] = useState(false);

  const handleBrowserPrint = useCallback(() => {
    if (!sale) return;
    const hash = buildTicketHash({
      folio: sale.folio,
      createdAt: sale.createdAt,
      cashier: sale.cashier,
      subtotal: sale.subtotal,
      tax: sale.tax,
      total: sale.total,
      paymentMethod: sale.payment,
      cashReceived: sale.received ?? null,
      changeAmount: sale.change ?? null,
      items: sale.items.map((i) => ({
        name: i.product.name,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        modifiers: i.modifiers.filter((m) => m.optionLabel).map((m) => m.optionLabel),
      })),
    });
    window.open(`/ticket/print#${hash}`, "_blank", "width=380,height=600");
  }, [sale]);

  const handleThermalPrint = async () => {
    setPrinting(true);
    try {
      await printThermal({ data: { saleId: sale.id } });
      toast.success("Imprimiendo ticket...");
    } catch (e: any) {
      toast.error(`Error: ${e.message}`);
    } finally {
      setPrinting(false);
    }
  };

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

        <div className="grid grid-cols-5 gap-2 p-3 bg-card">
          <Button variant="default" size="sm" onClick={handleBrowserPrint} className="bg-success hover:bg-success/90" title="Imprimir ticket (navegador)">
            <Monitor className="size-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleThermalPrint}
            disabled={printing}
            className="border-gold/40"
            title="Imprimir térmica (red local)"
          >
            {printing ? <Loader2 className="size-4 animate-spin" /> : <Printer className="size-4" />}
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.print()} title="Imprimir recibo (diálogo)">
            <Printer className="size-4" />
          </Button>
          <Button variant="outline" size="sm"><Share2 className="size-4" /></Button>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}><RotateCcw className="size-4" /></Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
