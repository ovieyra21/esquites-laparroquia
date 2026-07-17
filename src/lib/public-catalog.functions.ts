import { createServerFn } from "@tanstack/react-start";
import { localApi } from "./api/api-client";

export const getPublicCatalog = createServerFn({ method: "GET" }).handler(async () => {
  const [categories, products] = await Promise.all([
    localApi.get<any[]>('/api/categories').catch(() => []),
    localApi.get<any[]>('/api/products').catch(() => []),
  ]);
  return {
    categories: categories ?? [],
    products: (products ?? []).filter((p: any) => p.active !== false),
  };
});

export const getPublicSettings = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const data = await localApi.get<any>('/api/settings');
    return {
      business_name: data?.business_name || "Esquites La Parroquia",
      slogan: data?.slogan || "El sabor que se antoja",
      address: data?.address || null,
      phone: data?.phone || null,
      whatsapp_number: data?.whatsapp_number || null,
      footer_message: data?.footer_message || null,
    };
  } catch {
    return {
      business_name: "Esquites La Parroquia",
      slogan: "El sabor que se antoja",
      address: null,
      phone: null,
      whatsapp_number: null,
      footer_message: null,
    };
  }
});
