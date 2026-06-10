import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import type { Product } from "@/data/catalog";
import { useCart, type CartItem } from "@/store/cart";
import { fmt } from "@/store/cart";

export function ProductModifierDialog({
  product,
  open,
  onOpenChange,
}: {
  product: Product | null;
  open: boolean;
  onOpenChange: (b: boolean) => void;
}) {
  const addItem = useCart((s) => s.addItem);
  const [selections, setSelections] = useState<Record<string, string>>({});

  if (!product) return null;
  const groups = product.modifiers ?? [];

  const handleAdd = () => {
    const mods: CartItem["modifiers"] = groups.map((g) => {
      const optId = selections[g.id];
      const opt = g.options.find((o) => o.id === optId);
      return { groupLabel: g.label, optionLabel: opt?.label ?? "" };
    });
    addItem(product, mods);
    setSelections({});
    onOpenChange(false);
  };

  const allSelected = groups.every((g) => !g.required || selections[g.id]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card gold-border">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">
            <span className="text-3xl mr-2">{product.emoji}</span>
            {product.name}
          </DialogTitle>
          <p className="text-gold text-lg font-semibold">{fmt(product.price)}</p>
          {product.description && (
            <p className="text-sm text-muted-foreground">{product.description}</p>
          )}
        </DialogHeader>

        <div className="space-y-5 py-2">
          {groups.map((g) => (
            <div key={g.id}>
              <Label className="text-base font-semibold mb-3 block">
                {g.label} {g.required && <span className="text-destructive">*</span>}
              </Label>
              <RadioGroup
                value={selections[g.id] ?? ""}
                onValueChange={(v) => setSelections((s) => ({ ...s, [g.id]: v }))}
                className="grid grid-cols-2 gap-2"
              >
                {g.options.map((o) => (
                  <label
                    key={o.id}
                    className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition ${
                      selections[g.id] === o.id
                        ? "border-gold bg-gold/10"
                        : "border-border hover:border-gold/40"
                    }`}
                  >
                    <RadioGroupItem value={o.id} id={`${g.id}-${o.id}`} />
                    <span className="text-sm font-medium">{o.label}</span>
                  </label>
                ))}
              </RadioGroup>
            </div>
          ))}

          {product.includes && (
            <div className="rounded-xl bg-surface-2 p-4">
              <div className="text-xs uppercase tracking-wider text-gold mb-2">Incluye</div>
              <div className="flex flex-wrap gap-1.5">
                {product.includes.map((i) => (
                  <span key={i} className="text-xs px-2 py-1 rounded-md bg-background/50">
                    {i}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            disabled={!allSelected}
            onClick={handleAdd}
            className="bg-gradient-to-r from-gold to-gold-soft text-primary-foreground font-semibold hover:opacity-90"
          >
            Agregar al carrito
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
