
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { inventoryApi, type InventoryItem } from "@/lib/inventory.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Box, Plus, Pencil, Trash2, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { fmt } from "@/store/cart";

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

    const [editItem, setEditItem] = useState<Partial<InventoryItem> | null>(null);
    const [isDeleting, setIsDeleting] = useState<string | null>(null);

    const invalidate = () => qc.invalidateQueries({ queryKey: ["inventory-items"] });

    if (isLoading) {
        return <div className="p-10 flex items-center gap-3 text-muted-foreground"><Loader2 className="size-5 animate-spin" /> Cargando inventario...</div>;
    }

    return (
        <div className="p-4 lg:p-6 max-w-6xl mx-auto">
            <header className="flex items-center justify-between gap-3 mb-6">
                <div>
                    <h1 className="font-display text-3xl">Inventario</h1>
                    <p className="text-sm text-muted-foreground">Gestiona tus insumos, stock y costos.</p>
                </div>
                <Button onClick={() => setEditItem({ name: "", unit: "kg", stock: 0, min_stock: 0, cost_per_unit: 0 })} className="bg-linear-to-r from-gold to-gold-soft text-primary-foreground font-bold">
                    <Plus className="size-4 mr-1" /> Nuevo Insumo
                </Button>
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
                                        <td className="p-4 font-bold">{item.stock}</td>
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
                                        <td className="p-4 text-right flex justify-end gap-2">
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
        </div>
    );
}

function InventoryDialog({ item, onClose, onDone }: { item: Partial<InventoryItem> | null; onClose: () => void; onDone: () => void }) {
    const [form, setForm] = useState<Partial<InventoryItem>>(item || {});
    const [busy, setBusy] = useState(false);

    // Update form when item changes
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
                            <Input type="number" value={form.cost_per_unit || ""} onChange={(e) => setForm({ ...form, cost_per_unit: Number(e.target.value) })} placeholder="0.00" />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Stock Actual</Label>
                            <Input type="number" value={form.stock || ""} onChange={(e) => setForm({ ...form, stock: Number(e.target.value) })} placeholder="0.00" />
                        </div>
                        <div className="space-y-2">
                            <Label>Mínimo alerta</Label>
                            <Input type="number" value={form.min_stock || ""} onChange={(e) => setForm({ ...form, min_stock: Number(e.target.value) })} placeholder="0.00" />
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
