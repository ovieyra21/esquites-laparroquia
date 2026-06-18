import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Category } from "./catalog-types";

export const getCatalog = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;

    // Fetch categories with products and their modifiers
    const { data: categories, error } = await supabase
      .from("categories")
      .select(`
        id,
        name,
        icon,
        products (
          id,
          name,
          price,
          image_url,
          active,
          emoji,
          includes,
          product_modifiers (
            modifier_groups (
              id,
              name,
              min_selection,
              max_selection,
              modifiers (
                id,
                name,
                extra_price,
                active
              )
            )
          )
        )
      `)
      .order("name", { ascending: true });

    if (error) throw error;

    // Transform to match local Category type
    const transformed: Category[] = (categories || []).map((cat: any) => ({
      id: cat.id,
      name: cat.name,
      icon: cat.icon || "Package",
      products: (cat.products || [])
        .filter((p: any) => p.active)
        .map((p: any) => ({
          id: p.id,
          name: p.name,
          price: Number(p.price),
          image: p.image_url,
          emoji: p.emoji,
          includes: p.includes,
          modifierGroups: (p.product_modifiers || [])
            .map((pm: any) => pm.modifier_groups)
            .filter(Boolean)
            .map((mg: any) => ({
              id: mg.id,
              name: mg.name,
              minSelections: mg.min_selection,
              maxSelections: mg.max_selection,
              modifiers: (mg.modifiers || [])
                .filter((m: any) => m.active)
                .map((m: any) => ({
                  id: m.id,
                  name: m.name,
                  price: Number(m.extra_price),
                })),
            })),
        })),
    }));

    return transformed;
  });

export const getPublicCatalog = createServerFn({ method: "GET" })
  .handler(async () => {
    const { supabaseAdmin: supabase } = await import("@/integrations/supabase/client.server");
    // Public version (same logic but maybe fewer fields if needed, 
    // though RLS handles security)
    const { data: categories, error } = await supabase
      .from("categories")
      .select(`
        id,
        name,
        icon,
        products (
          id,
          name,
          price,
          image_url,
          active,
          emoji,
          includes,
          product_modifiers (
            modifier_groups (
              id,
              name,
              min_selection,
              max_selection,
              modifiers (
                id,
                name,
                extra_price,
                active
              )
            )
          )
        )
      `)
      .eq("products.active", true)
      .order("name", { ascending: true });

    if (error) throw error;

    const transformed: Category[] = (categories || []).map((cat: any) => ({
      id: cat.id,
      name: cat.name,
      icon: cat.icon || "Package",
      products: (cat.products || [])
        .map((p: any) => ({
          id: p.id,
          name: p.name,
          price: Number(p.price),
          image: p.image_url,
          emoji: p.emoji,
          includes: p.includes,
          modifierGroups: (p.product_modifiers || [])
            .map((pm: any) => pm.modifier_groups)
            .filter(Boolean)
            .map((mg: any) => ({
              id: mg.id,
              name: mg.name,
              minSelections: mg.min_selection,
              maxSelections: mg.max_selection,
              modifiers: (mg.modifiers || [])
                .filter((m: any) => m.active)
                .map((m: any) => ({
                  id: m.id,
                  name: m.name,
                  price: Number(m.extra_price),
                })),
            })),
        })),
    })).filter((c: any) => c.products.length > 0);

    return transformed;
  });
