import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { inventoryApi, type InventoryItem } from "@/lib/inventory.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Box, Plus, Pencil, Trash2, Loader2, AlertCircle, TrendingUp, TrendingDown, RefreshCcw, History, Package, Eye } from "lucide-react";
import { toast } from "sonner";
import { fmt } from "@/store/cart";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/inventario")({
    head: () => ({ meta: [{ title: "Inventario · Esquites La Parroquia" }] }),
    component: InventoryPage,
});

function InventoryPage() {
    const qc = useQueryClient();
    const { data: items, isLoading } = useQuery({
        queryKey: ["inventory-items"],
        queryFn: () => inventoryApi.getItems(),
    });
    const { data: lowStockItems } = useQuery({
        queryKey: ["inventory-low-stock"],
        queryFn: () => inventoryApi.getLowStock(),
    });

    const [editItem, setEditItem] = useState<Partial<InventoryItem> | null>(null);
    const [isDeleting, setIsDeleting] = useState<string | null>(null);
    const [stockAction, setStockAction] = useState<{ item: InventoryItem; type: "entrada" | "salida" | "ajuste" } | null>(null);
    const [movementsItem, setMovementsItem] = useState<InventoryItem | null>(null);
    const [recipesItem, setRecipesItem] = useState<InventoryItem | null>(null);

    const invalidate = () => qc.invalidateQueries({ queryKey: ["inventory-items", "inventory-low-stock"] });

    if (isLoading) {
        return <div className="p-10 flex items-center gap-3 text-muted-foreground"><Loader2 className="size-5 animate-spin" /> Cargando inventario...</div>;
    }

    const lowCount = lowStockItems?.length || 0;

    return (
        <div className="p-4 lg:p-6 max-w-6xl mx-auto">
            <header className="flex items-center justify-between gap-3 mb-6">
                <div>
                    <h1 className="font-display text-3xl">Inventario</h1>
                    <p className="text-sm text-muted-foreground">Gestiona tus insumos, stock y costos.</p>
                </div>
                <div className="flex items-center gap-3">
                    {lowCount > 0 && (
                        <Badge variant="destructive" className="text-sm px-3 py-1.5 gap-1.5">
                            <AlertCircle className="size-4" /> {lowCount} insumo(s) con stock bajo
                        </Badge>
                    )}
                    <Button onClick={() => setEditItem({ name: "", unit: "kg", stock: 0, min_stock: 0, cost_per_unit: 0 })} className="bg-linear-to-r from-gold to-gold-soft text-primary-foreground font-bold">
                        <Plus className="size-4 mr-1" /> Nuevo Insumo
                    </Button>
                </div>
            </header>

            <div className="bg-card gold-border rounded-2xl overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-surface-2 text-left">
                        <tr>
                            <th className="p-4">Insumo</th>
                            <th className="p-4">Stock Actual</th>
                            <th className="p-4">Unidad</th>
                            <th className="p-4">Costo unitario</th>
                            <th className="p-4">Estado</th>
                            <th className="p-4 text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {!items?.length ? (
                            <tr>
                                <td colSpan={6} className="p-10 text-center text-muted-foreground">No hay insumos registrados.</td>
                            </tr>
                        ) : (
                            items.map((item) => {
                                const isLow = item.stock <= item.min_stock;
                                return (
                                    <tr key={item.id} className="border-t border-border hover:bg-sidebar-accent/50 transition-colors">
                                        <td className="p-4 font-medium">{item.name}</td>
                                        <td className="p-4">
                                            <span className={`font-bold ${isLow ? "text-destructive" : ""}`}>{item.stock}</span>
                                            {item.stock <= 0 && (
                                                <Badge variant="destructive" className="ml-2 text-[10px]">SIN STOCK</Badge>
                                            )}
                                        </td>
                                        <td className="p-4 text-muted-foreground">{item.unit}</td>
                                        <td className="p-4">{fmt(item.cost_per_unit)}</td>
                                        <td className="p-4">
                                            {isLow ? (
                                                <span className="flex items-center gap-1 text-destructive font-semibold">
                                                    <AlertCircle className="size-3" /> Bajo stock
                                                </span>
                                            ) : (
                                                <span className="text-success font-semibold">Normal</span>
                                            )}
                                        </td>
                                        <td className="p-4">
                                            <div className="flex justify-end gap-1">
                                                <Button variant="ghost" size="icon" title="Añadir stock" onClick={() => setStockAction({ item, type: "entrada" })}>
                                                    <TrendingUp className="size-4 text-success" />
                                                </Button>
                                                <Button variant="ghost" size="icon" title="Retirar stock" onClick={() => setStockAction({ item, type: "salida" })}>
                                                    <TrendingDown className="size-4 text-destructive" />
                                                </Button>
                                                <Button variant="ghost" size="icon" title="Ajustar stock" onClick={() => setStockAction({ item, type: "ajuste" })}>
                                                    <RefreshCcw className="size-4 text-muted-foreground" />
                                                </Button>
                                                <Button variant="ghost" size="icon" title="Movimientos" onClick={() => setMovementsItem(item)}>
                                                    <History className="size-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" title="Ver recetas que lo usan" onClick={() => setRecipesItem(item)}>
                                                    <Eye className="size-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" onClick={() => setEditItem(item)}>
                                                    <Pencil className="size-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="hover:text-destructive" onClick={async () => {
                                                    if (confirm("¿Estás seguro de eliminar este insumo?")) {
                                                        try {
                                                            await inventoryApi.deleteItem(item.id);
                                                            toast.success("Insumo eliminado");
                                                            invalidate();
                                                        } catch (e: any) {
                                                            toast.error(e.message);
                                                        }
                                                    }
                                                }}>
                                                    <Trash2 className="size-4" />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            <InventoryDialog
                item={editItem}
                onClose={() => setEditItem(null)}
                onDone={invalidate}
            />

            <StockActionDialog
                action={stockAction}
                onClose={() => setStockAction(null)}
                onDone={() => { invalidate(); }}
            />

            <MovementsDialog
                item={movementsItem}
                onClose={() => setMovementsItem(null)}
            />

            <RecipesByItemDialog
                item={recipesItem}
                onClose={() => setRecipesItem(null)}
            />
        </div>
    );
}

function InventoryDialog({ item, onClose, onDone }: { item: Partial<InventoryItem> | null; onClose: () => void; onDone: () => void }) {
    const [form, setForm] = useState<Partial<InventoryItem>>(item || {});
    const [busy, setBusy] = useState(false);

    if (item && form.id !== item.id) {
        setForm(item);
    }

    const submit = async () => {
        setBusy(true);
        try {
            await inventoryApi.upsertItem(form);
            toast.success(form.id ? "Insumo actualizado" : "Insumo creado");
            onDone();
            onClose();
        } catch (e: any) {
            toast.error(e.message);
        } finally {
            setBusy(false);
        }
    };

    return (
        <Dialog open={!!item} onOpenChange={(o) => !o && onClose()}>
            <DialogContent className="bg-card gold-border">
                <DialogHeader>
                    <DialogTitle className="font-display text-2xl">{form.id ? "Editar Insumo" : "Nuevo Insumo"}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-2">
                    <div className="space-y-2">
                        <Label>Nombre del insumo</Label>
                        <Input value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ej. Elote blanco" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Unidad de medida</Label>
                            <select
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                value={form.unit || "kg"}
                                onChange={(e) => setForm({ ...form, unit: e.target.value })}
                            >
                                <option value="kg">Kilogramos (kg)</option>
                                <option value="gr">Gramos (gr)</option>
                                <option value="l">Litros (l)</option>
                                <option value="ml">Mililitros (ml)</option>
                                <option value="pza">Piezas (pza)</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <Label>Costo por unidad</Label>
                            <Input type="number" step="0.01" value={form.cost_per_unit || ""} onChange={(e) => setForm({ ...form, cost_per_unit: Number(e.target.value) })} placeholder="0.00" />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Stock Actual</Label>
                            <Input type="number" step="0.01" value={form.stock || ""} onChange={(e) => setForm({ ...form, stock: Number(e.target.value) })} placeholder="0.00" />
                        </div>
                        <div className="space-y-2">
                            <Label>Mínimo alerta</Label>
                            <Input type="number" step="0.01" value={form.min_stock || ""} onChange={(e) => setForm({ ...form, min_stock: Number(e.target.value) })} placeholder="0.00" />
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancelar</Button>
                    <Button onClick={submit} disabled={busy || !form.name} className="bg-linear-to-r from-gold to-gold-soft text-primary-foreground font-bold">
                        {busy ? <Loader2 className="size-4 animate-spin" /> : "Guardar Insumo"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function StockActionDialog({ action, onClose, onDone }: {
    action: { item: InventoryItem; type: "entrada" | "salida" | "ajuste" } | null;
    onClose: () => void;
    onDone: () => void;
}) {
    const [quantity, setQuantity] = useState<number>(1);
    const [notes, setNotes] = useState("");
    const [busy, setBusy] = useState(false);

    const titles: Record<string, string> = {
        entrada: "Añadir Stock",
        salida: "Retirar Stock",
        ajuste: "Ajustar Stock",
    };
    const descs: Record<string, string> = {
        entrada: "Registra una compra o entrada de este insumo.",
        salida: "Registra una salida por consumo, merma o uso.",
        ajuste: "Establece el stock exacto actual (sobreescribe el valor).",
    };

    const submit = async () => {
        if (quantity <= 0) return;
        setBusy(true);
        try {
            await inventoryApi.adjustStock(action!.item.id, action!.type, quantity, notes || undefined);
            toast.success(`Stock ${action!.type === "entrada" ? "añadido" : action!.type === "salida" ? "retirado" : "ajustado"} correctamente`);
            onDone();
            onClose();
        } catch (e: any) {
            toast.error(e.message);
        } finally {
            setBusy(false);
        }
    };

    return (
        <Dialog open={!!action} onOpenChange={(o) => !o && onClose()}>
            <DialogContent className="bg-card gold-border">
                <DialogHeader>
                    <DialogTitle className="font-display text-xl">{action ? titles[action.type] : ""}</DialogTitle>
                    <DialogDescription>{action ? descs[action.type] : ""}</DialogDescription>
                </DialogHeader>
                {action && (
                    <div className="space-y-4 py-2">
                        <div className="flex items-center gap-3 p-3 bg-surface-2 rounded-xl">
                            <Box className="size-8 text-muted-foreground" />
                            <div>
                                <div className="font-semibold">{action.item.name}</div>
                                <div className="text-sm text-muted-foreground">Stock actual: <span className="font-bold">{action.item.stock}</span> {action.item.unit}</div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>
                                {action.type === "ajuste" ? "Nuevo stock exacto" : "Cantidad"}
                            </Label>
                            <Input
                                type="number"
                                step={action.item.unit === "pza" ? "1" : "0.01"}
                                value={quantity || ""}
                                onChange={(e) => setQuantity(Math.max(0, Number(e.target.value)))}
                                placeholder="0"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Nota (opcional)</Label>
                            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={action.type === "entrada" ? "Ej: Compra a proveedor" : "Ej: Merma, consumo, etc."} />
                        </div>

                        {action.type === "ajuste" && (
                            <div className="text-sm text-muted-foreground bg-surface-2 p-3 rounded-lg">
                                {quantity > action.item.stock ? (
                                    <span className="text-success">↗ Se añadirán {+(quantity - action.item.stock).toFixed(2)} {action.item.unit}</span>
                                ) : quantity < action.item.stock ? (
                                    <span className="text-destructive">↘ Se retirarán {+(action.item.stock - quantity).toFixed(2)} {action.item.unit}</span>
                                ) : (
                                    <span className="text-muted-foreground">Sin cambios</span>
                                )}
                            </div>
                        )}
                    </div>
                )}
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancelar</Button>
                    <Button onClick={submit} disabled={busy || (quantity <= 0)}>
                        {busy ? <Loader2 className="size-4 animate-spin mr-1" /> : null}
                        {action?.type === "entrada" ? "Añadir" : action?.type === "salida" ? "Retirar" : "Ajustar"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function MovementsDialog({ item, onClose }: { item: InventoryItem | null; onClose: () => void }) {
    const { data: movements, isLoading } = useQuery({
        queryKey: ["inventory-movements", item?.id],
        queryFn: () => item ? inventoryApi.getMovements(item.id) : Promise.resolve([]),
        enabled: !!item,
    });

    return (
        <Dialog open={!!item} onOpenChange={(o) => !o && onClose()}>
            <DialogContent className="bg-card gold-border max-w-xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="font-display text-xl">Movimientos: {item?.name}</DialogTitle>
                    <DialogDescription>Stock actual: <span className="font-bold">{item?.stock}</span> {item?.unit}</DialogDescription>
                </DialogHeader>
                {isLoading ? (
                    <div className="flex justify-center py-8"><Loader2 className="size-6 animate-spin" /></div>
                ) : !movements?.length ? (
                    <div className="text-center py-8 text-muted-foreground">Sin movimientos registrados.</div>
                ) : (
                    <div className="space-y-2">
                        {movements.map((m) => (
                            <div key={m.id} className="flex items-center justify-between p-3 bg-surface-2 rounded-xl text-sm">
                                <div className="flex items-center gap-2 min-w-0">
                                    {m.type === "entrada" ? (
                                        <TrendingUp className="size-4 text-success shrink-0" />
                                    ) : m.type === "salida" ? (
                                        <TrendingDown className="size-4 text-destructive shrink-0" />
                                    ) : (
                                        <RefreshCcw className="size-4 text-muted-foreground shrink-0" />
                                    )}
                                    <div className="min-w-0">
                                        <div className="font-medium capitalize">{m.type}</div>
                                        {m.notes && <div className="text-xs text-muted-foreground truncate max-w-[200px]">{m.notes}</div>}
                                    </div>
                                </div>
                                <div className="text-right shrink-0">
                                    <div className={`font-bold ${m.type === "entrada" ? "text-success" : m.type === "salida" ? "text-destructive" : ""}`}>
                                        {m.quantity > 0 ? "+" : ""}{m.quantity}
                                    </div>
                                    <div className="text-[10px] text-muted-foreground">
                                        Stock: {m.stock_before} → {m.stock_after}
                                    </div>
                                    <div className="text-[10px] text-muted-foreground">
                                        {new Date(m.created_at).toLocaleDateString("es-MX", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cerrar</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function RecipesByItemDialog({ item, onClose }: { item: InventoryItem | null; onClose: () => void }) {
    const { data: recipes, isLoading } = useQuery({
        queryKey: ["inventory-recipes-by-item", item?.id],
        queryFn: () => item ? inventoryApi.getRecipesByItem(item.id) : Promise.resolve([]),
        enabled: !!item,
    });

    return (
        <Dialog open={!!item} onOpenChange={(o) => !o && onClose()}>
            <DialogContent className="bg-card gold-border max-w-lg">
                <DialogHeader>
                    <DialogTitle className="font-display text-xl">
                        <Package className="size-5 inline mr-2" />
                        Productos que usan: {item?.name}
                    </DialogTitle>
                </DialogHeader>
                {isLoading ? (
                    <div className="flex justify-center py-8"><Loader2 className="size-6 animate-spin" /></div>
                ) : !recipes?.length ? (
                    <div className="text-center py-8 text-muted-foreground">
                        Ningún producto usa este insumo en su receta.
                    </div>
                ) : (
                    <div className="space-y-2">
                        {recipes.map((r: any) => (
                            <div key={r.id} className="flex items-center justify-between p-3 bg-surface-2 rounded-xl">
                                <div>
                                    <div className="font-semibold">{r.product_name}</div>
                                </div>
                                <div className="text-right">
                                    <div className="font-bold">{r.quantity} {item?.unit}</div>
                                    <div className="text-xs text-muted-foreground">por unidad</div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cerrar</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
