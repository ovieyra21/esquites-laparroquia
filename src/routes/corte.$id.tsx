import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { getCashCutDetail, type CashCutDetail } from "@/lib/cash.functions";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import logoTicket from "@/assets/logo-ticket.png";

const fmt = (n: number) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(n);

const methodLabels: Record<string, string> = {
  efectivo: "Efectivo",
  tarjeta: "Tarjeta",
  transferencia: "Transferencia",
};

export const Route = createFileRoute("/corte/$id")({
  head: () => ({ meta: [{ title: "Corte de Caja · Esquites La Parroquia" }] }),
  component: CortePage,
});

function CortePage() {
  const { id } = Route.useParams();
  const getCut = useServerFn(getCashCutDetail);
  const [data, setData] = useState<CashCutDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getCut({ data: { registerId: id } })
      .then((d) => {
        setData(d as CashCutDetail);
        setTimeout(() => window.print(), 600);
      })
      .catch((e: any) => setError(e.message));
  }, [id, getCut]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white p-6 font-sans">
        <div className="text-center">
          <p className="text-red-600 mb-2">{error}</p>
          <button onClick={() => window.close()} className="text-sm text-blue-600 underline">Cerrar</button>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="size-8 animate-spin text-amber-600" />
      </div>
    );
  }

  const totalSales = data.salesCash + data.salesCard + data.salesTransfer;
  const diff = data.difference;

  return (
    <div className="min-h-screen bg-gray-100 flex items-start justify-center p-4 print:bg-white print:p-0">
      <div className="corte-wrapper">
        {/* Controls */}
        <div className="no-print flex gap-2 mb-3 justify-center">
          <button onClick={() => window.print()} className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold shadow-lg transition">
            🖨️ Imprimir corte
          </button>
          <button onClick={() => window.close()} className="px-5 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl font-medium transition">
            Cerrar
          </button>
        </div>

        {/* Report */}
        <div className="corte bg-white shadow-xl print:shadow-none">
          {/* Header */}
          <div className="corte-header">
            <img src={logoTicket} alt="Logo" className="corte-logo" />
            <h1 className="corte-title">Esquites La Parroquia</h1>
            <p className="corte-subtitle">El sabor que nos une</p>
            <p className="corte-address">Acámbaro, Gto.</p>
          </div>

          <div className="corte-divider" />

          <h2 className="corte-section-title">CORTE DE CAJA</h2>

          <div className="corte-divider" />

          {/* Meta info */}
          <div className="corte-row">
            <span>Folio:</span>
            <span className="font-bold">{data.id.slice(0, 8).toUpperCase()}</span>
          </div>
          <div className="corte-row">
            <span>Cajero:</span>
            <span>{data.cashierName}</span>
          </div>
          <div className="corte-row">
            <span>Apertura:</span>
            <span>{format(new Date(data.openedAt), "dd/MM/yyyy HH:mm", { locale: es })}</span>
          </div>
          <div className="corte-row">
            <span>Cierre:</span>
            <span>{data.closedAt ? format(new Date(data.closedAt), "dd/MM/yyyy HH:mm", { locale: es }) : "—"}</span>
          </div>

          <div className="corte-divider" />

          {/* Sales breakdown */}
          <h3 className="corte-label">VENTAS</h3>
          <div className="corte-row">
            <span>Efectivo</span>
            <span>{fmt(data.salesCash)}</span>
          </div>
          <div className="corte-row">
            <span>Tarjeta</span>
            <span>{fmt(data.salesCard)}</span>
          </div>
          <div className="corte-row">
            <span>Transferencia</span>
            <span>{fmt(data.salesTransfer)}</span>
          </div>
          <div className="corte-row font-bold">
            <span>Total ventas</span>
            <span>{fmt(totalSales)}</span>
          </div>
          <div className="corte-row">
            <span>Tickets</span>
            <span>{data.salesCount}</span>
          </div>

          {/* Top products */}
          {data.topProducts.length > 0 && (
            <>
              <div className="corte-divider" />
              <h3 className="corte-label">MÁS VENDIDOS</h3>
              {data.topProducts.map((p, i) => (
                <div key={i} className="corte-row text-sm">
                  <span>{i + 1}. {p.name}</span>
                  <span>{p.quantity}u</span>
                </div>
              ))}
            </>
          )}

          <div className="corte-divider" />

          {/* Expected vs Real */}
          <h3 className="corte-label">ARQUEO</h3>
          <div className="corte-row">
            <span>Fondo inicial</span>
            <span>{fmt(data.openingAmount)}</span>
          </div>
          <div className="corte-row">
            <span>Efectivo esperado</span>
            <span>{fmt(data.expectedAmount)}</span>
          </div>
          <div className="corte-row font-bold">
            <span>Efectivo real</span>
            <span>{fmt(data.realAmount)}</span>
          </div>
          <div className={`corte-row font-bold ${diff === 0 ? "" : diff > 0 ? "text-emerald-600" : "text-red-600"}`}>
            <span>Diferencia</span>
            <span>{diff >= 0 ? "+" : ""}{fmt(diff)}</span>
          </div>

          {/* Denominations */}
          {data.closingBreakdown && Object.keys(data.closingBreakdown).length > 0 && (
            <>
              <div className="corte-divider" />
              <h3 className="corte-label">DESGLOSE</h3>
              {Object.entries(data.closingBreakdown)
                .filter(([, qty]) => qty > 0)
                .sort(([a], [b]) => parseFloat(b) - parseFloat(a))
                .map(([den, qty]) => (
                  <div key={den} className="corte-row text-sm">
                    <span>${parseFloat(den).toFixed(den.includes(".") ? 2 : 0)}</span>
                    <span>{qty}u = {fmt(parseFloat(den) * qty)}</span>
                  </div>
                ))}
            </>
          )}

          {data.notes && (
            <>
              <div className="corte-divider" />
              <h3 className="corte-label">NOTAS</h3>
              <p className="text-xs italic">{data.notes}</p>
            </>
          )}

          <div className="corte-divider" />

          <div className="corte-footer">
            <p className="italic">Comprobante de corte de caja</p>
            <p className="opacity-60 mt-1">{format(new Date(), "dd/MM/yyyy HH:mm", { locale: es })}</p>
          </div>

          {/* Feed for cutter */}
          <div className="corte-feed" />
        </div>
      </div>
    </div>
  );
}
