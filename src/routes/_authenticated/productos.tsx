
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Package, Search, Plus, Trash2, Pencil, BookOpen, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { fmt } from "@/store/cart";
import { RecipeDialog } from "@/components/RecipeDialog";

export const Route = createFileRoute("/_authenticated/productos")({
  head: () => ({ meta: [{ title: "Productos · Esquites La Parroquia" }] }),
  component: ProductosPage,
});

function ProductosPage() {
  const [search, setSearch] = useState("");
  const [recipeProductId, setRecipeProductId] = useState<string | null>(null);
  const [recipeProductName, setRecipeProductName] = useState<string | null>(null);

  const { data: products, isLoading } = useQuery({
    queryKey: ["products-catalog"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select(`
          *,
          categories (name)
        `)
        .order("name", { ascending: true });
      if (error) throw error;
      return data;
    }
  });

  const filtered = products?.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.categories as any)?.name?.toLowerCase().includes(search.toLowerCase())
  );

  if (isLoading) {
    return <div className="p-10 flex items-center gap-3 text-muted-foreground"><Loader2 className="size-5 animate-spin" /> Cargando catálogo...</div>;
  }

  return (
    <div className="p-4 lg:p-6 max-w-6xl mx-auto">
      <header className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="font-display text-3xl">Productos</h1>
          <p className="text-sm text-muted-foreground">Administra el catálogo de venta y sus recetas.</p>
        </div>
        <Button className="bg-linear-to-r from-gold to-gold-soft text-primary-foreground font-bold">
          <Plus className="size-4 mr-1" /> Nuevo Producto
        </Button>
      </header>

      <div className="flex gap-2 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar producto o categoría..."
            className="pl-10"
          />
        </div>
      </div>

      <div className="bg-card gold-border rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-surface-2 text-left">
            <tr>
              <th className="p-4">Producto</th>
              <th className="p-4">Categoría</th>
              <th className="p-4">Precio</th>
              <th className="p-4">Estado</th>
              <th className="p-4 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {!filtered?.length ? (
              <tr>
                <td colSpan={5} className="p-10 text-center text-muted-foreground">No se encontraron productos.</td>
              </tr>
            ) : (
              filtered.map((item) => (
                <tr key={item.id} className="border-t border-border hover:bg-sidebar-accent/50 transition-colors">
                  <td className="p-4 font-medium">{item.name}</td>
                  <td className="p-4 text-muted-foreground">{(item.categories as any)?.name || "Sin categoría"}</td>
                  <td className="p-4 font-bold">{fmt(item.price)}</td>
                  <td className="p-4">
                    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${item.active ? "bg-success/20 text-success" : "bg-muted text-muted-foreground"}`}>
                      {item.active ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td className="p-4 text-right flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-gold/50 text-gold hover:bg-gold/10"
                      onClick={() => {
                        setRecipeProductId(item.id);
                        setRecipeProductName(item.name);
                      }}
                    >
                      <BookOpen className="size-4 mr-1" /> Receta
                    </Button>
                    <Button variant="ghost" size="icon">
                      <Pencil className="size-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="hover:text-destructive">
                      <Trash2 className="size-4" />
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <RecipeDialog
        productId={recipeProductId}
        productName={recipeProductName}
        onClose={() => {
          setRecipeProductId(null);
          setRecipeProductName(null);
        }}
      />
    </div>
  );
}
