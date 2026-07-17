// src/lib/products.functions.ts
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { localApi } from "./api/api-client";

// ─── Types ──────────────────────────────────────────────────

export interface Product {
  id: string;
  name: string;
  price: number;
  category_id: string | null;
  active: boolean;
  description?: string | null;
  image_url?: string | null;
  emoji?: string | null;
  display_order?: number;
  categories?: { name: string; icon: string | null } | null;
}

export interface Category {
  id: string;
  name: string;
  icon: string | null;
}

// ─── Server Functions ──────────────────────────────────────

export const listCategories = createServerFn({ method: "GET" })
  .handler(async () => {
    return localApi.get<Category[]>('/api/categories');
  });

export const listProducts = createServerFn({ method: "GET" })
  .handler(async () => {
    return localApi.get<Product[]>('/api/products');
  });

const productInput = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().max(1000).optional().nullable(),
  price: z.number().min(0).max(1_000_000),
  category_id: z.string().nullable(),
  active: z.boolean().default(true),
  image_url: z.string().trim().max(500).optional().nullable(),
  display_order: z.number().int().min(0).max(9999).default(0),
});

export const upsertProduct = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => productInput.parse(d))
  .handler(async ({ data }) => {
    if (data.id) {
      return localApi.put(`/api/products/${data.id}`, data);
    }
    return localApi.post('/api/products', data);
  });

const toggleInput = z.object({ id: z.string(), active: z.boolean() });

export const toggleProductActive = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => toggleInput.parse(d))
  .handler(async ({ data }) => {
    return localApi.put(`/api/products/${data.id}`, { active: data.active });
  });

const idOnlyInput = z.object({ id: z.string() });

export const deleteProduct = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => idOnlyInput.parse(d))
  .handler(async ({ data }) => {
    return localApi.delete(`/api/products/${data.id}`);
  });

const categoryInput = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1).max(100),
  icon: z.string().trim().max(100).optional().nullable(),
});

export const upsertCategory = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => categoryInput.parse(d))
  .handler(async ({ data }) => {
    if (data.id) {
      return localApi.put(`/api/categories/${data.id}`, data);
    }
    return localApi.post('/api/categories', data);
  });

export const deleteCategory = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => idOnlyInput.parse(d))
  .handler(async ({ data }) => {
    return localApi.delete(`/api/categories/${data.id}`);
  });