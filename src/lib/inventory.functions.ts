
import { supabase } from "@/integrations/supabase/client";

export interface InventoryItem {
    id: string;
    name: string;
    unit: string;
    stock: number;
    min_stock: number;
    cost_per_unit: number;
    created_at?: string;
}

export interface ProductRecipe {
    id: string;
    product_id: string;
    inventory_item_id: string;
    quantity: number;
}

export const inventoryApi = {
    async getItems() {
        const { data, error } = await supabase
            .from("inventory_items")
            .select("*")
            .order("name", { ascending: true });

        if (error) throw error;
        return data as InventoryItem[];
    },

    async upsertItem(item: Partial<InventoryItem>) {
        const { data, error } = await supabase
            .from("inventory_items")
            .upsert(item)
            .select()
            .single();

        if (error) throw error;
        return data as InventoryItem;
    },

    async deleteItem(id: string) {
        const { error } = await supabase
            .from("inventory_items")
            .delete()
            .eq("id", id);

        if (error) throw error;
    },

    async getRecipes(productId: string) {
        const { data, error } = await supabase
            .from("product_recipes")
            .select(`
        *,
        inventory_items (
          name,
          unit
        )
      `)
            .eq("product_id", productId);

        if (error) throw error;
        return data;
    },

    async saveRecipe(recipe: Partial<ProductRecipe>) {
        const { data, error } = await supabase
            .from("product_recipes")
            .upsert(recipe)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async deleteRecipe(id: string) {
        const { error } = await supabase
            .from("product_recipes")
            .delete()
            .eq("id", id);

        if (error) throw error;
    }
};
