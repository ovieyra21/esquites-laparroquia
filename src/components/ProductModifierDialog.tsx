import { useState, useMemo, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import type { Product } from "@/lib/catalog-types";
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
  const [selectedGroups, setSelectedGroups] = useState<Record<string, string[]>>(() => {
    const initial: Record<string, string[]> = {};
    product?.modifierGroups?.forEach((g) => {
      initial[g.id] = g.modifiers
        .slice(0, g.minSelections)
        .map((o) => o.id);
    });
    return initial;
  });

  if (!product) return null;
  const groups = product.modifierGroups ?? [];

  const toggleOption = (groupId: string, optionId: string) => {
    const group = groups.find((g) => g.id === groupId);
    if (!group) return;

    setSelectedGroups((prev) => {
      const current = prev[groupId] ?? [];
      const isSelected = current.includes(optionId);

      if (isSelected) {
        return { ...prev, [groupId]: current.filter((id) => id !== optionId) };
      } else {
        if (current.length >= group.maxSelections) return prev;
        return { ...prev, [groupId]: [...current, optionId] };
      }
    });
  };

  const isGroupValid = (groupId: string) => {
    const group = groups.find((g) => g.id === groupId);
    if (!group) return true;
    const count = selectedGroups[groupId]?.length ?? 0;
    return count >= group.minSelections && count <= group.maxSelections;
  };

  const allValid = groups.every((g) => isGroupValid(g.id));

  const total = useMemo(() => {
    let price = product.price;
    groups.forEach((g) => {
      selectedGroups[g.id]?.forEach((optId) => {
        const opt = g.modifiers.find((o) => o.id === optId);
        if (opt) price += opt.price;
      });
    });
    return price;
  }, [product.price, groups, selectedGroups]);

  const handleConfirm = () => {
    const mods: CartItem["modifiers"] = groups.flatMap((g) => {
      return (selectedGroups[g.id] ?? []).map((optId) => {
        const opt = g.modifiers.find((o) => o.id === optId);
        return { groupLabel: g.name, optionLabel: opt?.name ?? "", extraPrice: opt?.price ?? 0 };
      });
    });
    addItem(product, mods);
    setSelectedGroups({});
    onOpenChange(false);
  };

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

        <div className="space-y-6 my-4 max-h-[60vh] overflow-y-auto pr-2 scrollbar-thin">
          {groups.map((g) => (
            <div key={g.id} className="space-y-3">
              <div className="flex justify-between items-end">
                <div>
                  <h3 className="font-bold text-lg">{g.name}</h3>
                  <p className="text-xs text-muted-foreground">
                    {g.minSelections > 0 ? `Mínimo ${g.minSelections}, ` : ""}Máximo {g.maxSelections}
                  </p>
                </div>
                {!isGroupValid(g.id) && (
                  <span className="text-[10px] bg-destructive/10 text-destructive px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Incompleto</span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {g.modifiers.map((o) => {
                  const selected = selectedGroups[g.id]?.includes(o.id);
                  return (
                    <button
                      key={o.id}
                      onClick={() => toggleOption(g.id, o.id)}
                      className={`flex flex-col p-3 rounded-xl border text-left transition h-full ${selected
                        ? "border-gold bg-gold/10 text-foreground"
                        : "border-border text-muted-foreground hover:border-gold/30"
                        }`}
                    >
                      <span className="text-sm font-semibold leading-tight">{o.name}</span>
                      {o.price > 0 && <span className="text-xs gold-text font-bold mt-1">+{fmt(o.price)}</span>}
                    </button>
                  );
                })}
              </div>
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
            disabled={!allValid}
            onClick={handleConfirm}
            className="w-full h-14 text-lg font-bold bg-linear-to-r from-gold to-gold-soft hover:opacity-90 shadow-(--shadow-gold)"
          >
            Agregar al carrito — {fmt(total)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
