import { createServerFn } from "@tanstack/react-start";
import { localApi } from "./api/api-client";
import type { Category } from "./catalog-types";

export const getCatalog = createServerFn({ method: "GET" })
  .handler(async () => {
    const categories = await localApi.get<any[]>('/api/categories');
    const products = await localApi.get<any[]>('/api/products');
    const modifierGroups = await localApi.get<any[]>('/api/modifier_groups').catch(() => []);
    const modifiers = await localApi.get<any[]>('/api/modifiers').catch(() => []);
    const productModifiers = await localApi.get<any[]>('/api/product_modifiers').catch(() => []);

    const transformed: Category[] = (categories || []).map((cat: any) => ({
      id: cat.id,
      name: cat.name,
      icon: cat.icon || "Package",
      products: (products || [])
        .filter((p: any) => p.active !== false && p.category_id === cat.id)
        .map((p: any) => ({
          id: p.id,
          name: p.name,
          price: Number(p.price),
          image: p.image_url,
          emoji: p.emoji,
          includes: p.includes,
          modifierGroups: (productModifiers || [])
            .filter((pm: any) => pm.product_id === p.id)
            .map((pm: any) => {
              const mg = (modifierGroups || []).find((g: any) => g.id === pm.modifier_group_id);
              if (!mg) return null;
              return {
                id: mg.id,
                name: mg.name,
                minSelections: mg.min_selection || 0,
                maxSelections: mg.max_selection || 0,
                modifiers: (modifiers || [])
                  .filter((m: any) => m.modifier_group_id === mg.id && m.active !== false)
                  .map((m: any) => ({
                    id: m.id,
                    name: m.name,
                    price: Number(m.extra_price || 0),
                  })),
              };
            })
            .filter(Boolean),
        })),
    }));
    return transformed;
  });

export const getPublicCatalog = createServerFn({ method: "GET" })
  .handler(async () => {
    const [categories, products, modifierGroups, modifiers, productModifiers] = await Promise.all([
      localApi.get<any[]>('/api/categories').catch(() => []),
      localApi.get<any[]>('/api/products').catch(() => []),
      localApi.get<any[]>('/api/modifier_groups').catch(() => []),
      localApi.get<any[]>('/api/modifiers').catch(() => []),
      localApi.get<any[]>('/api/product_modifiers').catch(() => []),
    ]);

    const transformed: Category[] = (categories || []).map((cat: any) => ({
      id: cat.id,
      name: cat.name,
      icon: cat.icon || "Package",
      products: (products || [])
        .filter((p: any) => p.active !== false && p.category_id === cat.id)
        .map((p: any) => ({
          id: p.id,
          name: p.name,
          price: Number(p.price),
          image: p.image_url,
          emoji: p.emoji,
          includes: p.includes,
          modifierGroups: (productModifiers || [])
            .filter((pm: any) => pm.product_id === p.id)
            .map((pm: any) => {
              const mg = (modifierGroups || []).find((g: any) => g.id === pm.modifier_group_id);
              if (!mg) return null;
              return {
                id: mg.id,
                name: mg.name,
                minSelections: mg.min_selection || 0,
                maxSelections: mg.max_selection || 0,
                modifiers: (modifiers || [])
                  .filter((m: any) => m.modifier_group_id === mg.id && m.active !== false)
                  .map((m: any) => ({
                    id: m.id,
                    name: m.name,
                    price: Number(m.extra_price || 0),
                  })),
              };
            })
            .filter(Boolean),
        })),
    })).filter((c: any) => c.products.length > 0);

    return transformed;
  });
