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

/** Print a ticket directly — no popups, no iframes, works on tablets.
 *  Injects the ticket into a full-page overlay, prints it, then removes it. */
export function printTicketBrowser(data: TicketPrintData) {
  const now = new Date(data.createdAt);
  const pad = (n: number) => String(n).padStart(2, "0");
  const dateStr = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()}`;
  const timeStr = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

  // Consolidate duplicate items (same product name + same modifiers)
  const consolidated: { name: string; quantity: number; unitPrice: number; modifiers: string[] }[] = [];
  for (const item of data.items) {
    const modKey = [...item.modifiers].sort().join("|");
    const existing = consolidated.find(
      (c) => c.name === item.name && c.unitPrice === item.unitPrice && c.modifiers.join("|") === modKey
    );
    if (existing) {
      existing.quantity += item.quantity;
    } else {
      consolidated.push({
        name: item.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        modifiers: [...item.modifiers],
      });
    }
  }

  const itemsHtml = consolidated
    .map(
      (item) => `
    <div class="ti-line">
      <span class="ti-name">${item.quantity}x ${item.name}</span>
      <span class="ti-price">${fmtTicket(item.unitPrice * item.quantity)}</span>
    </div>
    ${item.modifiers.length ? item.modifiers.map((m) => `<div class="ti-mod">+ ${m}</div>`).join("") : ""}`
    )
    .join("");

  const cashHtml =
    data.cashReceived != null
      ? `
    <div class="tr-row"><span>Recibido</span><span>${fmtTicket(data.cashReceived)}</span></div>
    <div class="tr-row"><span>Cambio</span><span>${fmtTicket(data.changeAmount ?? 0)}</span></div>`
      : "";

  // Use logo URL directly (Vite resolves it at build time). On first print,
  // a small inline script in the overlay will fetch & data-uri it if needed.
  const logoUrl = logoTicket;

  const overlay = document.createElement("div");
  overlay.id = "__ticket_print_overlay__";
  overlay.innerHTML = `
    <style id="__tps__">
      #__ticket_print_overlay__ {
        position:fixed; inset:0; z-index:99999;
        display:flex; align-items:flex-start; justify-content:center;
        padding-top:4px; background:#f0f0f0;
        font-family:"Courier New",monospace;
      }
      #__ticket_print_overlay__ .print-bar {
        position:fixed; top:0; left:0; right:0; z-index:1;
        display:flex; gap:8px; justify-content:center; padding:6px;
      }
      #__ticket_print_overlay__ .print-bar button {
        padding:8px 20px; border-radius:12px; font-weight:700;
        font-size:14px; border:none; cursor:pointer;
      }
      #__ticket_print_overlay__ .btn-print {
        background:#c8a84e; color:#1a1a1a; box-shadow:0 2px 8px rgba(200,168,78,.5);
      }
      #__ticket_print_overlay__ .btn-close {
        background:#e0e0e0; color:#333;
      }
      #__ticket_print_overlay__ .ticket-wrap {
        width:302px; max-width:100vw; margin-top:44px; margin-bottom:16px;
      }
      #__ticket_print_overlay__ .ticket {
        background:#fff; border-radius:6px; padding:4px 10px 12px 10px;
        box-shadow:0 5px 20px rgba(0,0,0,.15);
        color:#111; font-size:11px; line-height:1.3; overflow:hidden;
      }
      #__ticket_print_overlay__ .ticket-header {
        text-align:center; margin-bottom:2px;
      }
      #__ticket_print_overlay__ .ticket-header img {
        display:block; width:48px; height:48px; margin:0 auto; object-fit:contain;
      }
      #__ticket_print_overlay__ .ticket-business {
        font-family:"Playfair Display",Georgia,serif; font-size:15px; font-weight:800;
      }
      #__ticket_print_overlay__ .ticket-slogan {
        font-family:"Playfair Display",Georgia,serif; font-size:10px; font-style:italic; color:#555;
      }
      #__ticket_print_overlay__ .ticket-address { font-size:9px; color:#555; }
      #__ticket_print_overlay__ .ticket-divider {
        border-top:1px dashed #999; margin:4px 0;
      }
      #__ticket_print_overlay__ .ticket-divider-double {
        border-top:1px dashed #999; border-bottom:1px dashed #999;
        height:2px; margin:4px 0;
      }
      #__ticket_print_overlay__ .ti-row { display:flex; justify-content:space-between; font-size:9px; }
      #__ticket_print_overlay__ .ti-row span:first-child { text-transform:uppercase; }
      #__ticket_print_overlay__ .ti-line {
        display:flex; justify-content:space-between; align-items:baseline;
        font-weight:600; font-size:11px; margin-top:3px;
      }
      #__ticket_print_overlay__ .ti-name {
        flex:1; min-width:0; word-break:break-word; overflow-wrap:break-word;
      }
      #__ticket_print_overlay__ .ti-price {
        flex-shrink:0; margin-left:6px; white-space:nowrap;
      }
      #__ticket_print_overlay__ .ti-mod {
        font-size:9px; padding-left:16px; color:#666; font-style:italic;
      }
      #__ticket_print_overlay__ .tr-row {
        display:flex; justify-content:space-between; font-size:9px;
      }
      #__ticket_print_overlay__ .ticket-total {
        display:flex; justify-content:space-between; font-size:15px; font-weight:800;
        padding-top:2px; margin-top:2px;
      }
      #__ticket_print_overlay__ .ticket-footer {
        text-align:center; font-style:italic; font-size:9px;
      }
      #__ticket_print_overlay__ .ticket-footer p + p {
        opacity:0.6; margin-top:2px;
      }
      #__ticket_print_overlay__ .ticket-feed { height:8mm; }

      @media print {
        /* Keep only the overlay visible */
        html, body { width:80mm !important; margin:0 !important; padding:0 !important; background:#fff !important; }
        body > :not(#__ticket_print_overlay__) { display:none !important; }
        #__ticket_print_overlay__ {
          display:block !important; position:static !important; inset:auto !important;
          width:80mm !important; max-width:80mm !important;
          padding:0 !important; margin:0 !important;
          background:#fff !important; overflow:hidden !important;
        }
        #__ticket_print_overlay__ .print-bar { display:none !important; }
        #__ticket_print_overlay__ .ticket-wrap {
          width:80mm !important; max-width:80mm !important;
          margin:0 !important; overflow:hidden !important;
        }
        #__ticket_print_overlay__ .ticket {
          box-shadow:none !important; border-radius:0 !important;
          padding:1.5mm 2mm 3mm 2mm !important;
          font-size:2.2mm !important; line-height:1.2 !important;
          width:76mm !important; max-width:76mm !important;
          word-wrap:break-word !important; overflow-wrap:break-word !important;
        }
        #__ticket_print_overlay__ .ticket-header img {
          display:block !important; margin:0 auto !important;
          width:9mm !important; height:9mm !important; object-fit:contain !important;
        }
        #__ticket_print_overlay__ .ticket-business { font-size:3mm !important; }
        #__ticket_print_overlay__ .ticket-slogan { font-size:2mm !important; }
        #__ticket_print_overlay__ .ticket-address { font-size:1.8mm !important; }
        #__ticket_print_overlay__ .ti-line { font-size:2.2mm !important; }
        #__ticket_print_overlay__ .ti-mod { font-size:1.7mm !important; padding-left:4mm !important; font-style:italic !important; }
        #__ticket_print_overlay__ .tr-row { font-size:1.8mm !important; }
        #__ticket_print_overlay__ .ticket-total { font-size:3.2mm !important; font-weight:900 !important; }
        #__ticket_print_overlay__ .ticket-divider-double {
          border-top:1px dashed #999 !important; border-bottom:1px dashed #999 !important;
          height:1.5px !important; margin:3px 0 !important;
        }
        #__ticket_print_overlay__ .ticket-footer { font-size:1.8mm !important; }
        #__ticket_print_overlay__ .ti-name {
          max-width:55mm !important; word-break:break-word !important;
        }
        #__ticket_print_overlay__ .ti-price {
          white-space:nowrap !important; flex-shrink:0 !important; margin-left:4px !important;
        }
      }
    </style>
    <div class="print-bar">
      <button class="btn-print" onclick="window.print()">🖨️ Imprimir</button>
      <button class="btn-close" onclick="document.getElementById('__ticket_print_overlay__')?.remove()">✕ Cerrar</button>
    </div>
    <div class="ticket-wrap">
      <div class="ticket">
        <div class="ticket-header">
          <img src="${logoUrl}" alt="Logo" />
          <div class="ticket-business">Esquites La Parroquia</div>
          <div class="ticket-slogan">El sabor que nos une</div>
          <div class="ticket-address">Acámbaro, Gto.</div>
        </div>
        <div class="ticket-divider"></div>
        <div class="ti-row"><span>Folio:</span><span style="font-weight:bold">${data.folio}</span></div>
        <div class="ti-row"><span>Fecha:</span><span>${dateStr}</span></div>
        <div class="ti-row"><span>Hora:</span><span>${timeStr}</span></div>
        <div class="ti-row"><span>Cajero:</span><span>${data.cashier}</span></div>
        <div class="ticket-divider"></div>
        ${itemsHtml}
        <div class="ticket-divider"></div>
        <div class="tr-row"><span>Subtotal</span><span>${fmtTicket(data.subtotal)}</span></div>
        <div class="tr-row"><span>Impuestos</span><span>${fmtTicket(data.tax)}</span></div>
        <div class="ticket-divider-double"></div>
        <div class="ticket-total"><span>TOTAL</span><span>${fmtTicket(data.total)}</span></div>
        <div class="ticket-divider-double"></div>
        <div class="tr-row"><span>Pago:</span><span style="text-transform:uppercase;font-weight:600">${data.paymentMethod}</span></div>
        ${cashHtml}
        <div class="ticket-divider"></div>
        <div class="ticket-footer">
          <p>¡Gracias por tu visita!</p>
          <p>FB/IG: @EsquitesLaParroquia</p>
          <p>esquiteslaparroquia.mx</p>
        </div>
        <div class="ticket-feed"></div>
      </div>
    </div>`;

  document.body.appendChild(overlay);

  // Auto-trigger print after a short delay for layout
  setTimeout(() => {
    window.print();
    // Remove overlay after print dialog interaction
    setTimeout(() => {
      if (document.body.contains(overlay)) document.body.removeChild(overlay);
    }, 1000);
  }, 400);
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
