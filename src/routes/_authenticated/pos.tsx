import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search, Trash2, Plus, Minus, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CATEGORIES, PRODUCTS, type CategoryId, type Product } from "@/data/catalog";
import { useCart, calcTotals, fmt } from "@/store/cart";
import { useSales, nextFolio, type PaymentMethod } from "@/store/sales";
import { ProductModifierDialog } from "@/components/ProductModifierDialog";
import { CheckoutDialog } from "@/components/CheckoutDialog";
import { ReceiptDialog } from "@/components/ReceiptDialog";

export const Route = createFileRoute("/_authenticated/pos")({
  head: () => ({ meta: [{ title: "Punto de Venta · Esquites La Parroquia" }] }),
  component: POSPage,
});

function POSPage() {
  const [category, setCategory] = useState<CategoryId>("fritura");
  const [query, setQuery] = useState("");
  const [modProduct, setModProduct] = useState<Product | null>(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [lastSale, setLastSale] = useState<ReturnType<typeof useSales.getState>["sales"][number] | null>(null);

  const cart = useCart();
  const addSale = useSales((s) => s.addSale);
  const totals = calcTotals(cart.items, cart.discount, cart.taxRate);

  const products = useMemo(() => {
    const q = query.trim().toLowerCase();
    return PRODUCTS.filter(
      (p) => (q ? p.name.toLowerCase().includes(q) : p.category === category),
    );
  }, [category, query]);

  const onProductClick = (p: Product) => {
    if (p.modifiers && p.modifiers.length) setModProduct(p);
    else cart.addItem(p, []);
  };

  const handleConfirm = (method: PaymentMethod, received?: number, change?: number) => {
    const sale = {
      id: crypto.randomUUID(),
      folio: nextFolio(),
      createdAt: new Date().toISOString(),
      cashier: "Demo",
      items: cart.items,
      subtotal: totals.subtotal,
      tax: totals.tax,
      total: totals.total,
      payment: method,
      received,
      change,
    };
    addSale(sale);
    setLastSale(sale);
    setCheckoutOpen(false);
    cart.clear();
  };

  return (
    <div className="flex h-screen w-full">
      {/* LEFT */}
      <section className="flex-1 flex flex-col p-4 lg:p-6 min-w-0">
        <header className="flex items-center gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Buscar producto..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-10 h-12 bg-surface border-border text-base"
            />
          </div>
        </header>

        <div className="flex gap-2 mb-4 overflow-x-auto pb-1 scrollbar-thin">
          {CATEGORIES.map((c) => {
            const active = c.id === category && !query;
            return (
              <button
                key={c.id}
                onClick={() => { setQuery(""); setCategory(c.id); }}
                className={`px-4 py-2.5 rounded-xl whitespace-nowrap text-sm font-semibold transition ${
                  active
                    ? "bg-gradient-to-r from-gold to-gold-soft text-primary-foreground shadow-[var(--shadow-gold)]"
                    : "bg-surface text-muted-foreground hover:text-foreground gold-border"
                }`}
              >
                <span className="mr-1.5">{c.emoji}</span>{c.label}
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 overflow-y-auto pr-1 pb-4 auto-rows-min">
          {products.map((p) => (
            <button
              key={p.id}
              onClick={() => onProductClick(p)}
              className="group relative bg-card rounded-2xl p-4 text-left gold-border hover:border-gold transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-gold)] active:scale-[0.98]"
            >
              <div className="text-4xl mb-2">{p.emoji}</div>
              <div className="font-semibold text-sm leading-tight line-clamp-2 min-h-[2.5rem]">{p.name}</div>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-lg font-bold gold-text">{fmt(p.price)}</span>
                {p.modifiers?.length ? (
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Personalizable</span>
                ) : null}
              </div>
            </button>
          ))}
          {products.length === 0 && (
            <div className="col-span-full text-center text-muted-foreground py-10">Sin resultados.</div>
          )}
        </div>
      </section>

      {/* RIGHT - CART */}
      <aside className="w-[380px] lg:w-[420px] shrink-0 bg-surface border-l border-border flex flex-col">
        <div className="p-5 border-b border-border">
          <h2 className="font-display text-xl">Carrito de venta</h2>
          <p className="text-xs text-muted-foreground">{cart.items.length} producto(s)</p>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {cart.items.length === 0 && (
            <div className="text-center text-muted-foreground py-16 px-4">
              <div className="text-5xl mb-3">🛒</div>
              <p className="text-sm">Selecciona productos para iniciar la venta.</p>
            </div>
          )}
          {cart.items.map((i) => (
            <div key={i.uid} className="bg-card rounded-xl p-3 gold-border">
              <div className="flex items-start gap-2">
                <div className="text-2xl">{i.product.emoji}</div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm leading-tight">{i.product.name}</div>
                  {i.modifiers.filter((m) => m.optionLabel).map((m, idx) => (
                    <div key={idx} className="text-[11px] text-gold">+ {m.optionLabel}</div>
                  ))}
                  <div className="text-xs text-muted-foreground mt-0.5">{fmt(i.unitPrice)} c/u</div>
                </div>
                <button onClick={() => cart.removeItem(i.uid)} className="text-muted-foreground hover:text-destructive">
                  <Trash2 className="size-4" />
                </button>
              </div>
              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center gap-2">
                  <button onClick={() => cart.setQty(i.uid, i.quantity - 1)} className="size-8 rounded-lg bg-surface-2 flex items-center justify-center hover:bg-accent">
                    <Minus className="size-3" />
                  </button>
                  <span className="w-6 text-center font-bold">{i.quantity}</span>
                  <button onClick={() => cart.setQty(i.uid, i.quantity + 1)} className="size-8 rounded-lg bg-surface-2 flex items-center justify-center hover:bg-accent">
                    <Plus className="size-3" />
                  </button>
                </div>
                <div className="font-bold gold-text">{fmt(i.unitPrice * i.quantity)}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-border space-y-2">
          <Row label="Subtotal" value={fmt(totals.subtotal)} />
          <Row label="Descuento" value={fmt(cart.discount)} muted />
          <Row label={`Impuestos (${cart.taxRate}%)`} value={fmt(totals.tax)} muted />
          <div className="flex justify-between items-center pt-2 border-t border-border">
            <span className="text-sm text-muted-foreground">TOTAL</span>
            <span className="font-display text-3xl font-bold gold-text">{fmt(totals.total)}</span>
          </div>
          <Button
            disabled={cart.items.length === 0}
            onClick={() => setCheckoutOpen(true)}
            className="w-full h-14 text-lg font-bold bg-success hover:bg-success/90 text-success-foreground"
          >
            COBRAR
          </Button>
          <Button
            variant="ghost"
            disabled={cart.items.length === 0}
            onClick={() => cart.clear()}
            className="w-full text-muted-foreground hover:text-destructive"
          >
            <X className="size-4 mr-1" /> Cancelar venta
          </Button>
        </div>
      </aside>

      <ProductModifierDialog
        product={modProduct}
        open={!!modProduct}
        onOpenChange={(b) => !b && setModProduct(null)}
      />
      <CheckoutDialog
        open={checkoutOpen}
        onOpenChange={setCheckoutOpen}
        total={totals.total}
        onConfirm={handleConfirm}
      />
      <ReceiptDialog
        sale={lastSale}
        open={!!lastSale}
        onOpenChange={(b) => !b && setLastSale(null)}
      />
    </div>
  );
}

function Row({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className={`flex justify-between text-sm ${muted ? "text-muted-foreground" : ""}`}>
      <span>{label}</span><span>{value}</span>
    </div>
  );
}
