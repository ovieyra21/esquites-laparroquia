
import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { inventoryApi, type InventoryItem } from "@/lib/inventory.functions";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Loader2, Save } from "lucide-react";
import { toast } from "sonner";

interface RecipeDialogProps {
    productId: string | null;
    productName: string | null;
    onClose: () => void;
}

export function RecipeDialog({ productId, productName, onClose }: RecipeDialogProps) {
    const qc = useQueryClient();
    const { data: inventoryItems } = useQuery({
        queryKey: ["inventory-items"],
        queryFn: () => inventoryApi.getItems(),
    });

    const { data: recipes, isLoading: isLoadingRecipes } = useQuery({
        queryKey: ["product-recipes", productId],
        queryFn: () => productId ? inventoryApi.getRecipes(productId) : Promise.resolve([]),
        enabled: !!productId,
    });

    const [busy, setBusy] = useState(false);
    const [localItems, setLocalItems] = useState<any[]>([]);

    useEffect(() => {
        if (recipes) {
            setLocalItems(recipes.map(r => ({
                id: r.id,
                inventory_item_id: r.inventory_item_id,
                quantity: r.quantity,
                name: (r as any).inventory_items?.name,
                unit: (r as any).inventory_items?.unit
            })));
        } else {
            setLocalItems([]);
        }
    }, [recipes]);

    const addItem = () => {
        if (!inventoryItems?.length) return;
        const first = inventoryItems[0];
        setLocalItems([...localItems, {
            inventory_item_id: first.id,
            quantity: 1,
            name: first.name,
            unit: first.unit
        }]);
    };

    const removeItem = (index: number) => {
        setLocalItems(localItems.filter((_, i) => i !== index));
    };

    const updateItem = (index: number, field: string, value: any) => {
        const next = [...localItems];
        if (field === "inventory_item_id") {
            const item = inventoryItems?.find(i => i.id === value);
            next[index] = { ...next[index], inventory_item_id: value, name: item?.name, unit: item?.unit };
        } else {
            next[index] = { ...next[index], [field]: value };
        }
        setLocalItems(next);
    };

    const save = async () => {
        if (!productId) return;
        setBusy(true);
        try {
            // For simplicity, we delete existing and re-insert or just upsert
            // The product_recipes has a UNIQUE constraint on (product_id, inventory_item_id)
            // So we can just upsert the ones we have and maybe delete the ones we removed

            // 1. Delete items that were in recipes but NOT in localItems
            const currentIds = localItems.filter(l => l.id).map(l => l.id);
            const toDelete = recipes?.filter(r => !currentIds.includes(r.id)) || [];
            for (const d of toDelete) {
                await inventoryApi.deleteRecipe(d.id);
            }

            // 2. Upsert items
            for (const item of localItems) {
                await inventoryApi.saveRecipe({
                    id: item.id,
                    product_id: productId,
                    inventory_item_id: item.inventory_item_id,
                    quantity: item.quantity
                });
            }

            toast.success("Receta guardada");
            qc.invalidateQueries({ queryKey: ["product-recipes", productId] });
            onClose();
        } catch (e: any) {
            toast.error(e.message);
        } finally {
            setBusy(false);
        }
    };

    return (
        <Dialog open={!!productId} onOpenChange={(o) => !o && onClose()}>
            <DialogContent className="bg-card gold-border max-w-xl">
                <DialogHeader>
                    <DialogTitle className="font-display text-2xl">Receta: {productName}</DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <p className="text-sm text-muted-foreground">
                        Define los insumos y la cantidad exacta que se consume por cada venta de este producto.
                    </p>

                    <div className="space-y-2">
                        {localItems.map((item, index) => (
                            <div key={index} className="flex gap-2 items-end">
                                <div className="flex-1 space-y-1">
                                    <Label className="text-[10px] uppercase">Insumo</Label>
                                    <select
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                        value={item.inventory_item_id}
                                        onChange={(e) => updateItem(index, "inventory_item_id", e.target.value)}
                                    >
                                        {inventoryItems?.map(i => (
                                            <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="w-24 space-y-1">
                                    <Label className="text-[10px] uppercase">Cantidad</Label>
                                    <Input
                                        type="number"
                                        value={item.quantity}
                                        onChange={(e) => updateItem(index, "quantity", Number(e.target.value))}
                                    />
                                </div>
                                <div className="pb-1">
                                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => removeItem(index)}>
                                        <Trash2 className="size-4" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>

                    <Button variant="outline" className="w-full border-dashed" onClick={addItem}>
                        <Plus className="size-4 mr-1" /> Añadir insumo a la receta
                    </Button>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancelar</Button>
                    <Button onClick={save} disabled={busy} className="bg-linear-to-r from-gold to-gold-soft text-primary-foreground font-bold">
                        {busy ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4 mr-1" />}
                        Guardar Receta
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
