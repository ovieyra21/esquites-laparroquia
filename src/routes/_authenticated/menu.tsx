import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { QRCodeCanvas } from "qrcode.react";
import { Upload, FileText, QrCode, Download, Trash2, CheckCircle2, ExternalLink, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  listMenus,
  uploadMenu,
  setActiveMenu,
  deleteMenu,
  getMenuSignedUrl,
} from "@/lib/menus.functions";

export const Route = createFileRoute("/_authenticated/menu")({
  ssr: false,
  component: MenuPage,
});

type Menu = {
  id: string;
  filename: string | null;
  file_url: string | null;
  active: boolean | null;
  uploaded_at: string | null;
};

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1] ?? "");
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function MenuPage() {
  const list = useServerFn(listMenus);
  const upload = useServerFn(uploadMenu);
  const activate = useServerFn(setActiveMenu);
  const remove = useServerFn(deleteMenu);
  const signed = useServerFn(getMenuSignedUrl);

  const [menus, setMenus] = useState<Menu[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const qrRef = useRef<HTMLDivElement>(null);

  const active = menus.find((m) => m.active) ?? null;

  const publicUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    if (!active) return "";
    return `${window.location.origin}/m/${active.id}`;
  }, [active]);

  const load = async () => {
    setLoading(true);
    try {
      const data = await list();
      setMenus(data as Menu[]);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const onPick = () => inputRef.current?.click();

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.type !== "application/pdf") {
      toast.error("Sólo se permiten archivos PDF.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("El PDF no puede superar 10 MB.");
      return;
    }
    setUploading(true);
    try {
      const base64 = await fileToBase64(file);
      await upload({ data: { filename: file.name, base64, contentType: "application/pdf" } });
      toast.success("Menú subido correctamente.");
      await load();
    } catch (err: any) {
      toast.error(err.message ?? "Error al subir el menú.");
    } finally {
      setUploading(false);
    }
  };

  const onActivate = async (id: string) => {
    try {
      await activate({ data: { id } });
      toast.success("Menú activado.");
      load();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const onDelete = async (id: string) => {
    if (!confirm("¿Eliminar este menú? Esta acción no se puede deshacer.")) return;
    try {
      await remove({ data: { id } });
      toast.success("Menú eliminado.");
      load();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const onView = async (id: string) => {
    try {
      const { url } = await signed({ data: { id } });
      window.open(url, "_blank", "noopener");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const downloadQr = () => {
    const canvas = qrRef.current?.querySelector("canvas");
    if (!canvas) return;
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = "menu-qr.png";
    a.click();
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      toast.success("Enlace copiado.");
    } catch {
      toast.error("No se pudo copiar.");
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-6">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-3xl gold-text">Menú Digital & QR</h1>
          <p className="text-muted-foreground text-sm">Sube tu menú en PDF y comparte el QR con los clientes.</p>
        </div>
        <Button onClick={onPick} disabled={uploading} className="gap-2">
          {uploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
          {uploading ? "Subiendo..." : "Subir PDF"}
        </Button>
        <input ref={inputRef} type="file" accept="application/pdf" className="hidden" onChange={onFile} />
      </header>

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="p-6 space-y-4">
          <h2 className="font-display text-xl flex items-center gap-2">
            <QrCode className="size-5 text-gold" /> Código QR del menú activo
          </h2>
          {active ? (
            <>
              <div ref={qrRef} className="bg-white p-6 rounded-2xl mx-auto w-fit">
                <QRCodeCanvas value={publicUrl} size={240} level="H" includeMargin />
              </div>
              <div className="text-xs text-muted-foreground break-all text-center">{publicUrl}</div>
              <div className="flex gap-2 flex-wrap justify-center">
                <Button variant="outline" onClick={copyLink} className="gap-2">
                  <ExternalLink className="size-4" /> Copiar enlace
                </Button>
                <Button onClick={downloadQr} className="gap-2">
                  <Download className="size-4" /> Descargar QR
                </Button>
              </div>
            </>
          ) : (
            <div className="text-sm text-muted-foreground text-center py-12">
              No hay un menú activo. Sube un PDF y actívalo para generar el QR.
            </div>
          )}
        </Card>

        <Card className="p-6 space-y-4">
          <h2 className="font-display text-xl flex items-center gap-2">
            <FileText className="size-5 text-gold" /> Menús cargados
          </h2>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>
          ) : menus.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-8">Aún no has subido ningún menú.</div>
          ) : (
            <ul className="space-y-2">
              {menus.map((m) => (
                <li key={m.id} className="flex items-center gap-3 p-3 rounded-lg bg-card border border-border">
                  <FileText className="size-5 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{m.filename ?? "Menú"}</div>
                    <div className="text-xs text-muted-foreground">
                      {m.uploaded_at ? new Date(m.uploaded_at).toLocaleString("es-MX") : "—"}
                    </div>
                  </div>
                  {m.active && <Badge className="bg-gold/20 text-gold border-gold/40 gap-1"><CheckCircle2 className="size-3" /> Activo</Badge>}
                  <Button size="sm" variant="ghost" onClick={() => onView(m.id)} title="Ver PDF"><ExternalLink className="size-4" /></Button>
                  {!m.active && (
                    <Button size="sm" variant="outline" onClick={() => onActivate(m.id)}>Activar</Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => onDelete(m.id)} title="Eliminar">
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
