import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Plus, Pencil, Trash2, Tag, Package, Loader2, Search, CookingPot } from "lucide-react";
import { RecipeDialog } from "@/components/RecipeDialog";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  listProducts, upsertProduct, toggleProductActive, deleteProduct,
  listCategories, upsertCategory, deleteCategory,
} from "@/lib/products.functions";

export const Route = createFileRoute("/_authenticated/productos")({
  component: ProductsPage,
});

type Category = { id: string; name: string; icon: string | null };
type Product = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  active: boolean | null;
  image_url: string | null;
  display_order: number | null;
  category_id: string | null;
  categories?: { name: string; icon: string | null } | null;
};

const emptyProduct = {
  id: undefined as string | undefined,
  name: "",
  description: "",
  price: 0,
  category_id: null as string | null,
  active: true,
  image_url: "",
  display_order: 0,
};

function ProductsPage() {
  const [mounted, setMounted] = useState(false);
  const fnListProducts = useServerFn(listProducts);
  const fnListCategories = useServerFn(listCategories);
  const fnUpsertProduct = useServerFn(upsertProduct);
  const fnToggleActive = useServerFn(toggleProductActive);
  const fnDeleteProduct = useServerFn(deleteProduct);
  const fnUpsertCategory = useServerFn(upsertCategory);
  const fnDeleteCategory = useServerFn(deleteCategory);

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [filterCat, setFilterCat] = useState<string>("all");

  const [editing, setEditing] = useState<typeof emptyProduct | null>(null);
  const [catDialog, setCatDialog] = useState<{ id?: string; name: string; icon: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [recipeForProduct, setRecipeForProduct] = useState<{ id: string; name: string } | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [p, c] = await Promise.all([fnListProducts(), fnListCategories()]);
      setProducts(p as Product[]);
      setCategories(c as Category[]);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);
  useEffect(() => { setMounted(true); }, []);

  const filtered = products.filter((p) => {
    if (filterCat !== "all" && p.category_id !== filterCat) return false;
    if (query && !p.name.toLowerCase().includes(query.toLowerCase())) return false;
    return true;
  });

  const onSaveProduct = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      await fnUpsertProduct({
        data: {
          id: editing.id,
          name: editing.name.trim(),
          description: editing.description?.trim() || null,
          price: Number(editing.price),
          category_id: editing.category_id,
          active: editing.active,
          image_url: editing.image_url?.trim() || null,
          display_order: Number(editing.display_order) || 0,
        },
      });
      toast.success(editing.id ? "Producto actualizado" : "Producto creado");
      setEditing(null);
      load();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const onSaveCategory = async () => {
    if (!catDialog) return;
    setSaving(true);
    try {
      await fnUpsertCategory({
        data: { id: catDialog.id, name: catDialog.name.trim(), icon: catDialog.icon?.trim() || null },
      });
      toast.success(catDialog.id ? "Categoría actualizada" : "Categoría creada");
      setCatDialog(null);
      load();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const onToggle = async (p: Product) => {
    try {
      await fnToggleActive({ data: { id: p.id, active: !p.active } });
      load();
    } catch (e: any) { toast.error(e.message); }
  };

  const onDeleteProduct = async (p: Product) => {
    if (!confirm(`¿Eliminar "${p.name}"?`)) return;
    try {
      await fnDeleteProduct({ data: { id: p.id } });
      toast.success("Producto eliminado");
      load();
    } catch (e: any) { toast.error(e.message); }
  };

  const onDeleteCategory = async (c: Category) => {
    if (!confirm(`¿Eliminar la categoría "${c.name}"?`)) return;
    try {
      await fnDeleteCategory({ data: { id: c.id } });
      toast.success("Categoría eliminada");
      load();
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      <header>
        <h1 className="font-display text-3xl gold-text">Catálogo</h1>
        <p className="text-muted-foreground text-sm">Administra productos y categorías del POS.</p>
      </header>

      <Tabs defaultValue="products" className="space-y-4">
        <TabsList>
          <TabsTrigger value="products"><Package className="size-4 mr-2" /> Productos</TabsTrigger>
          <TabsTrigger value="categories"><Tag className="size-4 mr-2" /> Categorías</TabsTrigger>
        </TabsList>

        <TabsContent value="products" className="space-y-4">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar producto..." className="pl-9" />
            </div>
            <Select value={filterCat} onValueChange={setFilterCat}>
              <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las categorías</SelectItem>
                {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.icon} {c.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button onClick={() => setEditing({ ...emptyProduct })} className="gap-2">
              <Plus className="size-4" /> Nuevo producto
            </Button>
          </div>

          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>
          ) : filtered.length === 0 ? (
            <Card className="p-12 text-center text-muted-foreground">Sin productos.</Card>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((p) => (
                <Card key={p.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="font-display text-lg leading-tight truncate">{p.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {p.categories?.icon} {p.categories?.name ?? "Sin categoría"}
                      </div>
                    </div>
                    <Badge variant={p.active ? "default" : "secondary"} className={p.active ? "bg-gold/20 text-gold border-gold/40" : ""}>
                      {p.active ? "Activo" : "Inactivo"}
                    </Badge>
                  </div>
                  {p.description && <p className="text-sm text-muted-foreground line-clamp-2">{p.description}</p>}
                  <div className="font-display text-2xl gold-text">${Number(p.price).toFixed(2)}</div>
                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-border">
                        <div className="flex items-center gap-2">
                            <Switch checked={!!p.active} onCheckedChange={() => onToggle(p)} />
                            <span className="text-xs text-muted-foreground">Visible</span>
                        </div>
                        <div className="flex gap-1">
                            <Button size="icon" variant="ghost" title="Receta (insumos)" onClick={() => setRecipeForProduct({ id: p.id, name: p.name })}>
                                <CookingPot className="size-4 text-gold" />
                            </Button>
                            <Button size="icon" variant="ghost" onClick={() => setEditing({
                        id: p.id,
                        name: p.name,
                        description: p.description ?? "",
                        price: Number(p.price),
                        category_id: p.category_id,
                        active: !!p.active,
                        image_url: p.image_url ?? "",
                        display_order: p.display_order ?? 0,
                      })}>
                        <Pencil className="size-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => onDeleteProduct(p)}>
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="categories" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setCatDialog({ name: "", icon: "" })} className="gap-2">
              <Plus className="size-4" /> Nueva categoría
            </Button>
          </div>
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>
          ) : (
            <Card className="divide-y divide-border">
              {categories.length === 0 && <div className="p-8 text-center text-muted-foreground text-sm">Aún no hay categorías.</div>}
              {categories.map((c) => (
                <div key={c.id} className="flex items-center gap-3 p-4">
                  <div className="text-2xl w-10 text-center">{c.icon ?? "🏷️"}</div>
                  <div className="flex-1 font-medium">{c.name}</div>
                  <Button size="icon" variant="ghost" onClick={() => setCatDialog({ id: c.id, name: c.name, icon: c.icon ?? "" })}>
                    <Pencil className="size-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => onDeleteCategory(c)}>
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Product dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing?.id ? "Editar producto" : "Nuevo producto"}</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div>
                <Label>Nombre</Label>
                <Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} maxLength={200} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Precio (MXN)</Label>
                  <Input type="number" step="0.50" min="0" value={editing.price}
                    onChange={(e) => setEditing({ ...editing, price: Number(e.target.value) })} />
                </div>
                <div>
                  <Label>Orden</Label>
                  <Input type="number" min="0" value={editing.display_order}
                    onChange={(e) => setEditing({ ...editing, display_order: Number(e.target.value) })} />
                </div>
              </div>
              <div>
                <Label>Categoría</Label>
                <Select
                  value={editing.category_id ?? "none"}
                  onValueChange={(v) => setEditing({ ...editing, category_id: v === "none" ? null : v })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin categoría</SelectItem>
                    {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.icon} {c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Descripción</Label>
                <Textarea value={editing.description ?? ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                  maxLength={1000} rows={2} />
              </div>
              <div>
                <Label>URL de imagen (opcional)</Label>
                <Input value={editing.image_url ?? ""} onChange={(e) => setEditing({ ...editing, image_url: e.target.value })}
                  placeholder="https://..." maxLength={500} />
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={editing.active} onCheckedChange={(v) => setEditing({ ...editing, active: v })} />
                <Label>Visible en el POS</Label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button onClick={onSaveProduct} disabled={saving || !editing?.name.trim()}>
              {saving && <Loader2 className="size-4 mr-2 animate-spin" />} Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Category dialog */}
      <Dialog open={!!catDialog} onOpenChange={(o) => !o && setCatDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{catDialog?.id ? "Editar categoría" : "Nueva categoría"}</DialogTitle></DialogHeader>
          {catDialog && (
            <div className="space-y-3">
              <div>
                <Label>Nombre</Label>
                <Input value={catDialog.name} onChange={(e) => setCatDialog({ ...catDialog, name: e.target.value })} maxLength={100} />
              </div>
              <div>
                <Label>Ícono (emoji)</Label>
                <Input value={catDialog.icon} onChange={(e) => setCatDialog({ ...catDialog, icon: e.target.value })}
                  placeholder="🌽" maxLength={4} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCatDialog(null)}>Cancelar</Button>
            <Button onClick={onSaveCategory} disabled={saving || !catDialog?.name.trim()}>
              {saving && <Loader2 className="size-4 mr-2 animate-spin" />} Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <RecipeDialog
        productId={recipeForProduct?.id ?? null}
        productName={recipeForProduct?.name ?? null}
        onClose={() => setRecipeForProduct(null)}
      />
    </div>
  );
}
