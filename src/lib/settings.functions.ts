// src/lib/settings.functions.ts
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { localApi } from "./api/api-client";

export const getSettings = createServerFn({ method: "GET" })
  .handler(async () => {
    return localApi.get('/api/settings');
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
  .inputValidator((d: unknown) => updateInput.parse(d))
  .handler(async ({ data }) => {
    return localApi.put('/api/settings', data);
  });

export const getPrintSettings = createServerFn({ method: "GET" })
  .handler(async () => {
    return localApi.get('/api/settings');
  });