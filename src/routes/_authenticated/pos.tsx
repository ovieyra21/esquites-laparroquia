import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { Search, Trash2, Plus, Minus, X, Loader2, PanelLeftClose, PanelLeft, Gift, StickyNote } from "lucide-react";
import { useUI } from "@/store/ui";
import { useAuth, hasRole } from "@/hooks/use-auth";
import { DiscountDialog } from "@/components/DiscountDialog";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { listCategories, listProducts } from "@/lib/products.functions";
import { inferModifiers, type Product } from "@/lib/catalog-types";
import { useCart, calcTotals, fmt } from "@/store/cart";
import { useSales, nextFolio, type PaymentMethod } from "@/store/sales";
import { ProductModifierDialog } from "@/components/ProductModifierDialog";
import { CheckoutDialog } from "@/components/CheckoutDialog";
import { PaymentQRDialog } from "@/components/PaymentQRDialog";
import { PaymentTerminalDialog } from "@/components/PaymentTerminalDialog";
import { ReceiptDialog } from "@/components/ReceiptDialog";
import { saveSale } from "@/lib/sales.functions";
import { getSettings, getPrintSettings } from "@/lib/settings.functions";
import { crmApi } from "@/lib/crm.functions";
import { smartPrintTicket } from "@/lib/escpos";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/pos")({
  ssr: false,
  head: () => ({ meta: [{ title: "Punto de Venta · Esquites La Parroquia" }] }),
  component: POSPage,
});

function POSPage() {
  const [mounted, setMounted] = useState(false);

  const catsQ = useQuery({ queryKey: ["pos-cats"], queryFn: () => listCategories() });
  const prodsQ = useQuery({ queryKey: ["pos-prods"], queryFn: () => listProducts() });

  const categories = catsQ.data ?? [];
  const allProducts = (prodsQ.data ?? []) as any[];

  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [modProduct, setModProduct] = useState<Product | null>(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [lastSale, setLastSale] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [pendingDigitalSale, setPendingDigitalSale] = useState<any>(null);
  const [terminalOpen, setTerminalOpen] = useState(false);
  const [pendingTerminalSale, setPendingTerminalSale] = useState<any>(null);
  const [discountOpen, setDiscountOpen] = useState(false);

  const { roles } = useAuth();
  const isAdmin = hasRole(roles, "admin");

  const cart = useCart();

  const addSale = useSales((s) => s.addSale);
  const totals = calcTotals(cart.items, cart.discount, cart.taxRate);

  const { data: customers = [] } = useQuery({
    queryKey: ["customers"],
    queryFn: () => crmApi.getCustomers()
  });

  const { data: settings } = useQuery({
    queryKey: ["settings"],
    queryFn: () => getSettings(),
  });

  const { data: printSettings } = useQuery({
    queryKey: ["print-settings"],
    queryFn: () => getPrintSettings(),
  });

  const paymentProvider = (settings as any)?.payment_provider || "none";
  const mpDeviceId = (settings as any)?.mp_device_id || "";
  const hasTerminal = (paymentProvider === "mercadopago_point" || paymentProvider === "zettle") && !!mpDeviceId;

  const [customerSearch, setCustomerSearch] = useState("");
  const selectedCustomer = customers.find((c: any) => c.id === cart.customerId);
  const searchRef = useRef<HTMLInputElement>(null);

  const playSaleSound = useCallback(() => {
    try {
      const ctx = new AudioContext();
      const now = ctx.currentTime;
      [523.25, 659.25, 783.99].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.12, now + i * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.25);
        osc.connect(gain).connect(ctx.destination);
        osc.start(now + i * 0.08);
        osc.stop(now + i * 0.08 + 0.3);
      });
    } catch { /* Audio not available */ }
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      const key = e.key.toLowerCase();

      if (key === "/" || (e.ctrlKey && key === "k")) {
        e.preventDefault();
        searchRef.current?.focus();
        return;
      }

      if (key === "escape") {
        if (query) { setQuery(""); return; }
        if (modProduct) { setModProduct(null); return; }
        if (checkoutOpen) { setCheckoutOpen(false); return; }
        if (lastSale) { setLastSale(null); return; }
        return;
      }

      const catNum = parseInt(key);
      if (key.startsWith("f") && key.length > 1) {
        const fn = parseInt(key.slice(1));
        if (fn >= 1 && fn <= Math.min(9, categories.length)) {
          e.preventDefault();
          setQuery("");
          setCategoryId(categories[fn - 1].id);
          return;
        }
      }

      if (key === "enter" && cart.items.length > 0 && !checkoutOpen) {
        e.preventDefault();
        setCheckoutOpen(true);
        return;
      }

      if (cart.items.length > 0) {
        const lastItem = cart.items[cart.items.length - 1];
        if (key === "+" || key === "=") { cart.setQty(lastItem.uid, lastItem.quantity + 1); return; }
        if (key === "-") { cart.setQty(lastItem.uid, lastItem.quantity - 1); return; }
      }
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [query, categories, cart.items, checkoutOpen, modProduct, lastSale]);

  useEffect(() => { setMounted(true); }, []);

  const products: Product[] = useMemo(() => {
    const q = query.trim().toLowerCase();
    const effectiveCat = categoryId ?? categories[0]?.id ?? null;
    return allProducts
      .filter((p) => p.active !== false)
      .filter((p) => (q ? p.name.toLowerCase().includes(q) : effectiveCat ? p.category_id === effectiveCat : true))
      .map((p) => ({
        id: p.id,
        name: p.name,
        price: Number(p.price),
        category_id: p.category_id,
        description: p.description,
        includes: p.includes,
        emoji: p.emoji ?? "🌽",
        image_url: p.image_url,
        modifierGroups: inferModifiers({ name: p.name, category_name: p.categories?.name }),
      }));
  }, [allProducts, categoryId, query, categories]);

  useEffect(() => {
    if (!categoryId && categories.length > 0 && !query) setCategoryId(categories[0].id);
  }, [categories, categoryId, query]);

  const onProductClick = (p: Product) => {
    if (p.modifierGroups && p.modifierGroups.length) setModProduct(p);
    else cart.addItem(p, []);
  };

  const handleConfirm = async (method: PaymentMethod, received?: number, change?: number) => {
    if ((method === "tarjeta" || method === "digital") && hasTerminal) {
      const folio = nextFolio();
      const saleData = {
        folio,
        subtotal: totals.subtotal,
        tax: totals.tax,
        total: totals.total,
        paymentMethod: "tarjeta" as PaymentMethod,
        customerId: cart.customerId || undefined,
        discount: cart.discount,
        discountReason: cart.discountReason,
        isCourtesy: cart.isCourtesy,
        kitchenNotes: cart.kitchenNotes || undefined,
        items: cart.items.map(i => ({
          productId: i.product.id,
          productName: i.product.name,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          modifiers: i.modifiers.map(m => ({
            modifierName: m.optionLabel,
            extraPrice: m.extraPrice
          }))
        }))
      };
      const tempId = crypto.randomUUID();
      setPendingTerminalSale({ ...saleData, saleId: tempId, folio });
      setCheckoutOpen(false);
      setTerminalOpen(true);
      return;
    }

    if (method === "digital") {
      const folio = nextFolio();
      const saleData = {
        folio,
        subtotal: totals.subtotal,
        tax: totals.tax,
        total: totals.total,
        paymentMethod: method,
        customerId: cart.customerId || undefined,
        discount: cart.discount,
        discountReason: cart.discountReason,
        isCourtesy: cart.isCourtesy,
        kitchenNotes: cart.kitchenNotes || undefined,
        items: cart.items.map(i => ({
          productId: i.product.id,
          productName: i.product.name,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          modifiers: i.modifiers.map(m => ({
            modifierName: m.optionLabel,
            extraPrice: m.extraPrice
          }))
        }))
      };
      const tempId = crypto.randomUUID();
      setPendingDigitalSale({ ...saleData, saleId: tempId, folio });
      setCheckoutOpen(false);
      setQrDialogOpen(true);
      return;
    }

    setIsSaving(true);
    try {
      const folio = nextFolio();
      const saleData = {
        folio,
        subtotal: totals.subtotal,
        tax: totals.tax,
        total: totals.total,
        paymentMethod: method,
        cashReceived: received,
        changeAmount: change,
        customerId: cart.customerId || undefined,
        discount: cart.discount,
        discountReason: cart.discountReason,
        isCourtesy: cart.isCourtesy,
        kitchenNotes: cart.kitchenNotes || undefined,
        items: cart.items.map(i => ({
          productId: i.product.id,
          productName: i.product.name,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          modifiers: i.modifiers.map(m => ({
            modifierName: m.optionLabel,
            extraPrice: m.extraPrice
          }))
        }))
      };

      let saleId = "";
      let autoPrint = false;

      const result = await saveSale({ data: saleData });
      saleId = result.saleId;
      autoPrint = result.autoPrint;

      const completedSale = {
        id: saleId,
        folio,
        createdAt: new Date().toISOString(),
        cashier: "Cajero",
        items: cart.items,
        subtotal: totals.subtotal,
        tax: totals.tax,
        total: totals.total,
        payment: method,
        received,
        change,
        discount: cart.discount,
        discountReason: cart.discountReason,
        isCourtesy: cart.isCourtesy,
        kitchenNotes: cart.kitchenNotes,
      };

      addSale(completedSale);
      setLastSale(completedSale);
      setCheckoutOpen(false);
      const snapshotNotes = cart.kitchenNotes;
      const snapshotDiscount = cart.discount;
      const snapshotDiscountReason = cart.discountReason;
      const snapshotIsCourtesy = cart.isCourtesy;
      const snapshotItems = cart.items;
      cart.clear();
      playSaleSound();

      if (autoPrint && saleId) {
        void smartPrintTicket({
          cashier: "Cajero",
          folio,
          createdAt: new Date().toISOString(),
          subtotal: totals.subtotal,
          tax: totals.tax,
          total: totals.total,
          paymentMethod: method,
          cashReceived: received,
          changeAmount: change,
          discount: snapshotDiscount,
          discountReason: snapshotDiscountReason,
          isCourtesy: snapshotIsCourtesy,
          kitchenNotes: snapshotNotes,
          items: snapshotItems.map(i => ({
            name: i.product.name,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            modifiers: i.modifiers.filter(m => m.optionLabel).map(m => m.optionLabel),
          })),
        }, printSettings);
      }
    } catch (e: any) {
      toast.error(`Error al guardar venta: ${e.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  if (!mounted || catsQ.isLoading || prodsQ.isLoading) {
    return <div className="flex items-center justify-center h-screen text-muted-foreground"><Loader2 className="size-6 animate-spin" /></div>;
  }

  const activeCat = categoryId ?? categories[0]?.id ?? null;

  const CAT_PALETTE = [
    { color: "#b8860b", bg: "rgba(184,134,11,0.1)", border: "rgba(184,134,11,0.25)", badge: "rgba(184,134,11,0.15)" },
    { color: "#dc6803", bg: "rgba(220,104,3,0.1)", border: "rgba(220,104,3,0.25)", badge: "rgba(220,104,3,0.15)" },
    { color: "#0891b2", bg: "rgba(8,145,178,0.1)", border: "rgba(8,145,178,0.25)", badge: "rgba(8,145,178,0.15)" },
    { color: "#65a30d", bg: "rgba(101,163,13,0.1)", border: "rgba(101,163,13,0.25)", badge: "rgba(101,163,13,0.15)" },
    { color: "#9333ea", bg: "rgba(147,51,234,0.1)", border: "rgba(147,51,234,0.25)", badge: "rgba(147,51,234,0.15)" },
    { color: "#e11d48", bg: "rgba(225,29,72,0.1)", border: "rgba(225,29,72,0.25)", badge: "rgba(225,29,72,0.15)" },
    { color: "#ea580c", bg: "rgba(234,88,12,0.1)", border: "rgba(234,88,12,0.25)", badge: "rgba(234,88,12,0.15)" },
  ];
  const catVisual = (catId: string | null | undefined) => {
    if (!catId) return CAT_PALETTE[0];
    const i = categories.findIndex((c: any) => c.id === catId);
    return CAT_PALETTE[i >= 0 ? i % CAT_PALETTE.length : 0];
  };
  const catName = (catId: string | null | undefined) => {
    if (!catId) return "";
    return categories.find((c: any) => c.id === catId)?.name ?? "";
  };

  return (
    <div className="flex h-screen w-full">
      <section className="flex-1 flex flex-col p-4 lg:p-6 min-w-0">
        <header className="flex items-center gap-2 mb-4">
          <SidebarToggleButton />
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              ref={searchRef}
              placeholder="Buscar producto... (/)"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-10 h-12 bg-surface border-border text-base"
            />
          </div>
        </header>

        <div className="flex gap-2 mb-4 overflow-x-auto pb-1 scrollbar-thin">
          {categories.map((c: any) => {
            const active = c.id === activeCat && !query;
            return (
              <button
                key={c.id}
                onClick={() => { setQuery(""); setCategoryId(c.id); }}
                className={`px-4 py-2.5 rounded-xl whitespace-nowrap text-sm font-semibold transition ${
                  active
                    ? "bg-gradient-to-r from-gold to-gold-soft text-primary-foreground shadow-[var(--shadow-gold)]"
                    : "bg-surface text-muted-foreground hover:text-foreground gold-border"
                }`}
              >
                <span className="mr-1.5">{c.icon ?? "🌽"}</span>{c.name}
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 overflow-y-auto pr-1 pb-4 auto-rows-min">
          {catsQ.isLoading || prodsQ.isLoading ? (
            <div className="col-span-full py-20 flex justify-center"><Loader2 className="size-8 animate-spin text-gold" /></div>
          ) : products.map((p) => (
            <button
              key={p.id}
              onClick={() => onProductClick(p)}
              className="group relative bg-card rounded-2xl p-3 text-left gold-border hover:border-gold transition-all hover:-translate-y-0.5 hover:shadow-(--shadow-gold) active:scale-[0.98]"
            >
              {p.image_url ? (
                <img src={p.image_url} alt={p.name} className="w-full h-24 object-cover rounded-xl mb-2" loading="lazy" />
              ) : (
                <div className="text-4xl mb-2">{p.emoji || "📦"}</div>
              )}
              <div className="font-semibold text-sm leading-tight line-clamp-2 min-h-[2.5rem]">{p.name}</div>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-lg font-bold gold-text">{fmt(p.price)}</span>
                {p.modifierGroups?.length ? (
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

      <aside className="w-[320px] md:w-[340px] lg:w-[420px] shrink-0 bg-surface border-l border-border flex flex-col">
        <div className="p-5 border-b border-border">
          <h2 className="font-display text-xl">Carrito de venta</h2>
          <p className="text-xs text-muted-foreground">{cart.items.length} producto(s)</p>

          <div className="mt-4 space-y-2">
            {!cart.customerId ? (
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-3 text-muted-foreground" />
                <Input
                  placeholder="Asignar cliente..."
                  className="h-9 pl-7 text-xs bg-surface-2"
                  value={customerSearch}
                  onChange={e => setCustomerSearch(e.target.value)}
                />
                {customerSearch && (
                  <div className="absolute top-full left-0 w-full bg-card border border-border rounded-lg shadow-xl z-50 max-h-40 overflow-y-auto mt-1">
                    {customers.filter((c: any) => c.name.toLowerCase().includes(customerSearch.toLowerCase())).map((c: any) => (
                      <button
                        key={c.id}
                        className="w-full text-left p-2 hover:bg-gold/10 text-xs flex justify-between"
                        onClick={() => { cart.setCustomerId(c.id); setCustomerSearch(""); }}
                      >
                        <span>{c.name}</span>
                        <span className="text-gold font-bold">{c.loyalty_points} pts</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex justify-between items-center bg-gold/10 p-2 rounded-lg border border-gold/20">
                <div className="flex items-center gap-2">
                  <div className="size-6 bg-gold rounded-full flex items-center justify-center text-[10px] font-bold text-black uppercase">
                    {selectedCustomer?.name[0]}
                  </div>
                  <div className="text-xs">
                    <div className="font-bold truncate max-w-[120px]">{selectedCustomer?.name}</div>
                    <div className="text-gold font-semibold text-[10px]">{selectedCustomer?.loyalty_points} pts acumulados</div>
                  </div>
                </div>
                <button onClick={() => cart.setCustomerId(null)} className="text-muted-foreground hover:text-destructive">
                  <X className="size-4" />
                </button>
              </div>
            )}
            <div>
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1 mb-1">
                <StickyNote className="size-3" /> Notas para cocina
                <span className="ml-auto opacity-60">{cart.kitchenNotes.length}/200</span>
              </label>
              <Textarea
                value={cart.kitchenNotes}
                onChange={(e) => cart.setKitchenNotes(e.target.value)}
                placeholder="Ej: sin crema, bien dorado, para llevar..."
                rows={2}
                maxLength={200}
                className="text-xs bg-surface-2 resize-none"
              />
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
          {cart.items.length === 0 && (
            <div className="text-center text-muted-foreground py-16 px-4">
              <div className="text-5xl mb-3">🛒</div>
              <p className="text-sm">Selecciona productos para iniciar la venta.</p>
            </div>
          )}
          {cart.items.map((i) => {
            const cv = catVisual(i.product.category_id);
            const cn = catName(i.product.category_id);
            return (
              <div key={i.uid} className="relative bg-card rounded-xl gold-border overflow-hidden transition-all active:scale-[0.99]">
                <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: cv.color }} />
                <div className="p-3 pl-[18px]">
                  <div className="flex items-start gap-3">
                    <div className="size-11 rounded-full flex items-center justify-center text-xl shrink-0 overflow-hidden" style={{ backgroundColor: cv.bg }}>
                      {i.product.image_url ? (
                        <img src={i.product.image_url} alt="" className="size-full object-cover" />
                      ) : (
                        i.product.emoji || "📦"
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm leading-tight">{i.product.name}</div>
                      {cn && (
                        <span className="inline-block text-[10px] px-1.5 py-0.5 rounded-full mt-0.5 font-medium" style={{ backgroundColor: cv.badge, color: cv.color }}>
                          {cn}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => cart.removeItem(i.uid)}
                      className="size-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                  {i.modifiers.filter((m) => m.optionLabel).length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {i.modifiers.filter((m) => m.optionLabel).map((m, idx) => (
                        <span key={idx} className="text-[11px] px-2 py-0.5 rounded-full bg-gold/10 text-gold font-medium">
                          {m.optionLabel}{m.extraPrice ? ` (+${fmt(m.extraPrice)})` : ""}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="text-xs text-muted-foreground mt-1.5">{fmt(i.unitPrice)} c/u</div>
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/50">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => cart.setQty(i.uid, i.quantity - 1)}
                        className="size-9 rounded-lg bg-surface-2 flex items-center justify-center hover:bg-gold/10 hover:text-gold transition active:scale-95"
                      >
                        <Minus className="size-4" />
                      </button>
                      <span className="w-8 text-center font-bold text-base tabular-nums">{i.quantity}</span>
                      <button
                        onClick={() => cart.setQty(i.uid, i.quantity + 1)}
                        className="size-9 rounded-lg bg-surface-2 flex items-center justify-center hover:bg-gold/10 hover:text-gold transition active:scale-95"
                      >
                        <Plus className="size-4" />
                      </button>
                    </div>
                    <div className="font-bold gold-text text-base">{fmt(i.unitPrice * i.quantity)}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="p-4 border-t border-border space-y-2">
          <Row label="Subtotal" value={fmt(totals.subtotal)} />
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground flex items-center gap-1">
              Descuento
              {cart.isCourtesy && <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-gold/20 text-gold font-bold">Cortesía</span>}
            </span>
            <div className="flex items-center gap-2">
              <span className={cart.discount > 0 ? "text-success font-semibold" : "text-muted-foreground"}>
                {cart.discount > 0 ? `- ${fmt(cart.discount)}` : fmt(0)}
              </span>
              {isAdmin && cart.items.length > 0 && (
                <button
                  onClick={() => setDiscountOpen(true)}
                  title="Aplicar descuento o cortesía"
                  className="size-7 rounded-lg bg-surface-2 hover:bg-gold/10 hover:text-gold flex items-center justify-center text-muted-foreground"
                >
                  <Gift className="size-3.5" />
                </button>
              )}
            </div>
          </div>
          {cart.discount > 0 && cart.discountReason && (
            <div className="text-[11px] text-muted-foreground italic pl-1">Motivo: {cart.discountReason}</div>
          )}
          <Row label={`Impuestos (${cart.taxRate}%)`} value={fmt(totals.tax)} muted />

          <div className="flex justify-between items-center pt-2 border-t border-border">
            <span className="text-sm text-muted-foreground">TOTAL</span>
            <span className="font-display text-3xl font-bold gold-text">{fmt(totals.total)}</span>
          </div>
          <Button
            disabled={cart.items.length === 0 || isSaving}
            onClick={() => setCheckoutOpen(true)}
            className="w-full h-14 text-lg font-bold bg-success hover:bg-success/90 text-success-foreground"
          >
            {isSaving ? <Loader2 className="mr-2 animate-spin" /> : null}
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
      {pendingDigitalSale && (
        <PaymentQRDialog
          saleId={pendingDigitalSale.saleId}
          amount={pendingDigitalSale.total}
          description={`Venta #${pendingDigitalSale.folio}`}
          open={qrDialogOpen}
          onOpenChange={(o) => { if (!o) setPendingDigitalSale(null); setQrDialogOpen(o); }}
          onPaid={async () => {
            try {
              const result = await saveSale({ data: pendingDigitalSale });
              const saleId = result.saleId;
              const completedSale = {
                id: saleId,
                folio: pendingDigitalSale.folio,
                createdAt: new Date().toISOString(),
                cashier: "Cajero",
                items: cart.items,
                subtotal: totals.subtotal,
                tax: totals.tax,
                total: totals.total,
                payment: "digital" as PaymentMethod,
              };
              addSale(completedSale);
              setLastSale(completedSale);
              cart.clear();
              playSaleSound();
              setPendingDigitalSale(null);
              if (result.autoPrint) {
                void smartPrintTicket({
                  cashier: "Cajero",
                  folio: pendingDigitalSale.folio,
                  createdAt: new Date().toISOString(),
                  subtotal: totals.subtotal,
                  tax: totals.tax,
                  total: totals.total,
                  paymentMethod: "digital",
                  items: cart.items.map(i => ({
                    name: i.product.name,
                    quantity: i.quantity,
                    unitPrice: i.unitPrice,
                    modifiers: i.modifiers.filter(m => m.optionLabel).map(m => m.optionLabel),
                  })),
                }, printSettings);
              }
            } catch (e: any) {
              toast.error(`Error al confirmar pago: ${e.message}`);
            }
          }}
        />
      )}
      {pendingTerminalSale && (
        <PaymentTerminalDialog
          saleId={pendingTerminalSale.saleId}
          amount={pendingTerminalSale.total}
          description={`Venta #${pendingTerminalSale.folio}`}
          provider={paymentProvider as "mercadopago_point" | "zettle"}
          deviceId={mpDeviceId}
          open={terminalOpen}
          onOpenChange={(o) => { if (!o) setPendingTerminalSale(null); setTerminalOpen(o); }}
          onPaid={async () => {
            try {
              const result = await saveSale({ data: pendingTerminalSale });
              const saleId = result.saleId;
              const completedSale = {
                id: saleId,
                folio: pendingTerminalSale.folio,
                createdAt: new Date().toISOString(),
                cashier: "Cajero",
                items: cart.items,
                subtotal: totals.subtotal,
                tax: totals.tax,
                total: totals.total,
                payment: "tarjeta" as PaymentMethod,
              };
              addSale(completedSale);
              setLastSale(completedSale);
              cart.clear();
              playSaleSound();
              setPendingTerminalSale(null);
              if (result.autoPrint) {
                void smartPrintTicket({
                  cashier: "Cajero",
                  folio: pendingTerminalSale.folio,
                  createdAt: new Date().toISOString(),
                  subtotal: totals.subtotal,
                  tax: totals.tax,
                  total: totals.total,
                  paymentMethod: "tarjeta",
                  items: cart.items.map(i => ({
                    name: i.product.name,
                    quantity: i.quantity,
                    unitPrice: i.unitPrice,
                    modifiers: i.modifiers.filter(m => m.optionLabel).map(m => m.optionLabel),
                  })),
                }, printSettings);
              }
            } catch (e: any) {
              toast.error(`Error al guardar venta: ${e.message}`);
            }
          }}
        />
      )}
      <ReceiptDialog
        sale={lastSale}
        open={!!lastSale}
        onOpenChange={(b) => !b && setLastSale(null)}
      />
      <DiscountDialog
        open={discountOpen}
        onOpenChange={setDiscountOpen}
        subtotal={totals.subtotal}
        currentDiscount={cart.discount}
        onApply={(discount, reason, isCourtesy) => cart.setDiscount(discount, reason, isCourtesy)}
        onClear={() => cart.clearDiscount()}
      />

    </div>
  );
}

function SidebarToggleButton() {
  const hidden = useUI((s) => s.sidebarHidden);
  const toggle = useUI((s) => s.toggleSidebar);
  return (
    <button
      onClick={toggle}
      title={hidden ? "Mostrar menú" : "Ocultar menú"}
      className="hidden md:flex size-12 shrink-0 items-center justify-center rounded-xl bg-surface gold-border text-muted-foreground hover:text-foreground"
    >
      {hidden ? <PanelLeft className="size-5" /> : <PanelLeftClose className="size-5" />}
    </button>
  );
}

function Row({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className={`flex justify-between text-sm ${muted ? "text-muted-foreground" : ""}`}>
      <span>{label}</span><span>{value}</span>
    </div>
  );
}
