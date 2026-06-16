import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const printInput = z.object({ saleId: z.string().uuid() });
const testInput = z.object({});

type PrinterSettings = {
  business_name?: string | null;
  slogan?: string | null;
  address?: string | null;
  phone?: string | null;
  footer_message?: string | null;
  printer_enabled?: boolean | null;
  printer_ip?: string | null;
  printer_port?: number | null;
  printer_width?: number | null;
  auto_cut?: boolean | null;
  open_drawer?: boolean | null;
};

async function buildTicketBuffer(opts: {
  settings: PrinterSettings;
  folio: number | string;
  createdAt: string;
  cashier: string;
  items: { name: string; qty: number; price: number; modifiers: string[] }[];
  subtotal: number;
  tax: number;
  total: number;
  payment: string;
  received?: number;
  change?: number;
}): Promise<Uint8Array> {
  const EscPosEncoder = (await import("esc-pos-encoder")).default;
  const encoder = new EscPosEncoder();
  const width = opts.settings.printer_width === 58 ? 32 : 48;
  const date = new Date(opts.createdAt);
  const dateStr = date.toLocaleString("es-MX", { dateStyle: "short", timeStyle: "medium" });

  let e = encoder.initialize().codepage("cp437").align("center")
    .bold(true).size(1, 1).line(opts.settings.business_name ?? "Esquites La Parroquia").bold(false).size(0, 0);
  if (opts.settings.slogan) e = e.line(opts.settings.slogan);
  if (opts.settings.address) e = e.line(opts.settings.address);
  if (opts.settings.phone) e = e.line("Tel: " + opts.settings.phone);
  e = e.newline().align("left").line("-".repeat(width))
    .line(`Folio: ${opts.folio}`)
    .line(`Fecha: ${dateStr}`)
    .line(`Cajero: ${opts.cashier}`)
    .line("-".repeat(width));

  for (const it of opts.items) {
    const left = `${it.qty}x ${it.name}`;
    const right = `$${(it.price * it.qty).toFixed(2)}`;
    e = e.line(padRight(left, width - right.length) + right);
    for (const m of it.modifiers) e = e.line("  + " + m);
  }
  e = e.line("-".repeat(width))
    .line(padRight("Subtotal", width - 10) + ("$" + opts.subtotal.toFixed(2)).padStart(10))
    .line(padRight("Impuestos", width - 10) + ("$" + opts.tax.toFixed(2)).padStart(10))
    .bold(true).line(padRight("TOTAL", width - 12) + ("$" + opts.total.toFixed(2)).padStart(12)).bold(false)
    .line(padRight("Pago", width - opts.payment.length) + opts.payment.toUpperCase());
  if (opts.received !== undefined) {
    e = e.line(padRight("Recibido", width - 10) + ("$" + opts.received.toFixed(2)).padStart(10));
    e = e.line(padRight("Cambio", width - 10) + ("$" + (opts.change ?? 0).toFixed(2)).padStart(10));
  }
  e = e.line("-".repeat(width)).align("center").newline();
  if (opts.settings.footer_message) e = e.line(opts.settings.footer_message);
  e = e.newline().newline().newline();
  if (opts.settings.auto_cut !== false) e = e.cut();
  return e.encode();
}

const padRight = (s: string, len: number) => (s.length >= len ? s.slice(0, len) : s + " ".repeat(len - s.length));

async function sendToPrinter(ip: string, port: number, data: Uint8Array): Promise<void> {
  let connect: ((opts: { hostname: string; port: number }) => any) | undefined;
  try {
    // Obscure the specifier so Vite/Rollup doesn't try to resolve it at build time.
    const mod = "cloudflare" + ":" + "sockets";
    ({ connect } = await (Function("s", "return import(s)")(mod) as Promise<any>));
  } catch {
    throw new Error("La impresión por red no está disponible en este entorno. Usa la impresión por navegador.");
  }
  if (!connect) throw new Error("Conexión TCP no disponible.");
  const socket = connect({ hostname: ip, port });
  const writer = socket.writable.getWriter();
  try {
    await writer.write(data);
    await writer.close();
  } finally {
    try { writer.releaseLock(); } catch {}
  }
}

export const printSaleTicket = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => printInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [{ data: settings }, { data: sale }] = await Promise.all([
      supabaseAdmin.from("settings").select("*").limit(1).maybeSingle(),
      supabase.from("sales").select("*, sale_items(*, sale_item_modifiers(*))").eq("id", data.saleId).single(),
    ]);
    if (!settings) throw new Error("Configuración no encontrada.");
    if (!settings.printer_enabled) throw new Error("La impresora térmica no está habilitada.");
    if (!settings.printer_ip) throw new Error("Falta la IP de la impresora.");
    if (!sale) throw new Error("Venta no encontrada.");

    const { data: profile } = sale.user_id
      ? await supabase.from("profiles").select("full_name").eq("id", sale.user_id).maybeSingle()
      : { data: null as { full_name: string | null } | null };

    const buffer = await buildTicketBuffer({
      settings,
      folio: sale.folio,
      createdAt: sale.created_at ?? new Date().toISOString(),
      cashier: profile?.full_name ?? "Cajero",
      items: (sale.sale_items ?? []).map((i: any) => ({
        name: i.product_name ?? "Producto",
        qty: i.quantity,
        price: Number(i.unit_price),
        modifiers: (i.sale_item_modifiers ?? []).map((m: any) => m.modifier_name).filter(Boolean),
      })),
      subtotal: Number(sale.subtotal),
      tax: Number(sale.tax ?? 0),
      total: Number(sale.total),
      payment: sale.payment_method ?? "efectivo",
      received: sale.cash_received != null ? Number(sale.cash_received) : undefined,
      change: sale.change_amount != null ? Number(sale.change_amount) : undefined,
    });

    await sendToPrinter(settings.printer_ip, settings.printer_port ?? 9100, buffer);
    return { ok: true };
  });

export const testPrinter = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => testInput.parse(input))
  .handler(async ({ context }) => {
    const { supabase: _ } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: settings } = await supabaseAdmin.from("settings").select("*").limit(1).maybeSingle();
    if (!settings?.printer_ip) throw new Error("Configura la IP de la impresora primero.");

    const buffer = await buildTicketBuffer({
      settings,
      folio: "TEST",
      createdAt: new Date().toISOString(),
      cashier: "Sistema",
      items: [{ name: "Prueba de impresión", qty: 1, price: 0, modifiers: ["OK"] }],
      subtotal: 0, tax: 0, total: 0, payment: "test",
    });
    await sendToPrinter(settings.printer_ip, settings.printer_port ?? 9100, buffer);
    return { ok: true };
  });
