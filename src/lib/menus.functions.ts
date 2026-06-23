import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const SIGNED_URL_TTL = 60 * 60 * 24 * 7; // 7 days

async function assertAdmin(supabase: any, userId: string) {
  const { data } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (!data) throw new Error("Solo admin puede gestionar el menú.");
}

export const listMenus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: menus, error } = await supabaseAdmin
      .from("digital_menus")
      .select("*")
      .order("uploaded_at", { ascending: false });
    if (error) throw new Error(error.message);
    return menus ?? [];
  });

const uploadInput = z.object({
  filename: z.string().min(1).max(255),
  base64: z.string().min(1),
  contentType: z.string().max(100).default("application/pdf"),
});

export const uploadMenu = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const safeName = data.filename.replace(/[^a-zA-Z0-9._-]/g, "_");
    const key = `${Date.now()}_${safeName}`;
    const bytes = Uint8Array.from(atob(data.base64), (c) => c.charCodeAt(0));

    const { error: upErr } = await supabaseAdmin.storage
      .from("menus")
      .upload(key, bytes, { contentType: data.contentType, upsert: false });
    if (upErr) throw new Error(upErr.message);

    const { data: inserted, error: insErr } = await supabaseAdmin
      .from("digital_menus")
      .insert({ filename: data.filename, file_url: key, active: false })
      .select()
      .single();
    if (insErr) throw new Error(insErr.message);
    return inserted;
  });

export const setActiveMenu = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("digital_menus").update({ active: false }).neq("id", data.id);
    const { error } = await supabaseAdmin.from("digital_menus").update({ active: true }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteMenu = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: menu } = await supabaseAdmin.from("digital_menus").select("file_url").eq("id", data.id).maybeSingle();
    if (menu?.file_url) {
      await supabaseAdmin.storage.from("menus").remove([menu.file_url]);
    }
    const { error } = await supabaseAdmin.from("digital_menus").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getMenuSignedUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: menu } = await supabaseAdmin.from("digital_menus").select("file_url").eq("id", data.id).maybeSingle();
    if (!menu?.file_url) throw new Error("Menú no encontrado.");
    const { data: signed, error } = await supabaseAdmin.storage.from("menus").createSignedUrl(menu.file_url, SIGNED_URL_TTL);
    if (error) throw new Error(error.message);
    return { url: signed.signedUrl };
  });

// Public: resolve the active menu and return a signed URL (no auth required).
export const getPublicMenuUrl = createServerFn({ method: "GET" })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let menu;
    if (data.id) {
      const { data: row } = await supabaseAdmin
        .from("digital_menus")
        .select("id, filename, file_url, active")
        .eq("id", data.id)
        .eq("active", true)
        .maybeSingle();
      menu = row;
    } else {
      const { data: row } = await supabaseAdmin
        .from("digital_menus")
        .select("id, filename, file_url, active")
        .eq("active", true)
        .order("uploaded_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      menu = row;
    }
    if (!menu?.file_url) return { url: null, filename: null };
    const { data: signed, error } = await supabaseAdmin.storage.from("menus").createSignedUrl(menu.file_url, SIGNED_URL_TTL);
    if (error) throw new Error(error.message);
    return { url: signed.signedUrl, filename: menu.filename };
  });
