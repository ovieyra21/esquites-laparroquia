import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.from("settings").select("*").limit(1).maybeSingle();
    return data;
  });

export type PrintSettingsRow = {
  business_name: string | null;
  slogan: string | null;
  address: string | null;
  phone: string | null;
  footer_message: string | null;
  tax: number | null;
  printer_enabled: boolean | null;
  printer_ip: string | null;
  printer_port: number | null;
  printer_width: number | null;
  auto_print: boolean | null;
  auto_cut: boolean | null;
  open_drawer: boolean | null;
  show_logo: boolean | null;
  print_mode: string | null;
  proxy_url: string | null;
};

/** Datos de impresión accesibles para cualquier usuario autenticado (incl. cajeros).
 *  Usa la función SECURITY DEFINER `get_print_settings`, que solo expone campos no sensibles. */
export const getPrintSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await (context.supabase as any).rpc("get_print_settings");
    if (error) throw new Error(error.message);
    const row = Array.isArray(data) ? data[0] : data;
    return (row ?? null) as PrintSettingsRow | null;
  });

const updateInput = z.object({
  business_name: z.string().max(255).optional(),
  slogan: z.string().max(255).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  phone: z.string().max(50).optional().nullable(),
  rfc: z.string().max(20).optional().nullable(),
  whatsapp_number: z.string().max(20).optional().nullable(),
  footer_message: z.string().max(255).optional().nullable(),
  tax: z.number().min(0).max(100).optional(),
  printer_enabled: z.boolean().optional(),
  printer_ip: z.string().max(45).optional().nullable(),
  printer_port: z.number().int().min(1).max(65535).optional(),
  printer_width: z.number().int().refine((v) => v === 58 || v === 80).optional(),
  auto_print: z.boolean().optional(),
  auto_cut: z.boolean().optional(),
  open_drawer: z.boolean().optional(),
  logo_url: z.string().optional().nullable(),
  logo_data: z.string().optional().nullable(),
  show_logo: z.boolean().optional(),
  payment_provider: z.enum(["mercadopago_point", "mercadopago_qr", "zettle", "none"]).optional(),
  mp_device_id: z.string().optional().nullable(),
  zettle_api_key: z.string().optional().nullable(),
  print_mode: z.enum(["proxy", "navegador"]).optional(),
  proxy_url: z.string().max(255).optional(),
});

export const updateSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => updateInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (!isAdmin) throw new Error("Solo admin puede modificar configuración.");
    const { data: existing } = await supabase.from("settings").select("id").limit(1).maybeSingle();
    if (existing) {
      const { error } = await supabase.from("settings").update(data as any).eq("id", existing.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabase.from("settings").insert(data as any);

      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });
