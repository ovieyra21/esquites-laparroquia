import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const saleInput = z.object({
  items: z.array(z.object({
    productName: z.string().min(1).max(255),
    productEmoji: z.string().max(10).optional(),
    quantity: z.number().int().positive().max(999),
    unitPrice: z.number().min(0),
    modifiers: z.array(z.object({
      name: z.string().max(255),
      extraPrice: z.number().default(0),
    })).default([]),
  })).min(1),
  subtotal: z.number().min(0),
  tax: z.number().min(0),
  total: z.number().min(0),
  paymentMethod: z.enum(["efectivo", "tarjeta", "transferencia", "mixto"]),
  cashReceived: z.number().min(0).optional(),
  changeAmount: z.number().min(0).optional(),
});

export const createSale = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => saleInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: reg } = await supabase
      .from("cash_register")
      .select("id")
      .eq("user_id", userId)
      .eq("status", "abierta")
      .maybeSingle();
    if (!reg) throw new Error("Debes abrir la caja antes de cobrar.");

    const { data: sale, error: saleErr } = await supabase
      .from("sales")
      .insert({
        user_id: userId,
        cash_register_id: reg.id,
        subtotal: data.subtotal,
        tax: data.tax,
        total: data.total,
        payment_method: data.paymentMethod,
        cash_received: data.cashReceived ?? null,
        change_amount: data.changeAmount ?? null,
      })
      .select()
      .single();
    if (saleErr) throw new Error(saleErr.message);

    for (const it of data.items) {
      const total = it.unitPrice * it.quantity;
      const { data: item, error: itErr } = await supabase
        .from("sale_items")
        .insert({
          sale_id: sale.id,
          product_name: it.productName,
          product_emoji: it.productEmoji ?? null,
          quantity: it.quantity,
          unit_price: it.unitPrice,
          total,
        })
        .select()
        .single();
      if (itErr) throw new Error(itErr.message);

      if (it.modifiers.length) {
        await supabase.from("sale_item_modifiers").insert(
          it.modifiers.map((m) => ({
            sale_item_id: item.id,
            modifier_name: m.name,
            extra_price: m.extraPrice,
          })),
        );
      }
    }

    return { id: sale.id, folio: sale.folio };
  });

export const getRecentSales = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("sales")
      .select("*, sale_items(*, sale_item_modifiers(*))")
      .order("created_at", { ascending: false })
      .limit(50);
    return data ?? [];
  });

export const cancelSale = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ saleId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    const { data: isSup } = await supabase.rpc("has_role", { _user_id: userId, _role: "supervisor" });
    if (!isAdmin && !isSup) throw new Error("No tienes permisos para cancelar ventas.");
    const { error } = await supabase
      .from("sales")
      .update({ cancelled: true, cancelled_at: new Date().toISOString(), cancelled_by: userId })
      .eq("id", data.saleId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
