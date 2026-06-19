import { create } from "zustand";
import type { CartItem } from "./cart";

export type PaymentMethod = "efectivo" | "tarjeta" | "transferencia" | "mixto" | "digital";

export type Sale = {
  id: string;
  folio: string;
  createdAt: string;
  cashier: string;
  items: CartItem[];
  subtotal: number;
  tax: number;
  total: number;
  payment: PaymentMethod;
  received?: number;
  change?: number;
  cancelled?: boolean;
  isBuffered?: boolean;
};

type SalesState = {
  sales: Sale[];
  addSale: (s: Sale) => void;
  cancel: (id: string) => void;
};

// Initialize Device ID and Folio Counter from localStorage
const getDeviceInfo = () => {
  if (typeof window === "undefined") return { deviceId: "SRV", nextFolio: 1000 };
  let devId = localStorage.getItem("pos_device_id");
  if (!devId) {
    devId = Math.random().toString(36).substring(2, 7).toUpperCase();
    localStorage.setItem("pos_device_id", devId);
  }
  const savedFolio = localStorage.getItem("pos_last_folio");
  return { deviceId: devId, nextFolio: savedFolio ? parseInt(savedFolio) : 1000 };
};

const devInfo = getDeviceInfo();
let folioCounter = devInfo.nextFolio;

export const nextFolio = () => {
  const current = ++folioCounter;
  if (typeof window !== "undefined") {
    localStorage.setItem("pos_last_folio", current.toString());
  }
  // Format: LP-[DEVICE]-[SEQUENTIAL]
  // We use a shorter prefix if needed for numeric DB constraints, 
  // but if it's text, this is perfect.
  return `LP-${devInfo.deviceId}-${current.toString().padStart(4, "0")}`;
};

export const useSales = create<SalesState>((set) => ({
  sales: [],
  addSale: (s) => set((st) => ({ sales: [s, ...st.sales] })),
  cancel: (id) => set((st) => ({ sales: st.sales.map((s) => (s.id === id ? { ...s, cancelled: true } : s)) })),
}));
