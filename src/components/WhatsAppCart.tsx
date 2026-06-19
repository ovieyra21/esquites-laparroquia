import { useState, useEffect, useCallback } from "react";
import { ShoppingBag, Plus, Minus, X, Send, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fmt } from "@/store/cart";

const STORAGE_KEY = "wa_cart_items";

export type WaItem = { id: string; name: string; price: number; emoji?: string; qty: number };

function loadCart(): WaItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveCart(items: WaItem[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {}
}

export function useWhatsAppCart() {
  const [items, setItems] = useState<WaItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from localStorage on mount
  useEffect(() => {
    setItems(loadCart());
    setHydrated(true);
  }, []);

  const persist = useCallback((next: WaItem[]) => {
    setItems(next);
    saveCart(next);
  }, []);

  const add = (it: Omit<WaItem, "qty">) =>
    persist((() => {
      const e = items.find((x) => x.id === it.id);
      return e
        ? items.map((x) => (x.id === it.id ? { ...x, qty: x.qty + 1 } : x))
        : [...items, { ...it, qty: 1 }];
    })());

  const inc = (id: string) =>
    persist(items.map((x) => (x.id === id ? { ...x, qty: x.qty + 1 } : x)));

  const dec = (id: string) =>
    persist(
      items.flatMap((x) =>
        x.id === id ? (x.qty <= 1 ? [] : [{ ...x, qty: x.qty - 1 }]) : [x],
      ),
    );

  const remove = (id: string) => persist(items.filter((x) => x.id !== id));
  const clear = () => persist([]);
  const total = items.reduce((s, x) => s + x.price * x.qty, 0);
  const count = items.reduce((s, x) => s + x.qty, 0);

  return { items, add, inc, dec, remove, clear, total, count, hydrated };
}

export function WhatsAppCartButton({
  cart,
  whatsappNumber,
  businessName = "Esquites La Parroquia",
}: {
  cart: ReturnType<typeof useWhatsAppCart>;
  whatsappNumber: string | null;
  businessName?: string;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [mode, setMode] = useState<"aqui" | "llevar">("llevar");
  const [sent, setSent] = useState(false);

  // Don't show until hydrated to avoid flash
  if (!cart.hydrated) return null;
  if (cart.count === 0 && !open) return null;

  const message = [
    `*Pedido — ${businessName}*`,
    ...cart.items.map((i) => `• ${i.qty}× ${i.emoji ?? "🌽"} ${i.name} — ${fmt(i.price * i.qty)}`),
    "",
    `*Total: ${fmt(cart.total)}*`,
    name ? `Nombre: ${name}` : null,
    `Para: ${mode === "aqui" ? "comer aquí 🍽️" : "llevar 🛍️"}`,
  ]
    .filter(Boolean)
    .join("\n");

  const number = (whatsappNumber || "").replace(/[^\d]/g, "");
  const waLink = number ? `https://wa.me/${number}?text=${encodeURIComponent(message)}` : null;

  const handleSend = () => {
    if (waLink) {
      setSent(true);
      setTimeout(() => setSent(false), 3000);
      window.open(waLink, "_blank", "noopener");
    }
  };

  return (
    <>
      {/* Floating button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-5 right-5 z-40 inline-flex items-center gap-2 px-5 h-14 rounded-full bg-gradient-to-r from-[#25D366] to-[#128C7E] text-white shadow-lg font-bold animate-fade-in hover:scale-105 transition-transform"
        >
          <ShoppingBag className="size-5" />
          <span className="bg-white/20 min-w-[22px] h-[22px] rounded-full text-xs flex items-center justify-center font-black">
            {cart.count}
          </span>
          <span className="hidden sm:inline">· {fmt(cart.total)}</span>
        </button>
      )}

      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-md bg-card rounded-t-3xl sm:rounded-3xl gold-border p-5 max-h-[90vh] flex flex-col animate-fade-in"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-display text-xl gold-text flex items-center gap-2">
                <ShoppingBag className="size-5" /> Tu pedido
              </h3>
              <button
                onClick={() => setOpen(false)}
                className="text-muted-foreground hover:text-foreground p-1"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Items */}
            <div className="flex-1 overflow-y-auto space-y-2 -mx-1 px-1 min-h-0">
              {cart.items.length === 0 && (
                <p className="text-muted-foreground text-center py-8 text-sm">
                  Aún no agregas productos. Revisa el menú y añade tus favoritos.
                </p>
              )}
              {cart.items.map((i) => (
                <div
                  key={i.id}
                  className="flex items-center gap-2 bg-surface-2 rounded-xl p-2 group"
                >
                  <span className="text-2xl shrink-0">{i.emoji ?? "🌽"}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{i.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {fmt(i.price)} c/u · {fmt(i.price * i.qty)}
                    </div>
                  </div>
                  <div className="flex items-center gap-0.5">
                    <button
                      onClick={() => cart.dec(i.id)}
                      className="size-7 rounded-lg bg-card flex items-center justify-center hover:bg-surface transition"
                    >
                      <Minus className="size-3" />
                    </button>
                    <span className="w-7 text-center text-sm font-bold">{i.qty}</span>
                    <button
                      onClick={() => cart.inc(i.id)}
                      className="size-7 rounded-lg bg-card flex items-center justify-center hover:bg-surface transition"
                    >
                      <Plus className="size-3" />
                    </button>
                    <button
                      onClick={() => cart.remove(i.id)}
                      className="size-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive transition ml-1"
                    >
                      <X className="size-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Order form & send */}
            {cart.items.length > 0 && (
              <div className="space-y-3 pt-3 border-t border-border mt-3 shrink-0">
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Tu nombre (opcional)"
                    className="h-10 text-sm"
                  />
                  <div className="flex rounded-lg bg-surface-2 p-0.5">
                    <button
                      onClick={() => setMode("llevar")}
                      className={`flex-1 text-xs py-2 rounded-md transition font-medium ${
                        mode === "llevar"
                          ? "bg-gold/30 text-foreground"
                          : "text-muted-foreground"
                      }`}
                    >
                      🛍️ Llevar
                    </button>
                    <button
                      onClick={() => setMode("aqui")}
                      className={`flex-1 text-xs py-2 rounded-md transition font-medium ${
                        mode === "aqui"
                          ? "bg-gold/30 text-foreground"
                          : "text-muted-foreground"
                      }`}
                    >
                      🍽️ Aquí
                    </button>
                  </div>
                </div>

                <div className="flex justify-between items-baseline">
                  <span className="text-sm text-muted-foreground">Total</span>
                  <span className="font-display text-3xl gold-text">{fmt(cart.total)}</span>
                </div>

                {sent ? (
                  <div className="w-full h-12 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-center gap-2 text-emerald-500 font-bold">
                    <CheckCircle2 className="size-5" /> ¡Pedido enviado!
                  </div>
                ) : waLink ? (
                  <Button
                    onClick={handleSend}
                    className="w-full h-12 bg-[#25D366] hover:bg-[#1ebe57] text-white font-bold text-base"
                  >
                    <Send className="size-4 mr-2" /> Enviar por WhatsApp
                  </Button>
                ) : (
                  <p className="text-xs text-muted-foreground text-center py-2">
                    Configura el número de WhatsApp en ajustes.
                  </p>
                )}

                <button
                  onClick={() => { cart.clear(); setOpen(false); }}
                  className="w-full text-xs text-muted-foreground hover:text-destructive py-1"
                >
                  Vaciar carrito
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
