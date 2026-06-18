import { create } from "zustand";
import type { Product } from "@/lib/catalog-types";

export type CartItem = {
  uid: string;
  product: Product;
  quantity: number;
  modifiers: { groupLabel: string; optionLabel: string; extraPrice?: number }[];
  unitPrice: number;
};

type CartState = {
  items: CartItem[];
  discount: number;
  taxRate: number;
  customerId: string | null;
  addItem: (p: Product, modifiers: CartItem["modifiers"]) => void;
  removeItem: (uid: string) => void;
  setQty: (uid: string, qty: number) => void;
  setDiscount: (n: number) => void;
  setTaxRate: (n: number) => void;
  setCustomerId: (id: string | null) => void;
  clear: () => void;
};

export const useCart = create<CartState>((set) => ({
  items: [],
  discount: 0,
  taxRate: 0,
  customerId: null,
  addItem: (product, modifiers) =>
    set((s) => ({
      items: [
        ...s.items,
        {
          uid: crypto.randomUUID(),
          product,
          quantity: 1,
          modifiers,
          unitPrice: product.price + modifiers.reduce((acc, modifier) => acc + (modifier.extraPrice ?? 0), 0),
        },
      ],
    })),
  removeItem: (uid) => set((s) => ({ items: s.items.filter((i) => i.uid !== uid) })),
  setQty: (uid, qty) =>
    set((s) => ({ items: s.items.map((i) => (i.uid === uid ? { ...i, quantity: Math.max(1, qty) } : i)) })),
  setDiscount: (n) => set({ discount: Math.max(0, n) }),
  setTaxRate: (n) => set({ taxRate: Math.max(0, n) }),
  setCustomerId: (id) => set({ customerId: id }),
  clear: () => set({ items: [], discount: 0, customerId: null }),
}));

export const calcTotals = (items: CartItem[], discount: number, taxRate: number) => {
  const subtotal = items.reduce((acc, i) => acc + i.unitPrice * i.quantity, 0);
  const taxable = Math.max(0, subtotal - discount);
  const tax = taxable * (taxRate / 100);
  const total = taxable + tax;
  return { subtotal, tax, total };
};

export const fmt = (n: number) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(n);
