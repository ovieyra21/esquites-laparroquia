import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, Download, Share2, RotateCcw } from "lucide-react";
import { fmt } from "@/store/cart";
import type { Sale } from "@/store/sales";
import { format } from "date-fns";
import { es } from "date-fns/locale";

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card gold-border max-w-md p-0 overflow-hidden">
        <div className="bg-white text-black p-6 font-mono text-sm print:shadow-none" id="ticket-print">
          <div className="text-center mb-3">
            <div className="font-display text-2xl font-bold">Esquites</div>
            <div className="font-display text-lg -mt-1">La Parroquia</div>
            <div className="text-xs">Acámbaro, Gto.</div>
          </div>
          <div className="border-t border-dashed border-black/40 my-2" />
          <div className="text-xs space-y-0.5">
            <div className="flex justify-between"><span>Folio:</span><span className="font-bold">{sale.folio}</span></div>
            <div className="flex justify-between"><span>Fecha:</span><span>{format(date, "dd/MM/yyyy", { locale: es })}</span></div>
            <div className="flex justify-between"><span>Hora:</span><span>{format(date, "HH:mm:ss")}</span></div>
            <div className="flex justify-between"><span>Cajero:</span><span>{sale.cashier}</span></div>
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

        <div className="grid grid-cols-4 gap-2 p-3 bg-card">
          <Button variant="outline" size="sm" onClick={() => window.print()}><Printer className="size-4" /></Button>
          <Button variant="outline" size="sm"><Download className="size-4" /></Button>
          <Button variant="outline" size="sm"><Share2 className="size-4" /></Button>
          <Button variant="outline" size="sm"><RotateCcw className="size-4" /></Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
