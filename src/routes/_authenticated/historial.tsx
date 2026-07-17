import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useCallback } from "react";
import { format, subDays } from "date-fns";
import { es } from "date-fns/locale";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Eye,
  Printer,
  Calendar,
  Filter,
  Loader2,
  DollarSign,
  Receipt,
  TrendingUp,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getSalesHistory,
  getSalesSummary,
  type SaleHistoryRow,
} from "@/lib/history.functions";
import { buildTicketHash } from "@/lib/utils";
import { SaleDetailDialog } from "@/components/SaleDetailDialog";
import { toast } from "sonner";

const fmt = (n: number) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(n);

const paymentLabels: Record<string, string> = {
  efectivo: "Efectivo",
  tarjeta: "Tarjeta",
  transferencia: "Transferencia",
  mixto: "Mixto",
};

const paymentColors: Record<string, string> = {
  efectivo: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  tarjeta: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  transferencia: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  mixto: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
};

export const Route = createFileRoute("/_authenticated/historial")({
  head: () => ({ meta: [{ title: "Historial de Ventas · Esquites La Parroquia" }] }),
  component: HistorialPage,
});

function HistorialPage() {
  // ─── Filters State ───
  const today = new Date();
  const [dateFrom, setDateFrom] = useState(format(subDays(today, 7), "yyyy-MM-dd"));
  const [dateTo, setDateTo] = useState(format(today, "yyyy-MM-dd"));
  const [paymentFilter, setPaymentFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<"created_at" | "total" | "folio">("created_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const pageSize = 20;

  // ─── Selected Sale ───
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // ─── Queries ───
  const historyQ = useQuery({
    queryKey: [
      "sales-history",
      page,
      dateFrom,
      dateTo,
      paymentFilter,
      statusFilter,
      search,
      sortBy,
      sortOrder,
    ],
    queryFn: () =>
      getSalesHistory({
        data: {
          page,
          pageSize,
          dateFrom: dateFrom || null,
          dateTo: dateTo || null,
          paymentMethod: paymentFilter !== "all" ? paymentFilter : null,
          status: statusFilter !== "all" ? statusFilter : null,
          search: search || null,
          sortBy,
          sortOrder,
        },
      }),
    staleTime: 15_000,
  });

  const summaryQ = useQuery({
    queryKey: ["sales-summary", dateFrom, dateTo],
    queryFn: () =>
      getSalesSummary({
        data: { dateFrom: dateFrom || null, dateTo: dateTo || null },
      }),
    staleTime: 30_000,
  });

  // ─── Handlers ───
  const handleSearch = useCallback(() => {
    setSearch(searchInput);
    setPage(1);
  }, [searchInput]);

  const handleClearFilters = useCallback(() => {
    setDateFrom(format(subDays(today, 7), "yyyy-MM-dd"));
    setDateTo(format(today, "yyyy-MM-dd"));
    setPaymentFilter("all");
    setStatusFilter("all");
    setSearch("");
    setSearchInput("");
    setPage(1);
  }, [today]);

  const handleReprint = (sale: SaleHistoryRow) => {
    if (!sale) return;
    const hash = buildTicketHash({
      folio: sale.folio,
      createdAt: sale.created_at,
      cashier: sale.cashier_name,
      subtotal: sale.subtotal,
      tax: sale.tax,
      total: sale.total,
      paymentMethod: sale.payment_method,
      cashReceived: sale.cash_received,
      changeAmount: sale.change_amount,
      discount: sale.discount,
      discountReason: sale.discount_reason,
      isCourtesy: sale.is_courtesy,
      kitchenNotes: sale.kitchen_notes,
      items: [],
    });
    toast.info("Abre el ticket para reimprimir con detalle completo.");
    window.open(`/ticket/${sale.id}`, "_blank", "width=380,height=600");
  };

  const totalPages = Math.max(1, Math.ceil((historyQ.data?.total ?? 0) / pageSize));

  // ─── Summary ───
  const summary = summaryQ.data;

  return (
    <div className="p-6 lg:p-8 min-h-screen space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl">Historial de Ventas</h1>
          <p className="text-muted-foreground text-sm">
            Consulta, reimprime y gestiona todas las transacciones.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            historyQ.refetch();
            summaryQ.refetch();
          }}
          disabled={historyQ.isFetching}
        >
          <RefreshCw className={`size-4 mr-2 ${historyQ.isFetching ? "animate-spin" : ""}`} />
          Actualizar
        </Button>
      </div>

      {/* ─── Summary Cards ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="p-4 bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border-emerald-500/20">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="size-4 text-emerald-600" />
            <span className="text-xs text-muted-foreground">Total Ventas</span>
          </div>
          <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">
            {summaryQ.isLoading ? "..." : fmt(summary?.totalSales ?? 0)}
          </p>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
          <div className="flex items-center gap-2 mb-1">
            <Receipt className="size-4 text-blue-600" />
            <span className="text-xs text-muted-foreground">Transacciones</span>
          </div>
          <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">
            {summaryQ.isLoading ? "..." : summary?.saleCount ?? 0}
          </p>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-amber-500/10 to-amber-500/5 border-amber-500/20">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="size-4 text-amber-600" />
            <span className="text-xs text-muted-foreground">Ticket Promedio</span>
          </div>
          <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">
            {summaryQ.isLoading ? "..." : fmt(summary?.avgTicket ?? 0)}
          </p>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-red-500/10 to-red-500/5 border-red-500/20">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="size-4 text-red-600" />
            <span className="text-xs text-muted-foreground">Canceladas</span>
          </div>
          <p className="text-2xl font-bold text-red-700 dark:text-red-400">
            {summaryQ.isLoading ? "..." : summary?.cancelledCount ?? 0}
          </p>
        </Card>
      </div>

      {/* Payment Breakdown */}
      {summary?.paymentBreakdown && summary.paymentBreakdown.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {summary.paymentBreakdown.map((pb) => (
            <Badge
              key={pb.method}
              variant="secondary"
              className={`text-xs px-3 py-1 ${paymentColors[pb.method] || ""}`}
            >
              {paymentLabels[pb.method] || pb.method}: {fmt(pb.total)} ({pb.count})
            </Badge>
          ))}
        </div>
      )}

      {/* ─── Filters ─── */}
      <Card className="p-4">
        <div className="flex flex-col lg:flex-row gap-3 items-start lg:items-center">
          {/* Date Range */}
          <div className="flex items-center gap-2">
            <Calendar className="size-4 text-muted-foreground shrink-0" />
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
              className="w-36 h-9 text-xs"
            />
            <span className="text-muted-foreground text-xs">—</span>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
              className="w-36 h-9 text-xs"
            />
            <div className="flex gap-1 ml-1">
              <button
                type="button"
                className={`px-2 h-9 text-xs rounded-md border transition-colors ${
                  dateFrom === format(today, "yyyy-MM-dd") && dateTo === format(today, "yyyy-MM-dd")
                    ? "bg-gold text-primary-foreground border-gold"
                    : "border-border text-muted-foreground hover:bg-surface-2"
                }`}
                onClick={() => { setDateFrom(format(today, "yyyy-MM-dd")); setDateTo(format(today, "yyyy-MM-dd")); setPage(1); }}
              >
                Hoy
              </button>
              <button
                type="button"
                className={`px-2 h-9 text-xs rounded-md border transition-colors ${
                  dateFrom === format(subDays(today, 7), "yyyy-MM-dd") && dateTo === format(today, "yyyy-MM-dd")
                    ? "bg-gold text-primary-foreground border-gold"
                    : "border-border text-muted-foreground hover:bg-surface-2"
                }`}
                onClick={() => { setDateFrom(format(subDays(today, 7), "yyyy-MM-dd")); setDateTo(format(today, "yyyy-MM-dd")); setPage(1); }}
              >
                7 días
              </button>
              <button
                type="button"
                className={`px-2 h-9 text-xs rounded-md border transition-colors ${
                  dateFrom === format(subDays(today, 30), "yyyy-MM-dd") && dateTo === format(today, "yyyy-MM-dd")
                    ? "bg-gold text-primary-foreground border-gold"
                    : "border-border text-muted-foreground hover:bg-surface-2"
                }`}
                onClick={() => { setDateFrom(format(subDays(today, 30), "yyyy-MM-dd")); setDateTo(format(today, "yyyy-MM-dd")); setPage(1); }}
              >
                30 días
              </button>
            </div>
          </div>

          {/* Payment Filter */}
          <Select value={paymentFilter} onValueChange={(v) => { setPaymentFilter(v); setPage(1); }}>
            <SelectTrigger className="w-36 h-9 text-xs">
              <Filter className="size-3 mr-1" />
              <SelectValue placeholder="Pago" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los pagos</SelectItem>
              <SelectItem value="efectivo">Efectivo</SelectItem>
              <SelectItem value="tarjeta">Tarjeta</SelectItem>
              <SelectItem value="transferencia">Transferencia</SelectItem>
              <SelectItem value="mixto">Mixto</SelectItem>
            </SelectContent>
          </Select>

          {/* Status Filter */}
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
            <SelectTrigger className="w-36 h-9 text-xs">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="active">Activas</SelectItem>
              <SelectItem value="cancelled">Canceladas</SelectItem>
            </SelectContent>
          </Select>

          {/* Sort */}
          <Select value={`${sortBy}-${sortOrder}`} onValueChange={(v) => {
            const [s, o] = v.split("-") as [typeof sortBy, typeof sortOrder];
            setSortBy(s); setSortOrder(o); setPage(1);
          }}>
            <SelectTrigger className="w-40 h-9 text-xs">
              <SelectValue placeholder="Ordenar" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="created_at-desc">Más recientes</SelectItem>
              <SelectItem value="created_at-asc">Más antiguos</SelectItem>
              <SelectItem value="total-desc">Mayor monto</SelectItem>
              <SelectItem value="total-asc">Menor monto</SelectItem>
              <SelectItem value="folio-desc">Folio ↓</SelectItem>
              <SelectItem value="folio-asc">Folio ↑</SelectItem>
            </SelectContent>
          </Select>

          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por folio, cajero o cliente..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="pl-9 h-9 text-xs"
            />
          </div>

          <Button variant="ghost" size="sm" onClick={handleClearFilters} className="text-xs h-9">
            Limpiar
          </Button>
        </div>
      </Card>

      {/* ─── Table ─── */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-2">
                <Th>Folio</Th>
                <Th>Fecha</Th>
                <Th>Cajero</Th>
                <Th className="hidden md:table-cell">Cliente</Th>
                <Th className="text-right">Total</Th>
                <Th className="hidden sm:table-cell">Pago</Th>
                <Th>Estado</Th>
                <Th className="text-right">Acciones</Th>
              </tr>
            </thead>
            <tbody>
              {historyQ.isLoading ? (
                <tr>
                  <td colSpan={8} className="text-center py-16">
                    <Loader2 className="size-8 animate-spin text-gold mx-auto mb-2" />
                    <p className="text-muted-foreground text-sm">Cargando ventas...</p>
                  </td>
                </tr>
              ) : historyQ.isError ? (
                <tr>
                  <td colSpan={8} className="text-center py-16 text-destructive">
                    Error al cargar el historial.
                  </td>
                </tr>
              ) : (historyQ.data?.sales ?? []).length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-16">
                    <Receipt className="size-12 mx-auto text-muted-foreground/30 mb-3" />
                    <p className="text-muted-foreground">No se encontraron ventas.</p>
                    <p className="text-xs text-muted-foreground/60 mt-1">
                      Ajusta los filtros o registra nuevas ventas.
                    </p>
                  </td>
                </tr>
              ) : (
                (historyQ.data?.sales ?? []).map((sale: SaleHistoryRow) => (
                  <tr
                    key={sale.id}
                    className="border-b border-border hover:bg-surface/50 transition-colors cursor-pointer"
                    onClick={() => {
                      setSelectedSaleId(sale.id);
                      setDetailOpen(true);
                    }}
                  >
                    <td className="p-3 font-mono font-bold text-gold">#{sale.folio}</td>
                    <td className="p-3 text-xs whitespace-nowrap">
                      {format(new Date(sale.created_at), "dd/MM/yy HH:mm", { locale: es })}
                    </td>
                    <td className="p-3 text-xs">{sale.cashier_name}</td>
                    <td className="p-3 text-xs hidden md:table-cell">
                      {sale.customer_name || "—"}
                    </td>
                    <td className="p-3 text-right font-bold">{fmt(sale.total)}</td>
                    <td className="p-3 hidden sm:table-cell">
                      <Badge
                        variant="secondary"
                        className={`text-[10px] ${paymentColors[sale.payment_method] || ""}`}
                      >
                        {paymentLabels[sale.payment_method] || sale.payment_method}
                      </Badge>
                    </td>
                    <td className="p-3">
                      {sale.cancelled ? (
                        <Badge variant="destructive" className="text-[10px]">
                          Cancelada
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
                          Completa
                        </Badge>
                      )}
                    </td>
                    <td className="p-3">
                      <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          title="Ver detalle"
                          onClick={() => {
                            setSelectedSaleId(sale.id);
                            setDetailOpen(true);
                          }}
                        >
                          <Eye className="size-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          title="Reimprimir"
                          onClick={() => handleReprint(sale)}
                        >
                          <Printer className="size-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* ─── Pagination ─── */}
        {!historyQ.isLoading && (historyQ.data?.total ?? 0) > 0 && (
          <div className="flex items-center justify-between p-3 border-t border-border bg-surface-2/50">
            <span className="text-xs text-muted-foreground">
              {(historyQ.data?.sales?.length ?? 0) > 0
                ? `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, historyQ.data?.total ?? 0)} de ${historyQ.data?.total ?? 0}`
                : "Sin resultados"}
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="size-8"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="size-4" />
              </Button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum: number;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (page <= 3) {
                  pageNum = i + 1;
                } else if (page >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = page - 2 + i;
                }
                return (
                  <Button
                    key={pageNum}
                    variant={pageNum === page ? "default" : "outline"}
                    size="icon"
                    className={`size-8 text-xs ${pageNum === page ? "bg-gold hover:bg-gold/90 text-primary-foreground" : ""}`}
                    onClick={() => setPage(pageNum)}
                  >
                    {pageNum}
                  </Button>
                );
              })}
              <Button
                variant="outline"
                size="icon"
                className="size-8"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* ─── Sale Detail Dialog ─── */}
      <SaleDetailDialog
        saleId={selectedSaleId}
        open={detailOpen}
        onOpenChange={(b) => {
          setDetailOpen(b);
          if (!b) setSelectedSaleId(null);
        }}
        onCancelled={() => {
          historyQ.refetch();
          summaryQ.refetch();
        }}
      />
    </div>
  );
}

function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <th className={`p-3 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider ${className || ""}`}>
      {children}
    </th>
  );
}
