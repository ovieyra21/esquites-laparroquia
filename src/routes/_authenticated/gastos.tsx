import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useRef, useCallback } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  createExpense,
  listExpenses,
  deleteExpense,
  getExpenseSummary,
  payExpense,
  type Expense,
} from "@/lib/expenses.functions";
import { getPrintSettings } from "@/lib/settings.functions";
import { smartPrintEmployeePayment } from "@/lib/escpos";
import { fmt } from "@/store/cart";
import {
  Receipt,
  Plus,
  Trash2,
  Camera,
  Loader2,
  Scan,
  FileText,
  X,
  Eye,
  Calendar,
  Filter,
  DollarSign,
  Clock,
  CheckCircle2,
  Printer,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const CATEGORIES = [
  { id: "insumos", label: "Insumos", icon: "🛒" },
  { id: "servicios", label: "Servicios", icon: "🔧" },
  { id: "renta", label: "Renta", icon: "🏠" },
  { id: "transporte", label: "Transporte", icon: "🚚" },
  { id: "empaque", label: "Empaque", icon: "📦" },
  { id: "marketing", label: "Marketing", icon: "📱" },
  { id: "impuestos", label: "Impuestos", icon: "📋" },
  { id: "pago_empleado", label: "Pago a empleado", icon: "👤" },
  { id: "otros", label: "Otros", icon: "📌" },
];

const catLabel = (id: string) => CATEGORIES.find((c) => c.id === id)?.label ?? id;
const catIcon = (id: string) => CATEGORIES.find((c) => c.id === id)?.icon ?? "📌";

const PAYMENT_PERIODS = [
  { id: "semanal", label: "Semanal" },
  { id: "quincenal", label: "Quincenal" },
  { id: "mensual", label: "Mensual" },
  { id: "bonificacion", label: "Bonificación" },
  { id: "extra", label: "Tiempo extra" },
  { id: "otro", label: "Otro" },
];

export const Route = createFileRoute("/_authenticated/gastos")({
  head: () => ({ meta: [{ title: "Gastos · Esquites La Parroquia" }] }),
  component: GastosPage,
});

function GastosPage() {
  const qc = useQueryClient();
  const fnList = useServerFn(listExpenses);
  const fnSummary = useServerFn(getExpenseSummary);
  const fnDelete = useServerFn(deleteExpense);
  const fnPay = useServerFn(payExpense);

  const [page, setPage] = useState(1);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [addOpen, setAddOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const expensesQ = useQuery({
    queryKey: ["expenses", page, dateFrom, dateTo, catFilter, statusFilter],
    queryFn: () =>
      fnList({
        data: {
          page,
          pageSize: 20,
          dateFrom: dateFrom || null,
          dateTo: dateTo || null,
          category: catFilter !== "all" ? catFilter : null,
          status: statusFilter !== "all" ? statusFilter : null,
        },
      }),
  });

  const summaryQ = useQuery({
    queryKey: ["expenses-summary", dateFrom, dateTo],
    queryFn: () => fnSummary({ data: { dateFrom: dateFrom || undefined, dateTo: dateTo || undefined } }),
  });

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar este gasto?")) return;
    try {
      await fnDelete({ data: { id } });
      qc.invalidateQueries({ queryKey: ["expenses"] });
      qc.invalidateQueries({ queryKey: ["expenses-summary"] });
      toast.success("Gasto eliminado");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handlePay = async (expense: Expense) => {
    if (!confirm(`¿Marcar como pagado el gasto a "${expense.paid_to || expense.supplier}" por ${fmt(expense.amount)}?`)) return;
    try {
      await fnPay({ data: { id: expense.id } });
      qc.invalidateQueries({ queryKey: ["expenses"] });
      qc.invalidateQueries({ queryKey: ["expenses-summary"] });
      toast.success("Gasto marcado como pagado");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const totalPages = Math.max(1, Math.ceil((expensesQ.data?.total ?? 0) / 20));
  const summary = summaryQ.data;

  return (
    <div className="p-4 lg:p-6 max-w-6xl mx-auto space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl">Control de Gastos</h1>
          <p className="text-sm text-muted-foreground">
            Registra y escanea tickets de compra.
          </p>
        </div>
        <Button onClick={() => setAddOpen(true)} className="bg-gold hover:bg-gold/90 text-primary-foreground font-bold gap-2">
          <Plus className="size-4" /> Nuevo gasto
        </Button>
      </header>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="p-4 bg-gradient-to-br from-red-500/10 to-red-500/5 border-red-500/20">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="size-4 text-red-500" />
            <span className="text-xs text-muted-foreground">Total gastos</span>
          </div>
          <p className="text-2xl font-bold text-red-500">
            {summaryQ.isLoading ? "..." : fmt(summary?.total ?? 0)}
          </p>
        </Card>
        <Card className="p-4 bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
          <div className="flex items-center gap-2 mb-1">
            <Receipt className="size-4 text-blue-500" />
            <span className="text-xs text-muted-foreground">Comprobantes</span>
          </div>
          <p className="text-2xl font-bold text-blue-500">
            {summaryQ.isLoading ? "..." : summary?.count ?? 0}
          </p>
        </Card>
        <Card className="p-4 bg-gradient-to-br from-amber-500/10 to-amber-500/5 border-amber-500/20">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="size-4 text-amber-500" />
            <span className="text-xs text-muted-foreground">Pendientes</span>
          </div>
          <p className="text-2xl font-bold text-amber-500">
            {summaryQ.isLoading ? "..." : fmt(summary?.pendingTotal ?? 0)}
          </p>
        </Card>
        <Card className="col-span-1 p-4">
          <div className="text-xs text-muted-foreground mb-2">Por categoría</div>
          <div className="flex flex-wrap gap-1.5">
            {summary?.byCategory?.map((c: any) => (
              <Badge key={c.category} variant="secondary" className="text-[10px]">
                {catIcon(c.category)} {catLabel(c.category)}: {fmt(c.total)}
              </Badge>
            ))}
            {!summaryQ.isLoading && (!summary?.byCategory || summary.byCategory.length === 0) && (
              <span className="text-xs text-muted-foreground">Sin datos</span>
            )}
          </div>
        </Card>
      </div>

      <Card className="p-3">
        <div className="flex flex-wrap gap-2 items-center">
          <Calendar className="size-4 text-muted-foreground shrink-0" />
          <Input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }} className="w-36 h-9 text-xs" />
          <span className="text-muted-foreground text-xs">—</span>
          <Input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }} className="w-36 h-9 text-xs" />
          <Select value={catFilter} onValueChange={(v) => { setCatFilter(v); setPage(1); }}>
            <SelectTrigger className="w-40 h-9 text-xs"><Filter className="size-3 mr-1" /><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las categorías</SelectItem>
              {CATEGORIES.map((c) => <SelectItem key={c.id} value={c.id}>{c.icon} {c.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
            <SelectTrigger className="w-36 h-9 text-xs"><SelectValue placeholder="Estado" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              <SelectItem value="pagado">Pagados</SelectItem>
              <SelectItem value="pendiente">Pendientes</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="ghost" size="sm" onClick={() => { setDateFrom(""); setDateTo(""); setCatFilter("all"); setStatusFilter("all"); setPage(1); }} className="text-xs">Limpiar</Button>
        </div>
      </Card>

      <Card className="overflow-hidden">
        {expensesQ.isLoading ? (
          <div className="py-12 text-center"><Loader2 className="size-8 animate-spin text-gold mx-auto" /></div>
        ) : (expensesQ.data?.expenses ?? []).length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            <Receipt className="size-12 mx-auto opacity-20 mb-3" />
            <p>No hay gastos registrados.</p>
          </div>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead className="bg-surface-2 text-left">
                <tr>
                  <th className="p-3">Fecha</th>
                  <th className="p-3">Categoría</th>
                  <th className="p-3">Proveedor</th>
                  <th className="p-3 hidden md:table-cell">Descripción</th>
                  <th className="p-3">Estado</th>
                  <th className="p-3 text-right">Monto</th>
                  <th className="p-3 text-right w-28">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {(expensesQ.data?.expenses ?? []).map((e: Expense) => (
                  <tr key={e.id} className={`border-t border-border hover:bg-surface/50 ${e.status === "pendiente" ? "bg-amber-500/5" : ""}`}>
                    <td className="p-3 text-xs whitespace-nowrap">
                      {format(new Date(e.expense_date + "T12:00:00"), "dd/MM/yy", { locale: es })}
                    </td>
                    <td className="p-3">
                      <Badge variant="secondary" className="text-[10px]">
                        {catIcon(e.category)} {catLabel(e.category)}
                      </Badge>
                    </td>
                    <td className="p-3 text-xs font-medium">
                      {e.category === "pago_empleado" && e.paid_to ? e.paid_to : e.supplier || "—"}
                      {e.payment_period && <span className="block text-[9px] text-muted-foreground">{e.payment_period}</span>}
                    </td>
                    <td className="p-3 text-xs text-muted-foreground hidden md:table-cell truncate max-w-[200px]">
                      {e.description || "—"}
                    </td>
                    <td className="p-3">
                      {e.status === "pendiente" ? (
                        <Badge className="bg-amber-500/20 text-amber-600 border-amber-500/30 text-[10px]">
                          <Clock className="size-3 mr-1 inline" /> Pendiente
                        </Badge>
                      ) : (
                        <Badge className="bg-green-500/20 text-green-600 border-green-500/30 text-[10px]">
                          <CheckCircle2 className="size-3 mr-1 inline" /> Pagado
                        </Badge>
                      )}
                    </td>
                    <td className="p-3 text-right font-bold text-red-500">{fmt(e.amount)}</td>
                    <td className="p-3 text-right">
                      <div className="flex justify-end gap-1">
                        {e.status === "pendiente" && (
                          <Button variant="ghost" size="icon" className="size-7 hover:text-green-500" onClick={() => handlePay(e)} title="Marcar como pagado">
                            <CheckCircle2 className="size-3.5" />
                          </Button>
                        )}
                        {e.photo_url && (
                          <Button variant="ghost" size="icon" className="size-7" onClick={() => setPreviewUrl(e.photo_url!)} title="Ver ticket">
                            <Eye className="size-3.5" />
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" className="size-7 hover:text-destructive" onClick={() => handleDelete(e.id)} title="Eliminar">
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {totalPages > 1 && (
              <div className="flex justify-center gap-1 p-3 border-t border-border">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let num: number;
                  if (totalPages <= 5) num = i + 1;
                  else if (page <= 3) num = i + 1;
                  else if (page >= totalPages - 2) num = totalPages - 4 + i;
                  else num = page - 2 + i;
                  return (
                    <Button key={num} variant={num === page ? "default" : "outline"} size="icon"
                      className={`size-8 text-xs ${num === page ? "bg-gold" : ""}`}
                      onClick={() => setPage(num)}>{num}</Button>
                  );
                })}
              </div>
            )}
          </>
        )}
      </Card>

      <AddExpenseDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onDone={() => {
          qc.invalidateQueries({ queryKey: ["expenses"] });
          qc.invalidateQueries({ queryKey: ["expenses-summary"] });
        }}
      />

      {previewUrl && (
        <Dialog open={!!previewUrl} onOpenChange={() => setPreviewUrl(null)}>
          <DialogContent className="max-w-2xl bg-card gold-border p-2">
            <img src={previewUrl} alt="Ticket" className="w-full rounded-xl" />
            <Button variant="ghost" className="absolute top-2 right-2" onClick={() => setPreviewUrl(null)}>
              <X className="size-5" />
            </Button>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function AddExpenseDialog({
  open,
  onOpenChange,
  onDone,
}: {
  open: boolean;
  onOpenChange: (b: boolean) => void;
  onDone: () => void;
}) {
  const fnCreate = useServerFn(createExpense);
  const fnPrintSettings = useServerFn(getPrintSettings);
  const [amount, setAmount] = useState(0);
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("insumos");
  const [supplier, setSupplier] = useState("");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [scanning, setScanning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [isPartnerPurchase, setIsPartnerPurchase] = useState(false);
  const [employeeName, setEmployeeName] = useState("");
  const [paymentPeriod, setPaymentPeriod] = useState("quincenal");
  const fileRef = useRef<HTMLInputElement>(null);

  const isEmpleado = category === "pago_empleado";

  const reset = () => {
    setAmount(0); setDescription(""); setCategory("insumos");
    setSupplier(""); setDate(format(new Date(), "yyyy-MM-dd"));
    setPhotoUrl(null); setPhotoFile(null); setIsPartnerPurchase(false);
    setEmployeeName(""); setPaymentPeriod("quincenal");
  };

  const handleFile = (file: File) => {
    setPhotoFile(file);
    setPhotoUrl(URL.createObjectURL(file));
  };

  const uploadPhoto = async (): Promise<string | null> => {
    if (!photoFile) return null;
    const reader = new FileReader();
    return new Promise((resolve) => {
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(photoFile);
    });
  };

  const handleOCR = useCallback(async () => {
    if (!photoFile) {
      toast.error("Primero toma o selecciona una foto del ticket.");
      return;
    }
    setScanning(true);
    try {
      const TesseractModule = await import("tesseract.js");
      const Tesseract = TesseractModule.default;
      const imgUrl = URL.createObjectURL(photoFile);

      const { data: { text } } = await Tesseract.recognize(imgUrl, "spa", {
        logger: () => {},
      });

      URL.revokeObjectURL(imgUrl);

      const lines = text.split("\n").map((l: string) => l.trim()).filter(Boolean);
      toast.success(`OCR completado (${lines.length} líneas)`);

      const cleanText = text
        .replace(/\s+/g, " ")
        .replace(/[|¦]/g, "1")
        .replace(/[OoO]/g, "0");

      const amountPatterns = [
        /(?:TOTAL|TOTAl|T0TAL|IMPORTE|MONTO|SUMA)\s*:?\s*\$?\s*([\d,]+(?:[.,]\d{2}))/i,
        /\$?\s*([\d]{1,3}(?:[,]\d{3})*(?:[.,]\d{2}))\s*$/m,
        /(?:PAGAR|PAGO|TOTAL)\s*\$?\s*([\d,]+(?:[.,]\d{2}))/i,
        /([\d,]+(?:[.,]\d{2}))(?!.*[\d,]+(?:[.,]\d{2}))/,
      ];

      let parsedAmount = 0;
      for (const pattern of amountPatterns) {
        const match = text.match(pattern);
        if (match) {
          const raw = match[1] || match[0];
          const cleaned = raw.replace(/[^\d,.]/g, "").replace(/,/g, "");
          const val = parseFloat(cleaned);
          if (val > 0 && val < 999999) {
            parsedAmount = val;
            break;
          }
        }
      }
      if (parsedAmount > 0) setAmount(parsedAmount);

      const dateMatch = text.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
      if (dateMatch) {
        try {
          let day = parseInt(dateMatch[1]);
          let month = parseInt(dateMatch[2]);
          let year = parseInt(dateMatch[3]);
          if (year < 100) year += 2000;
          if (day > 31) { [day, month] = [month, day]; }
          const d = new Date(year, month - 1, day);
          if (!isNaN(d.getTime())) setDate(format(d, "yyyy-MM-dd"));
        } catch {}
      }

      const skipWords = [
        "ticket", "factura", "compra", "venta", "cliente", "rfc", "fecha",
        "hora", "total", "cambio", "efectivo", "tarjeta", "iva", "subtotal",
        "producto", "cantidad", "precio", "importe", "articulo", "folio",
        "le", "atendio", "gracias", "visita", "www", ".com", ".mx",
      ];
      const nameLine = lines.find((l: string) =>
        l.length > 5 &&
        !skipWords.some((w) => l.toLowerCase().includes(w)) &&
        !/^\d/.test(l) &&
        !/^\$/.test(l) &&
        !/^[\s\-_=]+$/.test(l)
      );
      if (nameLine) setSupplier(nameLine.slice(0, 100));

      if (text.length > 5) {
        const descLines = lines
          .filter((l: string) => l.length > 5 && !skipWords.some((w) => l.toLowerCase().includes(w)))
          .slice(0, 3);
        if (descLines.length > 0) setDescription(descLines.join(" · ").slice(0, 200));
      }
    } catch (e: any) {
      toast.error(`Error de OCR: ${e.message}`);
    } finally {
      setScanning(false);
    }
  }, [photoFile]);

  const handleSave = async () => {
    if (amount <= 0) { toast.error("Ingresa el monto"); return; }
    if (isEmpleado && !employeeName.trim()) { toast.error("Ingresa el nombre del empleado"); return; }
    setSaving(true);
    try {
      let uploadedUrl = photoUrl;
      if (photoFile && photoUrl?.startsWith("blob:")) {
        uploadedUrl = await uploadPhoto();
      }

      const expenseData: any = {
        amount,
        description: description || undefined,
        category,
        expenseDate: date,
        paymentMethod: "efectivo",
        photoUrl: uploadedUrl,
        status: isEmpleado || isPartnerPurchase ? "pendiente" : "pagado",
      };

      if (isEmpleado) {
        expenseData.paidTo = employeeName;
        expenseData.paymentPeriod = paymentPeriod;
      } else if (isPartnerPurchase) {
        expenseData.paidTo = supplier || "Socio";
      }

      await fnCreate({ data: expenseData });

      if (isEmpleado) {
        try {
          const settings = await fnPrintSettings({}) as any;
          const result = await smartPrintEmployeePayment(
            {
              employeeName: employeeName,
              amount,
              period: PAYMENT_PERIODS.find(p => p.id === paymentPeriod)?.label || paymentPeriod,
              paymentDate: date,
              notes: description || undefined,
            },
            settings,
          );
          if (result === "browser") {
            toast.info("Vista previa del comprobante de pago generada");
          } else {
            toast.success("Comprobante de pago impreso");
          }
        } catch (printErr: any) {
          toast.warning(`Gasto guardado, pero no se pudo imprimir: ${printErr.message}`);
        }
      }

      toast.success(isEmpleado ? "Pago a empleado registrado" : "Gasto registrado");
      reset();
      onOpenChange(false);
      onDone();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="max-w-lg bg-card gold-border max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-xl flex items-center gap-2">
            <Receipt className="size-5 text-gold" />
            {isEmpleado ? "Registrar pago a empleado" : "Registrar gasto"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {!isEmpleado && (
            <div className="space-y-2">
              <Label>Ticket o nota de compra</Label>

              {!photoFile ? (
                <div
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOver(false);
                    const file = e.dataTransfer.files[0];
                    if (file && file.type.startsWith("image/")) handleFile(file);
                  }}
                  onClick={() => fileRef.current?.click()}
                  className={`relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                    dragOver
                      ? "border-gold bg-gold/10 scale-[1.02]"
                      : "border-border hover:border-gold/50 hover:bg-surface/50"
                  }`}
                >
                  <div className="flex flex-col items-center gap-2 pointer-events-none">
                    {dragOver ? (
                      <>
                        <div className="size-14 rounded-2xl bg-gold/20 flex items-center justify-center">
                          <FileText className="size-7 text-gold animate-bounce" />
                        </div>
                        <span className="text-sm font-bold text-gold">¡Suelta aquí!</span>
                      </>
                    ) : (
                      <>
                        <div className="size-14 rounded-2xl bg-surface-2 flex items-center justify-center">
                          <Camera className="size-6 text-muted-foreground" />
                        </div>
                        <div>
                          <span className="text-sm font-medium">
                            Arrastra el ticket aquí
                          </span>
                          <span className="text-xs text-muted-foreground block">
                            o haz clic para usar la cámara
                          </span>
                        </div>
                        <span className="text-[10px] text-muted-foreground">JPG, PNG · máx 10MB</span>
                      </>
                    )}
                  </div>
                </div>
              ) : (
                <div className="relative rounded-xl overflow-hidden border border-border group">
                  <img src={photoUrl!} alt="Ticket" className="w-full max-h-56 object-contain bg-black/5" />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                    <Button size="sm" variant="secondary" onClick={() => fileRef.current?.click()}>
                      <Camera className="size-4 mr-1" /> Cambiar
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => { setPhotoUrl(null); setPhotoFile(null); }}>
                      <X className="size-4 mr-1" /> Quitar
                    </Button>
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 gap-1.5"
                  onClick={() => fileRef.current?.click()}
                >
                  <Camera className="size-3.5" />
                  {photoFile ? "Cambiar foto" : "Cámara"}
                </Button>
                <Button
                  variant={photoFile ? "default" : "outline"}
                  size="sm"
                  className={`gap-1.5 flex-1 ${photoFile ? "bg-gold hover:bg-gold/90 text-primary-foreground" : ""}`}
                  onClick={handleOCR}
                  disabled={!photoFile || scanning}
                >
                  {scanning ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Scan className="size-3.5" />
                  )}
                  {scanning ? "Leyendo..." : photoFile ? "Escanear ticket" : "Escanear"}
                </Button>
              </div>

              <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />

              {scanning && (
                <div className="text-xs text-center text-muted-foreground animate-pulse py-1">
                  Analizando ticket con OCR... esto puede tardar unos segundos.
                </div>
              )}
            </div>
          )}

          {isEmpleado && (
            <div className="rounded-xl bg-blue-500/5 border border-blue-500/20 p-4 text-center">
              <User className="size-10 mx-auto text-blue-400 mb-2" />
              <p className="text-sm font-medium text-blue-600">Registrando pago a empleado</p>
              <p className="text-xs text-muted-foreground mt-1">Al guardar se generará un comprobante de pago imprimible.</p>
            </div>
          )}

          <div>
            <Label>{isEmpleado ? "Monto del pago" : "Monto"}</Label>
            <Input type="number" step="0.01" value={amount || ""}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="h-14 text-2xl font-bold" placeholder="0.00" />
          </div>

          <div>
            <Label>Categoría</Label>
            <Select value={category} onValueChange={(v) => { setCategory(v); if (v !== "pago_empleado") setEmployeeName(""); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.icon} {c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isEmpleado ? (
            <>
              <div>
                <Label>Nombre del empleado</Label>
                <Input value={employeeName} onChange={(e) => setEmployeeName(e.target.value)}
                  placeholder="Ej. Juan Pérez" className="h-12" />
              </div>
              <div>
                <Label>Periodo de pago</Label>
                <Select value={paymentPeriod} onValueChange={setPaymentPeriod}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PAYMENT_PERIODS.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Proveedor</Label>
                <Input value={supplier} onChange={(e) => setSupplier(e.target.value)}
                  placeholder="Ej. Central de Abastos" />
              </div>
              <div>
                <Label>Fecha</Label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
            </div>
          )}

          {isEmpleado && (
            <div>
              <Label>Fecha de pago</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          )}

          <div>
            <Label>Descripción (opcional)</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)}
              placeholder={isEmpleado ? "Ej. Pago de nómina semanal" : "Ej. 5kg de elote blanco, queso, crema"} />
          </div>

          {!isEmpleado && (
            <div className="flex items-start gap-3 p-3 rounded-xl bg-amber-500/5 border border-amber-500/20">
              <input type="checkbox" id="partnerPurchase" checked={isPartnerPurchase}
                onChange={(e) => setIsPartnerPurchase(e.target.checked)}
                className="mt-1 size-4 accent-amber-500" />
              <label htmlFor="partnerPurchase" className="text-xs leading-relaxed cursor-pointer">
                <span className="font-semibold text-amber-600">Compra realizada por socio</span>
                <span className="block text-muted-foreground">
                  No se tomó dinero de la caja. El gasto quedará <strong>pendiente de pago</strong> hasta que se liquide al socio.
                </span>
              </label>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
          <Button variant="outline" onClick={() => { reset(); onOpenChange(false); }}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving || amount <= 0 || (isEmpleado && !employeeName.trim())}
            className="bg-gold hover:bg-gold/90 text-primary-foreground font-bold gap-2">
            {saving ? <Loader2 className="size-4 animate-spin" /> : isEmpleado ? <Printer className="size-4" /> : null}
            {saving ? "Guardando..." : isEmpleado ? "Guardar e imprimir comprobante" : "Guardar gasto"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
