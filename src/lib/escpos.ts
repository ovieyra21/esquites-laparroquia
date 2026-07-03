// ─────────────────────────────────────────────────────────────
//  Motor ESC/POS del lado del cliente.
//  Genera los bytes crudos en el navegador de la tablet y los envía
//  al proxy de impresión local (public/proxy/escpos-proxy.mjs), que
//  corre en la misma red WiFi que la impresora térmica.
// ─────────────────────────────────────────────────────────────
import { toast } from "sonner";
import { printTicketBrowser, type TicketPrintData } from "./utils";
import type { CashCutDetail } from "./cash.functions";

const ESC = 0x1b;
const GS = 0x1d;

export type PrintSettings = {
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
  print_mode?: string | null;
  proxy_url?: string | null;
};

// Translitera acentos latinos → ASCII. Evita el desajuste de codepage en
// térmicas WiFi genéricas ("Acámbaro" → "Acßmbaro" y similares).
export function toAscii(s: string): string {
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

export class TicketBuilder {
  private chunks: number[] = [];
  private width: number;
  constructor(widthMm: number) {
    this.width = widthMm === 58 ? 32 : 48;
    this.chunks.push(ESC, 0x40); // ESC @ inicializar
    this.chunks.push(ESC, 0x74, 0x00); // ESC t 0 → PC437
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
  double(on: boolean) { this.push(GS, 0x21, on ? 0x11 : 0x00); return this; }
  line(s = "") { this.text(s); this.push(0x0a); return this; }
  feed(n = 1) { for (let i = 0; i < n; i++) this.push(0x0a); return this; }
  divider() { this.line("-".repeat(this.width)); return this; }
  /** Fila de 2 columnas: etiqueta a la izquierda, valor a la derecha, con al menos 1 espacio. */
  row(label: string, value: string) {
    const l = toAscii(label);
    const v = toAscii(value);
    const spaceCount = Math.max(1, this.width - l.length - v.length);
    this.line(l + " ".repeat(spaceCount) + v);
    return this;
  }
  cut() {
    this.feed(4);
    this.push(GS, 0x56, 0x01); // corte parcial
    return this;
  }
  drawer() {
    this.push(ESC, 0x70, 0x00, 0x19, 0xfa); // pulso cajón
    return this;
  }
  build(): Uint8Array { return new Uint8Array(this.chunks); }
}

// ───────────────────── constructores de tickets ─────────────────────

export function buildTicketBytes(data: TicketPrintData, settings: PrintSettings): Uint8Array {
  const widthMm = settings.printer_width === 58 ? 58 : 80;
  const b = new TicketBuilder(widthMm);
  const date = new Date(data.createdAt);
  const dateStr = date.toLocaleDateString("es-MX");
  const timeStr = date.toLocaleTimeString("es-MX", { hour12: false });

  b.align("center").bold(true).double(true)
    .line(settings.business_name ?? "Esquites La Parroquia")
    .double(false).bold(false);
  if (settings.slogan) b.line(settings.slogan);
  if (settings.address) b.line(settings.address);
  if (settings.phone) b.line("Tel: " + settings.phone);
  b.feed(1);

  b.align("left").divider()
    .row("Folio:", String(data.folio))
    .row("Fecha:", dateStr)
    .row("Hora:", timeStr)
    .row("Cajero:", data.cashier)
    .divider();

  for (const it of data.items) {
    b.row(`${it.quantity}x ${it.name}`, `$${(it.unitPrice * it.quantity).toFixed(2)}`);
    for (const m of it.modifiers) if (m) b.line("  + " + m);
  }
  b.divider()
    .row("Subtotal", `$${data.subtotal.toFixed(2)}`)
    .row("Impuestos", `$${data.tax.toFixed(2)}`);
  b.bold(true).double(true)
    .row("TOTAL", `$${data.total.toFixed(2)}`)
    .double(false).bold(false);
  b.row("Pago:", (data.paymentMethod || "").toUpperCase());
  if (data.cashReceived != null) {
    b.row("Recibido", `$${data.cashReceived.toFixed(2)}`);
    b.row("Cambio", `$${(data.changeAmount ?? 0).toFixed(2)}`);
  }
  b.divider().align("center").feed(1);
  if (settings.footer_message) b.line(settings.footer_message);
  b.line("Gracias por su visita");
  b.line("esquiteslaparroquia.mx");

  if (settings.open_drawer) b.drawer();
  if (settings.auto_cut !== false) b.cut();
  else b.feed(4);
  return b.build();
}

export function buildCashCutBytes(detail: CashCutDetail, settings: PrintSettings): Uint8Array {
  const widthMm = settings.printer_width === 58 ? 58 : 80;
  const b = new TicketBuilder(widthMm);
  const fmtDate = (iso: string | null) =>
    iso ? new Date(iso).toLocaleString("es-MX", { hour12: false }) : "Abierta";

  b.align("center").bold(true).double(true)
    .line(settings.business_name ?? "Esquites La Parroquia")
    .double(false).bold(false);
  if (settings.slogan) b.line(settings.slogan);
  b.feed(1).bold(true).line("CORTE DE CAJA").bold(false).feed(1);

  b.align("left").divider()
    .row("Folio:", detail.id.split("-")[0].toUpperCase())
    .row("Cajero:", detail.cashierName)
    .row("Apertura:", fmtDate(detail.openedAt))
    .row("Cierre:", fmtDate(detail.closedAt))
    .divider();

  b.bold(true).line("VENTAS").bold(false);
  b.row("Efectivo", `$${detail.salesCash.toFixed(2)}`)
    .row("Tarjeta", `$${detail.salesCard.toFixed(2)}`)
    .row("Transferencia", `$${detail.salesTransfer.toFixed(2)}`);
  const totalSales = detail.salesCash + detail.salesCard + detail.salesTransfer;
  b.bold(true).row("Total ventas", `$${totalSales.toFixed(2)}`).bold(false);
  b.row("Tickets", String(detail.salesCount));

  if (detail.cashIn > 0 || detail.cashOut > 0) {
    b.divider().bold(true).line("MOVIMIENTOS").bold(false);
    b.row("Entradas", `$${detail.cashIn.toFixed(2)}`);
    b.row("Salidas", `-$${detail.cashOut.toFixed(2)}`);
  }

  if (detail.topProducts.length > 0) {
    b.divider().bold(true).line("MAS VENDIDOS").bold(false);
    detail.topProducts.forEach((p, i) => b.row(`${i + 1}. ${p.name}`, `${p.quantity}u`));
  }

  b.divider().bold(true).line("ARQUEO").bold(false);
  b.row("Fondo inicial", `$${detail.openingAmount.toFixed(2)}`)
    .row("Efectivo esperado", `$${detail.expectedAmount.toFixed(2)}`);
  b.bold(true)
    .row("EFECTIVO REAL", `$${detail.realAmount.toFixed(2)}`)
    .row("DIFERENCIA", `${detail.difference >= 0 ? "+" : ""}$${detail.difference.toFixed(2)}`)
    .bold(false);

  const breakdown = detail.closingBreakdown;
  if (breakdown && Object.keys(breakdown).length > 0) {
    b.divider().align("center").line("DESGLOSE DE EFECTIVO").align("left");
    Object.entries(breakdown)
      .map(([k, v]) => ({ val: parseFloat(k), qty: Number(v) }))
      .filter((i) => i.qty > 0 && i.val > 0)
      .sort((a, z) => z.val - a.val)
      .forEach((it) => b.row(`$${it.val} x ${it.qty}`, `$${(it.val * it.qty).toFixed(2)}`));
  }

  if (detail.notes) b.divider().line("NOTAS:").line(String(detail.notes));

  b.feed(1).align("center").line("--- fin del corte ---");
  if (settings.auto_cut !== false) b.cut();
  else b.feed(4);
  return b.build();
}

export function buildTestTicketBytes(settings: PrintSettings): Uint8Array {
  return buildTicketBytes(
    {
      folio: "PRUEBA",
      createdAt: new Date().toISOString(),
      cashier: "Sistema",
      subtotal: 0,
      tax: 0,
      total: 0,
      paymentMethod: "test",
      cashReceived: null,
      changeAmount: null,
      items: [{ name: "Ticket de prueba", quantity: 1, unitPrice: 0, modifiers: ["Impresion correcta"] }],
    },
    settings,
  );
}

// ───────────────────── transporte al proxy ─────────────────────

function proxyBase(settings: PrintSettings): string {
  return (settings.proxy_url || "http://localhost:3128").replace(/\/+$/, "");
}

/** Envía los bytes ESC/POS al proxy local, que los reenvía por TCP a la impresora. */
export async function printViaProxy(settings: PrintSettings, bytes: Uint8Array): Promise<void> {
  const params = new URLSearchParams();
  if (settings.printer_ip) params.set("ip", settings.printer_ip);
  if (settings.printer_port) params.set("port", String(settings.printer_port));
  const url = `${proxyBase(settings)}/?${params.toString()}`;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/octet-stream" },
      body: new Blob([bytes as unknown as BlobPart]),
      signal: ctrl.signal,
    });
    if (!res.ok) {
      const msg = await res.text().catch(() => "");
      throw new Error(msg || `El proxy respondió HTTP ${res.status}`);
    }
  } catch (e: any) {
    if (e?.name === "AbortError") throw new Error("El proxy de impresión no respondió (timeout)");
    throw new Error(e?.message || "No se pudo conectar al proxy de impresión");
  } finally {
    clearTimeout(timer);
  }
}

export function proxyPrintingEnabled(settings?: PrintSettings | null): boolean {
  return !!settings && settings.print_mode !== "navegador" && !!settings.printer_enabled;
}

/** Imprime un ticket de venta: vía proxy ESC/POS si está habilitado, o navegador como respaldo. */
export async function smartPrintTicket(
  data: TicketPrintData,
  settings?: PrintSettings | null,
): Promise<"proxy" | "browser"> {
  if (proxyPrintingEnabled(settings)) {
    try {
      await printViaProxy(settings!, buildTicketBytes(data, settings!));
      toast.success("Ticket enviado a la impresora");
      return "proxy";
    } catch (e: any) {
      toast.warning(`Impresora no disponible: ${e.message}. Usando impresión por navegador.`);
    }
  }
  printTicketBrowser(data);
  return "browser";
}

/** Imprime un corte de caja vía proxy. Devuelve "browser" si hay que usar el respaldo por navegador. */
export async function smartPrintCorte(
  detail: CashCutDetail,
  settings?: PrintSettings | null,
): Promise<"proxy" | "browser"> {
  if (proxyPrintingEnabled(settings)) {
    try {
      await printViaProxy(settings!, buildCashCutBytes(detail, settings!));
      toast.success("Corte enviado a la impresora");
      return "proxy";
    } catch (e: any) {
      toast.warning(`Impresora no disponible: ${e.message}. Usando impresión por navegador.`);
    }
  }
  return "browser";
}
