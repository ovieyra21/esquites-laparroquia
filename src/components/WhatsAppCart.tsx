import { useState } from "react";
import { ShoppingBag, Plus, Minus, X, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fmt } from "@/store/cart";

export type WaItem = { id: string; name: string; price: number; emoji?: string; qty: number };

export function useWhatsAppCart() {
  const [items, setItems] = useState<WaItem[]>([]);
  const add = (it: Omit<WaItem, "qty">) =>
    setItems((p) => {
      const e = p.find((x) => x.id === it.id);
      return e ? p.map((x) => (x.id === it.id ? { ...x, qty: x.qty + 1 } : x)) : [...p, { ...it, qty: 1 }];
    });
  const inc = (id: string) => setItems((p) => p.map((x) => (x.id === id ? { ...x, qty: x.qty + 1 } : x)));
  const dec = (id: string) =>
    setItems((p) =>
      p.flatMap((x) => (x.id === id ? (x.qty <= 1 ? [] : [{ ...x, qty: x.qty - 1 }]) : [x])),
    );
  const remove = (id: string) => setItems((p) => p.filter((x) => x.id !== id));
  const clear = () => setItems([]);
  const total = items.reduce((s, x) => s + x.price * x.qty, 0);
  const count = items.reduce((s, x) => s + x.qty, 0);
  return { items, add, inc, dec, remove, clear, total, count };
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

  if (cart.count === 0 && !open) return null;

  const message = [
    `*Pedido — ${businessName}*`,
    ...cart.items.map((i) => `• ${i.qty}× ${i.name} — ${fmt(i.price * i.qty)}`),
    "",
    `*Total: ${fmt(cart.total)}*`,
    name ? `Nombre: ${name}` : null,
    `Para: ${mode === "aqui" ? "comer aquí" : "llevar"}`,
  ]
    .filter(Boolean)
    .join("\n");
  const number = (whatsappNumber || "").replace(/[^\d]/g, "");
  const waLink = number ? `https://wa.me/${number}?text=${encodeURIComponent(message)}` : null;

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-40 inline-flex items-center gap-2 px-5 h-14 rounded-full bg-gradient-to-r from-[oklch(0.78_0.13_82)] to-[oklch(0.72_0.14_75)] text-primary-foreground shadow-[var(--shadow-gold)] font-bold"
      >
        <ShoppingBag className="size-5" />
        <span>{cart.count}</span>
        <span className="hidden sm:inline">· {fmt(cart.total)}</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setOpen(false)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full sm:max-w-md bg-card rounded-t-3xl sm:rounded-3xl gold-border p-5 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-display text-xl gold-text">Tu pedido</h3>
              <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground"><X className="size-5" /></button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 -mx-1 px-1">
              {cart.items.length === 0 && <p className="text-muted-foreground text-center py-8 text-sm">Aún no agregas productos.</p>}
              {cart.items.map((i) => (
                <div key={i.id} className="flex items-center gap-2 bg-surface-2 rounded-xl p-2">
                  <span className="text-2xl">{i.emoji ?? "🌽"}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{i.name}</div>
                    <div className="text-xs text-muted-foreground">{fmt(i.price)} c/u</div>
                  </div>
                  <button onClick={() => cart.dec(i.id)} className="size-7 rounded bg-card flex items-center justify-center"><Minus className="size-3" /></button>
                  <span className="w-6 text-center text-sm font-bold">{i.qty}</span>
                  <button onClick={() => cart.inc(i.id)} className="size-7 rounded bg-card flex items-center justify-center"><Plus className="size-3" /></button>
                </div>
              ))}
            </div>

            {cart.items.length > 0 && (
              <div className="space-y-3 pt-3 border-t border-border mt-3">
                <div className="grid grid-cols-2 gap-2">
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Tu nombre (opcional)" />
                  <div className="flex rounded-lg bg-surface-2 p-0.5">
                    <button onClick={() => setMode("llevar")} className={`flex-1 text-xs py-2 rounded ${mode === "llevar" ? "bg-gold/30 text-foreground" : "text-muted-foreground"}`}>Llevar</button>
                    <button onClick={() => setMode("aqui")} className={`flex-1 text-xs py-2 rounded ${mode === "aqui" ? "bg-gold/30 text-foreground" : "text-muted-foreground"}`}>Aquí</button>
                  </div>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-sm text-muted-foreground">Total</span>
                  <span className="font-display text-3xl gold-text">{fmt(cart.total)}</span>
                </div>
                {waLink ? (
                  <Button asChild className="w-full h-12 bg-[#25D366] hover:bg-[#1ebe57] text-white font-bold">
                    <a href={waLink} target="_blank" rel="noopener">
                      <Send className="size-4 mr-2" /> Enviar por WhatsApp
                    </a>
                  </Button>
                ) : (
                  <p className="text-xs text-muted-foreground text-center">Configura el número de WhatsApp en /configuracion.</p>
                )}
                <button onClick={cart.clear} className="w-full text-xs text-muted-foreground hover:text-destructive">Vaciar carrito</button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
