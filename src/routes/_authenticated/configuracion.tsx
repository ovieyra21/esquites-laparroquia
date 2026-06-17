import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Save, Printer, Building2, Loader2, TestTube2 } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getSettings, updateSettings } from "@/lib/settings.functions";
import { testPrinter } from "@/lib/printer.functions";

export const Route = createFileRoute("/_authenticated/configuracion")({
  ssr: false,
  component: ConfigPage,
});

type Settings = {
  business_name: string | null;
  slogan: string | null;
  address: string | null;
  phone: string | null;
  rfc: string | null;
  footer_message: string | null;
  whatsapp_number: string | null;
  tax: number | null;
  printer_enabled: boolean | null;
  printer_ip: string | null;
  printer_port: number | null;
  printer_width: number | null;
  auto_print: boolean | null;
  auto_cut: boolean | null;
  open_drawer: boolean | null;
};

const defaults: Settings = {
  business_name: "Esquites La Parroquia",
  slogan: "El sabor que nos une",
  address: "", phone: "", rfc: "",
  footer_message: "¡Gracias por su compra!",
  whatsapp_number: "",
  tax: 0,
  printer_enabled: false, printer_ip: "", printer_port: 9100, printer_width: 80,
  auto_print: false, auto_cut: true, open_drawer: false,
};

function ConfigPage() {
  const fnGet = useServerFn(getSettings);
  const fnUpdate = useServerFn(updateSettings);
  const fnTest = useServerFn(testPrinter);

  const [s, setS] = useState<Settings>(defaults);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const data = await fnGet();
        if (data) setS({ ...defaults, ...data });
      } catch (e: any) { toast.error(e.message); }
      finally { setLoading(false); }
    })();
  }, []);

  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => setS((p) => ({ ...p, [k]: v }));

  const onSave = async () => {
    setSaving(true);
    try {
      await fnUpdate({
        data: {
          business_name: s.business_name ?? undefined,
          slogan: s.slogan ?? undefined,
          address: s.address ?? undefined,
          phone: s.phone ?? undefined,
          rfc: s.rfc ?? undefined,
          footer_message: s.footer_message ?? undefined,
          whatsapp_number: s.whatsapp_number ?? undefined,
          tax: s.tax ?? 0,
          printer_enabled: !!s.printer_enabled,
          printer_ip: s.printer_ip ?? undefined,
          printer_port: s.printer_port ?? 9100,
          printer_width: (s.printer_width === 58 ? 58 : 80) as 58 | 80,
          auto_print: !!s.auto_print,
          auto_cut: !!s.auto_cut,
          open_drawer: !!s.open_drawer,
        },
      });
      toast.success("Configuración guardada");
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  const onTest = async () => {
    setTesting(true);
    try {
      await fnTest({ data: {} });
      toast.success("Ticket de prueba enviado a la impresora");
    } catch (e: any) {
      toast.error(`No se pudo imprimir: ${e.message}`);
    } finally { setTesting(false); }
  };

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-6">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-3xl gold-text">Configuración</h1>
          <p className="text-muted-foreground text-sm">Datos del negocio e impresora térmica.</p>
        </div>
        <Button onClick={onSave} disabled={saving} className="gap-2">
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Guardar cambios
        </Button>
      </header>

      <Tabs defaultValue="business" className="space-y-4">
        <TabsList>
          <TabsTrigger value="business"><Building2 className="size-4 mr-2" /> Negocio</TabsTrigger>
          <TabsTrigger value="printer"><Printer className="size-4 mr-2" /> Impresora</TabsTrigger>
        </TabsList>

        <TabsContent value="business">
          <Card className="p-6 space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>Nombre del negocio</Label>
                <Input value={s.business_name ?? ""} maxLength={255} onChange={(e) => set("business_name", e.target.value)} />
              </div>
              <div>
                <Label>Eslogan</Label>
                <Input value={s.slogan ?? ""} maxLength={255} onChange={(e) => set("slogan", e.target.value)} />
              </div>
              <div className="md:col-span-2">
                <Label>Dirección</Label>
                <Textarea rows={2} value={s.address ?? ""} maxLength={500} onChange={(e) => set("address", e.target.value)} />
              </div>
              <div>
                <Label>Teléfono</Label>
                <Input value={s.phone ?? ""} maxLength={50} onChange={(e) => set("phone", e.target.value)} />
              </div>
              <div>
                <Label>WhatsApp para pedidos</Label>
                <Input value={s.whatsapp_number ?? ""} maxLength={20} placeholder="524171234567"
                  onChange={(e) => set("whatsapp_number", e.target.value)} />
                <p className="text-[10px] text-muted-foreground mt-1">Solo dígitos, con código de país. Ej: 521…</p>
              </div>
              <div>
                <Label>RFC</Label>
                <Input value={s.rfc ?? ""} maxLength={20} onChange={(e) => set("rfc", e.target.value)} />
              </div>
              <div>
                <Label>IVA (%)</Label>
                <Input type="number" step="0.5" min="0" max="100"
                  value={s.tax ?? 0}
                  onChange={(e) => set("tax", Number(e.target.value))} />
              </div>
              <div className="md:col-span-2">
                <Label>Mensaje al pie del ticket</Label>
                <Input value={s.footer_message ?? ""} maxLength={255} onChange={(e) => set("footer_message", e.target.value)} />
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="printer">
          <Card className="p-6 space-y-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <Label className="text-base">Impresora térmica WiFi</Label>
                <p className="text-xs text-muted-foreground">ESC/POS por TCP (puerto 9100).</p>
              </div>
              <Switch checked={!!s.printer_enabled} onCheckedChange={(v) => set("printer_enabled", v)} />
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <Label>IP de la impresora</Label>
                <Input value={s.printer_ip ?? ""} maxLength={45} placeholder="192.168.1.50"
                  onChange={(e) => set("printer_ip", e.target.value)} />
              </div>
              <div>
                <Label>Puerto</Label>
                <Input type="number" min="1" max="65535" value={s.printer_port ?? 9100}
                  onChange={(e) => set("printer_port", Number(e.target.value))} />
              </div>
              <div>
                <Label>Ancho del papel</Label>
                <Select value={String(s.printer_width ?? 80)} onValueChange={(v) => set("printer_width", Number(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="58">58 mm</SelectItem>
                    <SelectItem value="80">80 mm</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-3 pt-2 border-t border-border">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Imprimir automáticamente</Label>
                  <p className="text-xs text-muted-foreground">Envía el ticket al cobrar.</p>
                </div>
                <Switch checked={!!s.auto_print} onCheckedChange={(v) => set("auto_print", v)} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Corte automático</Label>
                  <p className="text-xs text-muted-foreground">Corta el papel al final del ticket.</p>
                </div>
                <Switch checked={!!s.auto_cut} onCheckedChange={(v) => set("auto_cut", v)} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Abrir cajón de dinero</Label>
                  <p className="text-xs text-muted-foreground">Envía pulso de apertura tras imprimir.</p>
                </div>
                <Switch checked={!!s.open_drawer} onCheckedChange={(v) => set("open_drawer", v)} />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="outline" onClick={onTest} disabled={testing || !s.printer_ip} className="gap-2">
                {testing ? <Loader2 className="size-4 animate-spin" /> : <TestTube2 className="size-4" />}
                Imprimir ticket de prueba
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">
              Nota: la app envía los tickets desde el servidor en la nube. Para que tu impresora reciba los datos,
              debe ser accesible por internet (por ejemplo, mediante un Cloudflare Tunnel) o configurar el reenvío
              de puerto en tu router hacia la IP/puerto indicados.
            </p>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
