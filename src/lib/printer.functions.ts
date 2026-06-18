import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getLogoRaster } from "./printer-logo";

const printInput = z.object({ saleId: z.string().uuid() });
const printCashCutInput = z.object({ registerId: z.string().uuid() });
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
  logo_url?: string | null;
  logo_data?: string | null;
  show_logo?: boolean | null;
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
  const widthMm = opts.settings.printer_width === 58 ? 58 : 80;
  const width = widthMm === 58 ? 32 : 48;
  const date = new Date(opts.createdAt);
  const dateStr = date.toLocaleString("es-MX", { dateStyle: "short", timeStyle: "medium" });

  // Logo raster, centered & sized to printer width
  const logoRaster = Array.from(getLogoRaster(widthMm));

  let e = encoder.initialize().align("center").raw(logoRaster).newline()
    .codepage("cp437")
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

async function buildCashCutBuffer(opts: {
  settings: PrinterSettings;
  register: any; // We use any because columns might not be in types yet
  cashier: string;
}): Promise<Uint8Array> {
  const EscPosEncoder = (await import("esc-pos-encoder")).default;
  const encoder = new EscPosEncoder();
  const width = opts.settings.printer_width === 58 ? 32 : 48;
  const reg = opts.register;

  const openedAt = new Date(reg.opened_at).toLocaleString("es-MX", { dateStyle: "short", timeStyle: "medium" });
  const closedAt = reg.closed_at ? new Date(reg.closed_at).toLocaleString("es-MX", { dateStyle: "short", timeStyle: "medium" }) : "Abierta";

  let e = encoder.initialize().codepage("cp437").align("center");

  if (opts.settings.show_logo && opts.settings.logo_data) {
    try {
      const logo = JSON.parse(opts.settings.logo_data);
      const rawData = Uint8Array.from(atob(logo.data), c => c.charCodeAt(0));
      e = e.image({ data: rawData, width: logo.width, height: logo.height }, logo.width, logo.height, 'threshold', 128);
    } catch {
      e = e.bold(true).size(2, 1).line(opts.settings.business_name ?? "Esquites La Parroquia").bold(false).size(1, 1);
    }
  } else {
    e = e.bold(true).size(2, 1).line(opts.settings.business_name ?? "Esquites La Parroquia").bold(false).size(1, 1);
  }

  if (opts.settings.slogan) e = e.line(opts.settings.slogan);

  e = e.newline().bold(true).line("CORTE DE CAJA").bold(false)
    .newline().align("left")
    .line(`Folio Reg: ${reg.id.split('-')[0].toUpperCase()}`)
    .line(`Cajero:    ${opts.cashier}`)
    .line(`Apertura:  ${openedAt}`)
    .line(`Cierre:    ${closedAt}`)
    .line("-".repeat(width));

  const sections = [
    { label: "Fondo Inicial", value: reg.opening_amount },
    { label: "Ventas Efectivo", value: reg.total_sales_cash || 0 },
    { label: "Ventas Tarjeta", value: reg.total_sales_card || 0 },
    { label: "Ventas Transf", value: reg.total_sales_transfer || 0 },
  ];

  for (const s of sections) {
    if (s.value === 0 && s.label.includes("Ventas") && s.label !== "Ventas Efectivo") continue;
    const valStr = `$${Number(s.value).toFixed(2)}`;
    e = e.line(padRight(s.label, width - valStr.length) + valStr);
  }

  e = e.line("-".repeat(width))
    .bold(true)
    .line(padRight("ESPERADO EN CAJA", width - 12) + ("$" + Number(reg.expected_amount || 0).toFixed(2)).padStart(12))
    .line(padRight("REAL EN CAJA", width - 12) + ("$" + Number(reg.real_amount || 0).toFixed(2)).padStart(12))
    .bold(false);

  const diff = Number(reg.difference || 0);
  const diffStr = (diff >= 0 ? "+" : "") + diff.toFixed(2);
  e = e.line(padRight("DIFERENCIA", width - diffStr.length) + diffStr)
    .line("-".repeat(width));

  // Denominations Breakdown
  const breakdown = reg.closing_breakdown || reg.opening_breakdown;
  if (breakdown && typeof breakdown === 'object') {
    e = e.align("center").line("DESGLOSE DE EFECTIVO").align("left");
    const items = Object.entries(breakdown).map(([k, v]) => {
      const val = parseFloat(k);
      const isBill = [1000, 500, 200, 100, 50].includes(val) || (val === 20 && !reg.closing_breakdown); // Rough heuristic
      return { val, qty: Number(v), type: val >= 50 ? 'B' : 'M' };
    }).filter(i => i.qty > 0).sort((a, b) => b.val - a.val);

    for (const it of items) {
      const label = `${it.type} $${it.val}`;
      const qtyStr = `${it.qty}x`.padStart(6);
      const subStr = `$${(it.val * it.qty).toFixed(2)}`.padStart(10);
      e = e.line(padRight(label, width - qtyStr.length - subStr.length) + qtyStr + subStr);
    }
    e = e.line("-".repeat(width));
  }

  if (reg.notes) {
    e = e.line("NOTAS:").line(reg.notes).line("-".repeat(width));
  }

  e = e.newline().newline().newline();
  if (opts.settings.auto_cut !== false) e = e.cut();
  return e.encode();
}

const padRight = (s: string, len: number) => (s.length >= len ? s.slice(0, len) : s + " ".repeat(len - s.length));

async function sendToPrinter(ip: string, port: number, data: Uint8Array): Promise<void> {
  const timeout = 5000; // 5 seconds timeout for WiFi printers

  try {
    // Obscure the specifier so Vite/Rollup doesn't try to resolve it at build time.
    const mod = "cloudflare" + ":" + "sockets";
    const { connect } = await (Function("s", "return import(s)")(mod) as Promise<any>);
    const socket = connect({ hostname: ip, port });
    const writer = socket.writable.getWriter();
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Timeout de conexión con la impresora (WiFi)")), timeout)
    );
    try {
      await Promise.race([writer.write(data), timeoutPromise]);
      await writer.close();
      return;
    } finally {
      try { writer.releaseLock(); } catch { }
    }
  } catch {
    // Falls through to Node.js check
  }

  // Try Node.js Net (Local Dev / VPS)
  try {
    const net = await import("node:net");
    return new Promise((resolve, reject) => {
      const client = new net.Socket();
      client.setTimeout(timeout);

      client.connect(port, ip, () => {
        client.write(Buffer.from(data), () => {
          client.end();
          resolve();
        });
      });

      client.on("error", (err) => {
        client.destroy();
        reject(new Error(`Error de impresora: ${err.message}`));
      });

      client.on("timeout", () => {
        client.destroy();
        reject(new Error("Timeout de conexión con la impresora (WiFi)"));
      });
    });
  } catch (e) {
    throw new Error("El entorno actual no soporta impresión directa por socket TCP.");
  }
}

export const printSaleTicket = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: any) => printInput.parse(input))
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
  .validator((input: any) => testInput.parse(input || {}))
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

export const printCashCutReceipt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: any) => printCashCutInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const [{ data: settings }, { data: register }] = await Promise.all([
      supabase.from("settings").select("*").limit(1).maybeSingle(),
      supabase.from("cash_register").select("*").eq("id", data.registerId).single(),
    ]);

    if (!settings) throw new Error("Configuración no encontrada.");
    if (!settings.printer_enabled) throw new Error("La impresora térmica no está habilitada.");
    if (!settings.printer_ip) throw new Error("Falta la IP de la impresora.");
    if (!register) throw new Error("Sesión de caja no encontrada.");

    const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", register.user_id).maybeSingle();

    const buffer = await buildCashCutBuffer({
      settings,
      register,
      cashier: profile?.full_name ?? "Cajero",
    });

    await sendToPrinter(settings.printer_ip, settings.printer_port ?? 9100, buffer);
    return { ok: true };
  });
