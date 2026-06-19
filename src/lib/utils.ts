import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import logoTicket from "@/assets/logo-ticket.png";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type TicketPrintData = {
  folio: string;
  createdAt: string;
  cashier: string;
  subtotal: number;
  tax: number;
  total: number;
  paymentMethod: string;
  cashReceived?: number | null;
  changeAmount?: number | null;
  items: { name: string; quantity: number; unitPrice: number; modifiers: string[] }[];
};

const fmtTicket = (n: number) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(n);

/** Print a ticket directly via hidden iframe — no popups, works on tablets */
export function printTicketBrowser(data: TicketPrintData) {
  const now = new Date(data.createdAt);
  const pad = (n: number) => String(n).padStart(2, "0");
  const dateStr = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()}`;
  const timeStr = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

  const itemsHtml = data.items
    .map(
      (item) => `
    <div style="margin-bottom:3px">
      <div style="display:flex;justify-content:space-between;font-weight:600;font-size:11px">
        <span>${item.quantity}x ${item.name}</span>
        <span>${fmtTicket(item.unitPrice * item.quantity)}</span>
      </div>
      ${item.modifiers.length ? item.modifiers.map((m) => `<div style="font-size:9px;padding-left:12px;color:#666">+ ${m}</div>`).join("") : ""}
    </div>`
    )
    .join("");

  const cashHtml =
    data.cashReceived != null
      ? `
    <div style="display:flex;justify-content:space-between;font-size:10px;margin-top:2px">
      <span>Recibido</span><span>${fmtTicket(data.cashReceived)}</span>
    </div>
    <div style="display:flex;justify-content:space-between;font-size:10px">
      <span>Cambio</span><span>${fmtTicket(data.changeAmount ?? 0)}</span>
    </div>`
      : "";

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { box-sizing:border-box; margin:0; padding:0; }
    body { font-family:"Courier New",monospace; background:#fff; }
    @page { size:80mm auto; margin:0; }
    @media print {
      body { -webkit-print-color-adjust:exact; print-color-adjust:exact; }
    }
    .ticket {
      width:80mm; padding:2mm 3mm 3mm 3mm;
      font-size:2mm; line-height:1.35; color:#111;
    }
    .header { text-align:center; margin-bottom:1mm; }
    .header img { display:block; width:8mm; height:8mm; margin:0 auto; object-fit:contain; }
    .business { font-family:"Playfair Display",Georgia,serif; font-size:3mm; font-weight:800; color:#1a1a1a; }
    .slogan { font-family:"Playfair Display",Georgia,serif; font-size:2mm; font-style:italic; color:#555; }
    .address { font-size:1.8mm; color:#555; }
    .divider { border-top:0.5px dashed #999; margin:1.5mm 0; }
    .info div { display:flex; justify-content:space-between; font-size:1.9mm; }
    .totals { font-size:1.9mm; }
    .totals .total { font-size:3mm; font-weight:800; border-top:0.5px dashed #ccc; padding-top:1mm; margin-top:1mm; }
    .footer { text-align:center; font-style:italic; font-size:1.8mm; }
    .feed { height:4mm; }
    @media screen {
      body { display:flex; justify-content:center; padding:4mm;background:#f0f0f0; }
      .ticket { background:#fff; box-shadow:0 2px 8px rgba(0,0,0,.12); border-radius:4px; margin-bottom:4mm; }
    }
  </style>
</head>
<body>
  <div class="ticket">
    <div class="header">
      <img src="${logoTicket}" alt="Logo" />
      <div class="business">Esquites La Parroquia</div>
      <div class="slogan">El sabor que nos une</div>
      <div class="address">Acámbaro, Gto.</div>
    </div>
    <div class="divider"></div>
    <div class="info">
      <div><span>Folio:</span><span style="font-weight:bold">${data.folio}</span></div>
      <div><span>Fecha:</span><span>${dateStr}</span></div>
      <div><span>Hora:</span><span>${timeStr}</span></div>
      <div><span>Cajero:</span><span>${data.cashier}</span></div>
    </div>
    <div class="divider"></div>
    ${itemsHtml}
    <div class="divider"></div>
    <div class="totals">
      <div style="display:flex;justify-content:space-between"><span>Subtotal</span><span>${fmtTicket(data.subtotal)}</span></div>
      <div style="display:flex;justify-content:space-between"><span>Impuestos</span><span>${fmtTicket(data.tax)}</span></div>
      <div class="total" style="display:flex;justify-content:space-between"><span>TOTAL</span><span>${fmtTicket(data.total)}</span></div>
      <div style="display:flex;justify-content:space-between;text-transform:uppercase"><span>Pago:</span><span style="font-weight:600">${data.paymentMethod}</span></div>
      ${cashHtml}
    </div>
    <div class="divider"></div>
    <div class="footer">
      <p>¡Gracias por su compra!</p>
      <p style="opacity:0.6;margin-top:1mm">esquiteslaparroquia.mx</p>
    </div>
    <div class="feed"></div>
  </div>
</body>
</html>`;

  const iframe = document.createElement("iframe");
  iframe.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;border:none;z-index:99999;background:#f0f0f0";
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument || iframe.contentWindow!.document;
  doc.open();
  doc.write(html);
  doc.close();

  // Wait for images/fonts to load then print
  iframe.onload = () => {
    setTimeout(() => {
      iframe.contentWindow!.focus();
      iframe.contentWindow!.print();
      // Remove after print dialog closes (approx)
      setTimeout(() => {
        if (document.body.contains(iframe)) document.body.removeChild(iframe);
      }, 2000);
    }, 600);
  };
}

/** Serialize ticket data for the standalone print page via URL hash. */
export function buildTicketHash(data: TicketPrintData & {
  businessName?: string;
  slogan?: string;
  address?: string;
  phone?: string;
  footerMessage?: string;
}): string {
  const payload = {
    ...data,
    businessName: data.businessName || "Esquites La Parroquia",
    slogan: data.slogan || "El sabor que nos une",
    address: data.address || "Acámbaro, Gto.",
    phone: data.phone || "",
    footerMessage: data.footerMessage || "¡Gracias por su compra!",
  };

  // Robust base64 encode using TextEncoder → Uint8Array → base64
  const json = JSON.stringify(payload);
  const bytes = new TextEncoder().encode(json);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
