import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

function publicClient() {
  return createClient<Database>(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
}

export const getPublicCatalog = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = publicClient();
  const [{ data: categories }, { data: products }] = await Promise.all([
    supabase.from("categories").select("id, name, icon").order("name"),
    supabase
      .from("products")
      .select("id, name, description, price, emoji, includes, image_url, category_id, display_order, active")
      .eq("active", true)
      .order("display_order")
      .order("name"),
  ]);
  return { categories: categories ?? [], products: products ?? [] };
});

export const getPublicSettings = createServerFn({ method: "GET" }).handler(async () => {
  // settings table is admin-only; we surface only safe public fields via service role.
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("settings")
    .select("business_name, slogan, address, phone, whatsapp_number, footer_message")
    .limit(1)
    .maybeSingle();
  return data ?? {
    business_name: "Esquites La Parroquia",
    slogan: "El sabor que se antoja",
    address: null,
    phone: null,
    whatsapp_number: null,
    footer_message: null,
  };
});
