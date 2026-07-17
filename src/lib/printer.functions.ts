import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { localApi } from "./api/api-client";

const printInput = z.object({ saleId: z.string() });
const printCashCutInput = z.object({ registerId: z.string() });

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

const ESC = 0x1b;
const GS = 0x1d;

function toAscii(s: string): string {
  if (!s) return "";
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ñ/g, "n").replace(/Ñ/g, "N")
    .replace(/¡/g, "!").replace(/¿/g, "?")
    .replace(/[""]/g, '"').replace(/['']/g, "'")
    .replace(/–|—/g, "-")
    .replace(/[^\x20-\x7E\n]/g, "");
}

class TicketBuilder {
  private chunks: number[] = [];
  private width: number;
  constructor(widthMm: number) {
    this.width = widthMm === 58 ? 32 : 48;
    this.chunks.push(ESC, 0x40);
    this.chunks.push(ESC, 0x74, 0x00);
    this.align("left");
  }
  private push(...b: number[]) { this.chunks.push(...b); }
  private text(s: string) {
    const ascii = toAscii(s);
    for (let i = 0; i < ascii.length; i++) this.chunks.push(ascii.charCodeAt(i));
  }
  align(mode: "left" | "center" | "right") {
    const map = { left: 0, center: 1, right: 2 };
    this.push(ESC, 0x61, map[mode]);
    return this;
  }
  bold(on: boolean) { this.push(ESC, 0x45, on ? 1 : 0); return this; }
  double(on: boolean) {
    this.push(GS, 0x21, on ? 0x11 : 0x00);
    return this;
  }
  line(s = "") { this.text(s); this.push(0x0a); return this; }
  feed(n = 1) { for (let i = 0; i < n; i++) this.push(0x0a); return this; }
  divider() { this.line("-".repeat(this.width)); return this; }
  row(label: string, value: string) {
    const l = toAscii(label);
    const v = toAscii(value);
    const spaceCount = Math.max(1, this.width - l.length - v.length);
    this.line(l + " ".repeat(spaceCount) + v);
    return this;
  }
  cut() {
    this.feed(4);
    this.push(GS, 0x56, 0x01);
    return this;
  }
  drawer() {
    this.push(ESC, 0x70, 0x00, 0x19, 0xfa);
    return this;
  }
  build(): Uint8Array { return new Uint8Array(this.chunks); }
}

function buildTicketBytes(opts: {
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
}): Uint8Array {
  const widthMm = opts.settings.printer_width === 58 ? 58 : 80;
  const b = new TicketBuilder(widthMm);
  const date = new Date(opts.createdAt);
  const dateStr = date.toLocaleDateString("es-MX");
  const timeStr = date.toLocaleTimeString("es-MX", { hour12: false });

  b.align("center").bold(true).double(true)
    .line(opts.settings.business_name ?? "Esquites La Parroquia")
    .double(false).bold(false);
  if (opts.settings.slogan) b.line(opts.settings.slogan);
  if (opts.settings.address) b.line(opts.settings.address);
  if (opts.settings.phone) b.line("Tel: " + opts.settings.phone);
  b.feed(1);

  b.align("left").divider()
    .row("Folio:", String(opts.folio))
    .row("Fecha:", dateStr)
    .row("Hora:", timeStr)
    .row("Cajero:", opts.cashier)
    .divider();

  for (const it of opts.items) {
    const left = `${it.qty}x ${it.name}`;
    const right = `$${(it.price * it.qty).toFixed(2)}`;
    b.row(left, right);
    for (const m of it.modifiers) if (m) b.line("  + " + m);
  }
  b.divider()
    .row("Subtotal", `$${opts.subtotal.toFixed(2)}`)
    .row("Impuestos", `$${opts.tax.toFixed(2)}`);
  b.bold(true).double(true)
    .row("TOTAL", `$${opts.total.toFixed(2)}`)
    .double(false).bold(false);
  b.row("Pago:", (opts.payment || "").toUpperCase());
  if (opts.received !== undefined) {
    b.row("Recibido", `$${opts.received.toFixed(2)}`);
    b.row("Cambio", `$${(opts.change ?? 0).toFixed(2)}`);
  }
  b.divider().align("center").feed(1);
  if (opts.settings.footer_message) b.line(opts.settings.footer_message);
  b.line("Gracias por su visita");
  b.line("esquiteslaparroquia.mx");

  if (opts.settings.open_drawer) b.drawer();
  if (opts.settings.auto_cut !== false) b.cut();
  else b.feed(4);
  return b.build();
}

function buildCashCutBytes(opts: {
  settings: PrinterSettings;
  register: any;
  cashier: string;
}): Uint8Array {
  const widthMm = opts.settings.printer_width === 58 ? 58 : 80;
  const b = new TicketBuilder(widthMm);
  const reg = opts.register;
  const openedAt = new Date(reg.opened_at).toLocaleString("es-MX", { hour12: false });
  const closedAt = reg.closed_at
    ? new Date(reg.closed_at).toLocaleString("es-MX", { hour12: false })
    : "Abierta";

  b.align("center").bold(true).double(true)
    .line(opts.settings.business_name ?? "Esquites La Parroquia")
    .double(false).bold(false);
  if (opts.settings.slogan) b.line(opts.settings.slogan);
  b.feed(1).bold(true).line("CORTE DE CAJA").bold(false).feed(1);

  b.align("left").divider()
    .row("Folio:", String(reg.id).split("-")[0].toUpperCase())
    .row("Cajero:", opts.cashier)
    .row("Apertura:", openedAt)
    .row("Cierre:", closedAt)
    .divider();

  const rows: [string, number][] = [
    ["Fondo inicial", Number(reg.opening_amount ?? 0)],
    ["Ventas efectivo", Number(reg.total_sales_cash ?? 0)],
    ["Ventas tarjeta", Number(reg.total_sales_card ?? 0)],
    ["Ventas transf.", Number(reg.total_sales_transfer ?? 0)],
  ];
  for (const [label, val] of rows) b.row(label, `$${val.toFixed(2)}`);
  b.divider().bold(true)
    .row("ESPERADO", `$${Number(reg.expected_amount ?? 0).toFixed(2)}`)
    .row("REAL EN CAJA", `$${Number(reg.real_amount ?? 0).toFixed(2)}`)
    .bold(false);
  const diff = Number(reg.difference ?? 0);
  b.row("Diferencia", `${diff >= 0 ? "+" : ""}$${diff.toFixed(2)}`);

  const breakdown = reg.closing_breakdown || reg.opening_breakdown;
  if (breakdown && typeof breakdown === "object") {
    b.divider().align("center").line("DESGLOSE DE EFECTIVO").align("left");
    const items = Object.entries(breakdown)
      .map(([k, v]) => ({ val: parseFloat(k), qty: Number(v) }))
      .filter((i) => i.qty > 0 && i.val > 0)
      .sort((a, b) => b.val - a.val);
    for (const it of items) {
      b.row(`$${it.val} x ${it.qty}`, `$${(it.val * it.qty).toFixed(2)}`);
    }
  }

  if (reg.notes) {
    b.divider().line("NOTAS:").line(String(reg.notes));
  }

  b.feed(1).align("center").line("--- fin del corte ---");
  if (opts.settings.auto_cut !== false) b.cut();
  else b.feed(4);
  return b.build();
}

async function sendToPrinter(ip: string, port: number, data: Uint8Array): Promise<void> {
  const timeout = 5000;
  try {
    const mod = "cloudflare" + ":" + "sockets";
    const { connect } = await (Function("s", "return import(s)")(mod) as Promise<any>);
    const socket = connect({ hostname: ip, port });
    const writer = socket.writable.getWriter();
    const to = new Promise((_, r) => setTimeout(() => r(new Error("Timeout con impresora")), timeout));
    try {
      await Promise.race([writer.write(data), to]);
      await writer.close();
      return;
    } finally {
      try { writer.releaseLock(); } catch { }
    }
  } catch { }

  try {
    const net = await import("node:net");
    return await new Promise<void>((resolve, reject) => {
      const client = new net.Socket();
      client.setTimeout(timeout);
      client.connect(port, ip, () => {
        client.write(Buffer.from(data), () => { client.end(); resolve(); });
      });
      client.on("error", (err) => { client.destroy(); reject(new Error("Error impresora: " + err.message)); });
      client.on("timeout", () => { client.destroy(); reject(new Error("Timeout con impresora")); });
    });
  } catch {
    throw new Error("Entorno sin soporte TCP para impresión directa.");
  }
}

export const printSaleTicket = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => printInput.parse(d))
  .handler(async ({ data }) => {
    const [settings, sale] = await Promise.all([
      localApi.get<any>('/api/settings'),
      localApi.get<any>(`/api/sales/${data.saleId}`),
    ]);
    if (!settings) throw new Error("Configuración no encontrada.");
    if (!settings.printer_enabled) throw new Error("La impresora térmica no está habilitada.");
    if (!settings.printer_ip) throw new Error("Falta la IP de la impresora.");
    if (!sale) throw new Error("Venta no encontrada.");

    const buffer = buildTicketBytes({
      settings,
      folio: sale.folio,
      createdAt: sale.created_at ?? new Date().toISOString(),
      cashier: sale.cashier_name ?? "Cajero",
      items: (sale.items ?? []).map((i: any) => ({
        name: i.product_name ?? "Producto",
        qty: i.quantity,
        price: Number(i.unit_price),
        modifiers: (i.modifiers ?? []).filter(Boolean),
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
  .handler(async () => {
    const settings = await localApi.get<any>('/api/settings');
    if (!settings?.printer_ip) throw new Error("Configura la IP de la impresora primero.");
    const buffer = buildTicketBytes({
      settings,
      folio: "TEST",
      createdAt: new Date().toISOString(),
      cashier: "Sistema",
      items: [{ name: "Ticket de prueba", qty: 1, price: 0, modifiers: ["Impresion correcta"] }],
      subtotal: 0, tax: 0, total: 0, payment: "test",
    });
    await sendToPrinter(settings.printer_ip, settings.printer_port ?? 9100, buffer);
    return { ok: true };
  });

export const printCashCutReceipt = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => printCashCutInput.parse(d))
  .handler(async ({ data }) => {
    const [settings, register] = await Promise.all([
      localApi.get<any>('/api/settings'),
      localApi.get<any>(`/api/cash/cut/${data.registerId}`),
    ]);
    if (!settings) throw new Error("Configuración no encontrada.");
    if (!settings.printer_enabled) throw new Error("La impresora térmica no está habilitada.");
    if (!settings.printer_ip) throw new Error("Falta la IP de la impresora.");
    if (!register) throw new Error("Sesión de caja no encontrada.");

    const buffer = buildCashCutBytes({
      settings,
      register,
      cashier: register.cashier_name ?? "Cajero",
    });
    await sendToPrinter(settings.printer_ip, settings.printer_port ?? 9100, buffer);
    return { ok: true };
  });
