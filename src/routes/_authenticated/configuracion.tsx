import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getSettings, updateSettings } from "@/lib/settings.functions";
import { testPrinter } from "@/lib/printer.functions";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "@/components/ui/form";
import { Building2, Printer, Settings, Save, RefreshCw, PrinterIcon, Image as ImageIcon, X } from "lucide-react";
import { useEffect } from "react";

const settingsSchema = z.object({
  business_name: z.string().min(1, "El nombre es requerido").max(255),
  slogan: z.string().max(255).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  phone: z.string().max(50).optional().nullable(),
  rfc: z.string().max(20).optional().nullable(),
  whatsapp_number: z.string().max(20).optional().nullable(),
  footer_message: z.string().max(255).optional().nullable(),
  printer_enabled: z.boolean().default(false),
  printer_ip: z.string().max(45).optional().nullable(),
  printer_port: z.number().int().min(1).max(65535).default(9100),
  printer_width: z.number().int().default(80),
  auto_print: z.boolean().default(false),
  auto_cut: z.boolean().default(true),
  open_drawer: z.boolean().default(false),
  logo_url: z.string().optional().nullable(),
  logo_data: z.string().optional().nullable(),
  show_logo: z.boolean().default(false),
});

type SettingsValues = z.infer<typeof settingsSchema>;

export const Route = createFileRoute("/_authenticated/configuracion")({
  component: ConfigPage,
});

function ConfigPage() {
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ["settings"],
    queryFn: () => getSettings(),
  });

  const updateMutation = useMutation({
    mutationFn: (values: SettingsValues) => updateSettings({ data: values }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      toast.success("Configuración guardada correctamente");
    },
    onError: (error: any) => {
      toast.error("Error al guardar: " + error.message);
    },
  });

  const testPrintMutation = useMutation({
    mutationFn: () => testPrinter({ data: {} }),
    onSuccess: (res: any) => {
      if (res.ok) {
        toast.success("Ticket de prueba enviado");
      } else {
        toast.error("Error: " + res.error);
      }
    },
    onError: (error: any) => {
      toast.error("Error de conexión: " + error.message);
    },
  });

  const form = useForm<SettingsValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      business_name: "",
      slogan: "",
      address: "",
      phone: "",
      rfc: "",
      whatsapp_number: "",
      footer_message: "",
      printer_enabled: false,
      printer_ip: "",
      printer_port: 9100,
      printer_width: 80,
      auto_print: false,
      auto_cut: true,
      open_drawer: false,
      logo_url: "",
      logo_data: "",
      show_logo: false,
    },
  });

  useEffect(() => {
    if (settings) {
      form.reset({
        business_name: settings.business_name || "",
        slogan: settings.slogan || "",
        address: settings.address || "",
        phone: settings.phone || "",
        rfc: settings.rfc || "",
        whatsapp_number: settings.whatsapp_number || "",
        footer_message: settings.footer_message || "",
        printer_enabled: !!settings.printer_enabled,
        printer_ip: settings.printer_ip || "",
        printer_port: settings.printer_port || 9100,
        printer_width: settings.printer_width || 80,
        auto_print: !!settings.auto_print,
        auto_cut: !!settings.auto_cut,
        open_drawer: !!settings.open_drawer,
        logo_url: settings.logo_url || "",
        logo_data: settings.logo_data || "",
        show_logo: !!settings.show_logo,
      });
    }
  }, [settings, form]);

  const onSubmit = (values: SettingsValues) => {
    updateMutation.mutate(values);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Por favor selecciona una imagen");
      return;
    }

    try {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");
          if (!ctx) return;

          // Redimensionar para impresora térmica (192px es seguro para 58mm y 80mm)
          const maxWidth = 192;
          const scale = maxWidth / img.width;
          canvas.width = maxWidth;
          canvas.height = Math.round(img.height * scale);

          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

          // Convertir a base64 de los bytes RGBA
          const uint8 = new Uint8Array(imageData.data.buffer);
          let binary = "";
          for (let i = 0; i < uint8.length; i++) {
            binary += String.fromCharCode(uint8[i]);
          }
          const base64Data = btoa(binary);

          const logoDataObj = {
            width: canvas.width,
            height: canvas.height,
            data: base64Data,
          };

          form.setValue("logo_url", event.target?.result as string);
          form.setValue("logo_data", JSON.stringify(logoDataObj));
          toast.success("Logo cargado y optimizado");
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    } catch {
      toast.error("Error al procesar la imagen");
    }
  };

  const removeLogo = () => {
    form.setValue("logo_url", "");
    form.setValue("logo_data", "");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-4xl space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Configuración</h1>
        <p className="text-muted-foreground">
          Administra los datos de tu negocio y la configuración de periféricos.
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <Tabs defaultValue="negocio" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="negocio">
                <Building2 className="w-4 h-4 mr-2" />
                Negocio
              </TabsTrigger>
              <TabsTrigger value="impresora">
                <Printer className="w-4 h-4 mr-2" />
                Impresora
              </TabsTrigger>
            </TabsList>

            <TabsContent value="negocio">
              <Card>
                <CardHeader>
                  <CardTitle>Información del Negocio</CardTitle>
                  <CardDescription>
                    Estos datos aparecerán en tus tickets de venta.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="business_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nombre del Negocio</FormLabel>
                          <FormControl>
                            <Input placeholder="Ej. Esquites La Parroquia" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="slogan"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Slogan / Lema</FormLabel>
                          <FormControl>
                            <Input placeholder="Ej. ¡El sabor que nos une!" {...field} value={field.value || ""} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Dirección</FormLabel>
                        <FormControl>
                          <Input placeholder="Calle, Número, Colonia, Ciudad" {...field} value={field.value || ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Teléfono</FormLabel>
                          <FormControl>
                            <Input placeholder="417..." {...field} value={field.value || ""} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="whatsapp_number"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>WhatsApp (Opcional)</FormLabel>
                          <FormControl>
                            <Input placeholder="+52..." {...field} value={field.value || ""} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="rfc"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>RFC</FormLabel>
                          <FormControl>
                            <Input placeholder="XAXX010101000" {...field} value={field.value || ""} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="footer_message"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mensaje al pie del ticket</FormLabel>
                        <FormControl>
                          <Input placeholder="¡Gracias por su compra!" {...field} value={field.value || ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* --- Sección de Logo --- */}
                  <div className="space-y-3 rounded-lg border p-4">
                    <div className="flex items-center gap-2">
                      <ImageIcon className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Logo del Negocio</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Sube tu logo para que aparezca en los tickets. Se optimizará automáticamente para tu impresora térmica.
                    </p>

                    {form.watch("logo_url") ? (
                      <div className="flex items-start gap-4">
                        <div className="rounded-md border bg-white p-2 w-24 h-24 flex items-center justify-center overflow-hidden">
                          <img
                            src={form.watch("logo_url") ?? ""}
                            alt="Logo del negocio"
                            className="max-w-full max-h-full object-contain"
                          />
                        </div>
                        <div className="flex flex-col gap-2">
                          <p className="text-xs text-muted-foreground">Vista previa (192px de ancho)</p>
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={removeLogo}
                          >
                            <X className="w-3 h-3 mr-1" />
                            Eliminar logo
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed rounded-lg cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors">
                        <ImageIcon className="w-6 h-6 text-muted-foreground mb-1" />
                        <span className="text-xs text-muted-foreground">Haz clic para subir imagen</span>
                        <span className="text-xs text-muted-foreground">PNG, JPG, SVG</span>
                        <input
                          type="file"
                          className="hidden"
                          accept="image/*"
                          onChange={handleLogoUpload}
                        />
                      </label>
                    )}

                    <FormField
                      control={form.control}
                      name="show_logo"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between">
                          <div>
                            <FormLabel className="text-sm">Mostrar logo en tickets</FormLabel>
                            <FormDescription className="text-xs">
                              Requiere haber subido un logo.
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              disabled={!form.watch("logo_data")}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
                <CardFooter className="flex justify-end gap-2 border-t pt-6">
                  <Button type="submit" disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? (
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4 mr-2" />
                    )}
                    Guardar Cambios
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>

            <TabsContent value="impresora">
              <Card>
                <CardHeader>
                  <CardTitle>Configuración de Impresora Térmica</CardTitle>
                  <CardDescription>
                    Configura tu impresora de tickets 80mm Wifi/Red.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <FormField
                    control={form.control}
                    name="printer_enabled"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 shadow-sm">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Módulo de Impresión</FormLabel>
                          <FormDescription>
                            Activa o desactiva la impresión de tickets.
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="printer_ip"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Dirección IP</FormLabel>
                          <FormControl>
                            <Input placeholder="192.168.1.100" {...field} value={field.value || ""} />
                          </FormControl>
                          <FormDescription>
                            IP fija de la impresora en tu red local.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="printer_port"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Puerto</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value))}
                            />
                          </FormControl>
                          <FormDescription>
                            Por defecto: 9100.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="printer_width"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Ancho de Papel</FormLabel>
                          <Select
                            onValueChange={(v) => field.onChange(parseInt(v))}
                            defaultValue={field.value.toString()}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecciona el ancho" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="80">80 mm</SelectItem>
                              <SelectItem value="58">58 mm</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="auto_cut"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border px-3 py-2">
                          <FormLabel className="text-sm font-medium">Corte Auto.</FormLabel>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="open_drawer"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border px-3 py-2">
                          <FormLabel className="text-sm font-medium">Abrir Cajón</FormLabel>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="auto_print"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 shadow-sm bg-accent/20">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base text-primary font-bold">Impresión Automática</FormLabel>
                          <FormDescription>
                            Imprimir ticket inmediatamente al finalizar una venta.
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <div className="pt-4 flex flex-col gap-3">
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Diagnóstico</h3>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => testPrintMutation.mutate()}
                      disabled={testPrintMutation.isPending || !form.getValues("printer_enabled")}
                      className="w-full h-12 border-dashed border-2 hover:border-primary hover:bg-primary/5 group"
                    >
                      {testPrintMutation.isPending ? (
                        <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                      ) : (
                        <PrinterIcon className="w-5 h-5 mr-2 group-hover:text-primary" />
                      )}
                      Realizar Impresión de Prueba
                    </Button>
                    {!form.getValues("printer_enabled") && (
                      <p className="text-xs text-center text-destructive">
                        Activa el módulo de impresión para realizar la prueba.
                      </p>
                    )}
                  </div>
                </CardContent>
                <CardFooter className="flex justify-end gap-2 border-t pt-6">
                  <Button type="submit" disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? (
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4 mr-2" />
                    )}
                    Guardar Cambios
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>
          </Tabs>
        </form>
      </Form>
    </div>
  );
}
