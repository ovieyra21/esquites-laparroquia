import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { getSaleForTicket } from "@/lib/sales.functions";
import { useEffect, useState } from "react";
import logoTicket from "@/assets/logo-ticket.png";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const fmt = (n: number) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(n);

type TicketData = {
  id?: string;
  folio: string;
  createdAt: string;
  cashier: string;
  subtotal: number;
  tax: number;
  total: number;
  paymentMethod: string;
  cashReceived?: number | null;
  changeAmount?: number | null;
  items: { name: string; quantity: number; unitPrice: number; modifiers: string[] }[];
  businessName: string;
  slogan: string;
  address: string;
  phone: string;
  footerMessage: string;
};

function parseHashData(): TicketData | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.location.hash.slice(1);
    if (!raw) return null;
    return JSON.parse(decodeURIComponent(atob(raw)));
  } catch {
    return null;
  }
}

export const Route = createFileRoute("/ticket/$id")({
  head: () => ({ meta: [{ title: "Ticket · Esquites La Parroquia" }] }),
  component: TicketPage,
});

function TicketPage() {
  const { id } = Route.useParams();
  const isPrintMode = id === "print";
  const getSale = useServerFn(getSaleForTicket);

  const [ticket, setTicket] = useState<TicketData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isPrintMode) {
      const data = parseHashData();
      if (data) {
        setTicket(data);
        // Auto-print after render
        setTimeout(() => window.print(), 800);
      } else {
        setError("No se encontraron datos del ticket.");
      }
    } else {
      getSale({ data: { saleId: id } })
        .then((data) => {
          setTicket(data as TicketData);
          setTimeout(() => window.print(), 800);
        })
        .catch((e: any) => setError(e.message));
    }
  }, [id, isPrintMode, getSale]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white p-6 font-sans">
        <div className="text-center max-w-sm">
          <div className="text-4xl mb-3">🧾</div>
          <h2 className="text-lg font-bold text-red-600 mb-2">Error al cargar ticket</h2>
          <p className="text-sm text-gray-500 mb-4">{error}</p>
          <button
            onClick={() => window.close()}
            className="px-6 py-2 bg-gold text-white rounded-xl font-medium"
          >
            Cerrar
          </button>
        </div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <Loader2 className="size-8 animate-spin text-gold" />
      </div>
    );
  }

  const date = new Date(ticket.createdAt);

  return (
    <div className="min-h-screen bg-gray-100 flex items-start justify-center pt-1 print:bg-white print:p-0">
      <div className="ticket-wrapper">
        {/* ─── Print Controls (hidden when printing) ─── */}
        <div className="no-print flex gap-2 mb-3 justify-center">
          <button
            onClick={() => window.print()}
            className="px-5 py-2.5 bg-gold hover:bg-gold/90 text-white rounded-xl font-bold shadow-lg transition"
          >
            🖨️ Imprimir
          </button>
          <button
            onClick={() => window.close()}
            className="px-5 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl font-medium transition"
          >
            Cerrar
          </button>
        </div>

        {/* ─── Ticket ─── */}
        <div className="ticket bg-white shadow-xl print:shadow-none">
          {/* Header */}
          <div className="ticket-header">
            <img
              src={logoTicket}
              alt={ticket.businessName}
              className="ticket-logo"
            />
            <h1 className="ticket-business">{ticket.businessName}</h1>
            {ticket.slogan && <p className="ticket-slogan">{ticket.slogan}</p>}
            <p className="ticket-address">{ticket.address}</p>
            {ticket.phone && <p className="ticket-phone">Tel: {ticket.phone}</p>}
          </div>

          <div className="ticket-divider" />

          {/* Info */}
          <div className="ticket-info">
            <div className="flex justify-between">
              <span>Folio:</span>
              <span className="font-bold">{ticket.folio}</span>
            </div>
            <div className="flex justify-between">
              <span>Fecha:</span>
              <span>{format(date, "dd/MM/yyyy", { locale: es })}</span>
            </div>
            <div className="flex justify-between">
              <span>Hora:</span>
              <span>{format(date, "HH:mm:ss")}</span>
            </div>
            <div className="flex justify-between">
              <span>Cajero:</span>
              <span>{ticket.cashier}</span>
            </div>
          </div>

          <div className="ticket-divider" />

          {/* Items */}
          <div className="ticket-items">
            {ticket.items.map((item, idx) => (
              <div key={idx} className="mb-2">
                <div className="flex justify-between font-semibold text-sm">
                  <span>{item.quantity}x {item.name}</span>
                  <span>{fmt(item.unitPrice * item.quantity)}</span>
                </div>
                {item.modifiers.map((m, mi) => (
                  <div key={mi} className="text-xs pl-3 text-gray-500">
                    + {m}
                  </div>
                ))}
              </div>
            ))}
          </div>

          <div className="ticket-divider" />

          {/* Totals */}
          <div className="ticket-totals">
            <div className="flex justify-between text-xs">
              <span>Subtotal</span>
              <span>{fmt(ticket.subtotal)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span>Impuestos</span>
              <span>{fmt(ticket.tax)}</span>
            </div>
            <div className="flex justify-between font-bold text-base pt-1 mt-1 border-t border-dashed border-gray-300">
              <span>TOTAL</span>
              <span>{fmt(ticket.total)}</span>
            </div>
            <div className="flex justify-between text-xs pt-1">
              <span>Pago:</span>
              <span className="uppercase font-medium">{ticket.paymentMethod}</span>
            </div>
            {ticket.cashReceived != null && (
              <>
                <div className="flex justify-between text-xs">
                  <span>Recibido</span>
                  <span>{fmt(ticket.cashReceived)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span>Cambio</span>
                  <span>{fmt(ticket.changeAmount ?? 0)}</span>
                </div>
              </>
            )}
          </div>

          <div className="ticket-divider" />

          {/* Footer */}
          <div className="ticket-footer">
            <p className="italic">{ticket.footerMessage}</p>
            <p className="opacity-60 mt-1">esquiteslaparroquia.mx</p>
          </div>

          {/* Feed extra para el cortador */}
          <div className="ticket-feed" />
        </div>
      </div>
    </div>
  );
}
