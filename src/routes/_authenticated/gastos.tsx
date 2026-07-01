import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useRef, useCallback } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  createExpense,
  listExpenses,
  deleteExpense,
  getExpenseSummary,
  type Expense,
} from "@/lib/expenses.functions";
import { supabase } from "@/integrations/supabase/client";
import { fmt } from "@/store/cart";
import {
  Receipt,
  Plus,
  Trash2,
  Camera,
  Loader2,
  Scan,
  FileText,
  Upload,
  X,
  Eye,
  ChevronDown,
  ChevronRight,
  Calendar,
  Filter,
  DollarSign,
  ShoppingCart,
  Store,
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
  { id: "otros", label: "Otros", icon: "📌" },
];

const catLabel = (id: string) => CATEGORIES.find((c) => c.id === id)?.label ?? id;
const catIcon = (id: string) => CATEGORIES.find((c) => c.id === id)?.icon ?? "📌";

export const Route = createFileRoute("/_authenticated/gastos")({
  head: () => ({ meta: [{ title: "Gastos · Esquites La Parroquia" }] }),
  component: GastosPage,
});

function GastosPage() {
  const qc = useQueryClient();
  const fnList = useServerFn(listExpenses);
  const fnSummary = useServerFn(getExpenseSummary);
  const fnDelete = useServerFn(deleteExpense);

  const [page, setPage] = useState(1);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const [addOpen, setAddOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const expensesQ = useQuery({
    queryKey: ["expenses", page, dateFrom, dateTo, catFilter],
    queryFn: () =>
      fnList({
        data: {
          page,
          pageSize: 20,
          dateFrom: dateFrom || null,
          dateTo: dateTo || null,
          category: catFilter !== "all" ? catFilter : null,
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

      {/* Summary */}
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
        <Card className="col-span-2 p-4">
          <div className="text-xs text-muted-foreground mb-2">Por categoría</div>
          <div className="flex flex-wrap gap-1.5">
            {summary?.byCategory?.map((c) => (
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

      {/* Filters */}
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
          <Button variant="ghost" size="sm" onClick={() => { setDateFrom(""); setDateTo(""); setCatFilter("all"); setPage(1); }} className="text-xs">Limpiar</Button>
        </div>
      </Card>

      {/* Expenses list */}
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
                  <th className="p-3 text-right">Monto</th>
                  <th className="p-3 text-right w-20">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {(expensesQ.data?.expenses ?? []).map((e: Expense) => (
                  <tr key={e.id} className="border-t border-border hover:bg-surface/50">
                    <td className="p-3 text-xs whitespace-nowrap">
                      {format(new Date(e.expense_date + "T12:00:00"), "dd/MM/yy", { locale: es })}
                    </td>
                    <td className="p-3">
                      <Badge variant="secondary" className="text-[10px]">
                        {catIcon(e.category)} {catLabel(e.category)}
                      </Badge>
                    </td>
                    <td className="p-3 text-xs font-medium">{e.supplier || "—"}</td>
                    <td className="p-3 text-xs text-muted-foreground hidden md:table-cell truncate max-w-[200px]">
                      {e.description || "—"}
                    </td>
                    <td className="p-3 text-right font-bold text-red-500">{fmt(e.amount)}</td>
                    <td className="p-3 text-right">
                      <div className="flex justify-end gap-1">
                        {e.photo_url && (
                          <Button variant="ghost" size="icon" className="size-7" onClick={() => setPreviewUrl(e.photo_url)} title="Ver ticket">
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
            {/* Pagination */}
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

      {/* Add Dialog */}
      <AddExpenseDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onDone={() => {
          qc.invalidateQueries({ queryKey: ["expenses"] });
          qc.invalidateQueries({ queryKey: ["expenses-summary"] });
        }}
      />

      {/* Photo preview */}
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
  const fileRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setAmount(0); setDescription(""); setCategory("insumos");
    setSupplier(""); setDate(format(new Date(), "yyyy-MM-dd"));
    setPhotoUrl(null); setPhotoFile(null);
  };

  const handleFile = (file: File) => {
    setPhotoFile(file);
    setPhotoUrl(URL.createObjectURL(file));
  };

  const uploadPhoto = async (): Promise<string | null> => {
    if (!photoFile) return null;
    const path = `${Date.now()}-${photoFile.name}`;
    const { error } = await supabase.storage.from("receipts").upload(path, photoFile);
    if (error) { toast.error("Error al subir foto"); return null; }
    return path;
  };


  const handleOCR = async () => {
    if (!photoFile) {
      toast.error("Primero toma o selecciona una foto del ticket.");
      return;
    }
    setScanning(true);
    try {
      const Tesseract = (await import("tesseract.js")).default;
      const imgUrl = URL.createObjectURL(photoFile);

      const { data: { text } } = await Tesseract.recognize(imgUrl, "spa", {
        logger: (m) => {
          if (m.status === "recognizing text") {
            // progress could be shown here
          }
        },
      });

      URL.revokeObjectURL(imgUrl);

      // Parse OCR text
      const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
      toast.success(`OCR completado (${lines.length} líneas)`);

      // Try to find amount (looks for $XX.XX patterns)
      const amountMatch = text.match(/\$?\s*(\d{1,6}(?:[.,]\d{2}))\s*$/m) ||
        text.match(/TOTAL\s*:?\s*\$?\s*(\d{1,6}(?:[.,]\d{2}))/i) ||
        text.match(/(\d{1,6}(?:[.,]\d{2}))/g)?.pop();

      if (amountMatch) {
        const val = parseFloat((amountMatch[1] || amountMatch[0]).replace(",", "."));
        if (val > 0) setAmount(val);
      }

      // Try to find date
      const dateMatch = text.match(/(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/);
      if (dateMatch) {
        try {
          const parts = dateMatch[1].split(/[\/\-]/);
          const d = new Date(+parts[2].length === 2 ? "20" + parts[2] : parts[2], +parts[1] - 1, +parts[0]);
          if (!isNaN(d.getTime())) setDate(format(d, "yyyy-MM-dd"));
        } catch {}
      }

      // Try to find store/supplier (first few meaningful lines)
      const skipWords = ["ticket", "factura", "compra", "venta", "cliente", "rfc", "fecha", "hora", "total", "cambio", "efectivo", "tarjeta", "iva", "subtotal", "producto", "cantidad", "precio", "importe"];
      const nameLine = lines.find((l) => l.length > 3 && !skipWords.some((w) => l.toLowerCase().includes(w)) && !/^\d/.test(l) && !/^\$/.test(l));
      if (nameLine) setSupplier(nameLine.slice(0, 100));

      // Use raw text as description
      if (text.length > 5) setDescription(lines.slice(0, 3).join(" · ").slice(0, 200));

    } catch (e: any) {
      toast.error(`Error de OCR: ${e.message}`);
    } finally {
      setScanning(false);
    }
  };

  const handleSave = async () => {
    if (amount <= 0) { toast.error("Ingresa el monto"); return; }
    setSaving(true);
    try {
      let uploadedUrl = photoUrl;
      if (photoFile && photoUrl?.startsWith("blob:")) {
        uploadedUrl = await uploadPhoto();
      }
      await fnCreate({
        data: {
          amount, description: description || undefined,
          category, supplier: supplier || undefined,
          expenseDate: date, paymentMethod: "efectivo",
          photoUrl: uploadedUrl,
        },
      });
      toast.success("Gasto registrado");
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
            <Receipt className="size-5 text-gold" /> Registrar gasto
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Photo + OCR with Drag & Drop */}
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

          {/* Amount */}
          <div>
            <Label>Monto</Label>
            <Input type="number" step="0.01" value={amount || ""}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="h-14 text-2xl font-bold" placeholder="0.00" />
          </div>

          {/* Category */}
          <div>
            <Label>Categoría</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.icon} {c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Supplier + date */}
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

          {/* Description */}
          <div>
            <Label>Descripción (opcional)</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)}
              placeholder="Ej. 5kg de elote blanco, queso, crema" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => { reset(); onOpenChange(false); }}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving || amount <= 0}
            className="bg-gold hover:bg-gold/90 text-primary-foreground font-bold">
            {saving ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
            Guardar gasto
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
