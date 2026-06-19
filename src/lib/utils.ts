import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Serialize ticket data for the standalone print page via URL hash. */
export function buildTicketHash(data: {
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
}): string {
  const payload = {
    ...data,
    businessName: "Esquites La Parroquia",
    slogan: "El sabor que nos une",
    address: "Acámbaro, Gto.",
    phone: "",
    footerMessage: "¡Gracias por su compra!",
  };
  return btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
}
