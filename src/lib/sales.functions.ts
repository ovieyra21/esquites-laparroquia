
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const saveSaleInput = z.object({
  folio: z.string(),
  subtotal: z.number(),
  tax: z.number(),
  total: z.number(),
  paymentMethod: z.string(),
  cashReceived: z.number().optional(),
  changeAmount: z.number().optional(),
  customerId: z.string().uuid().optional(),
  items: z.array(z.object({
    productId: z.string().uuid(),
    productName: z.string(),
    quantity: z.number(),
    unitPrice: z.number(),
    modifiers: z.array(z.object({
      modifierId: z.string().uuid(),
      modifierName: z.string(),
      extraPrice: z.number()
    }))
  }))
});

export const saveSale = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: any) => saveSaleInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // 1. Get current register
    const { data: reg } = await supabase
      .from("cash_register")
      .select("id")
      .eq("user_id", userId)
      .eq("status", "abierta")
      .maybeSingle();

    if (!reg) throw new Error("Abre la caja primero antes de vender.");

    // 2. Insert Sale
    const { data: sale, error: saleError } = await supabase
      .from("sales")
      .insert({
        folio: data.folio, // Use string folio to support terminal prefixes
        user_id: userId,
        cash_register_id: reg.id,
        subtotal: data.subtotal,
        tax: data.tax,
        total: data.total,
        payment_method: data.paymentMethod,
        cash_received: data.cashReceived,
        change_amount: data.changeAmount,
        customer_id: data.customerId,
        status: "completada"
      })
      .select()
      .single();

    if (saleError) throw new Error(saleError.message);

    // --- LOYALTY POINTS LOGIC ---
    if (data.customerId) {
      const points = Math.floor(data.total / 10);
      if (points > 0) {
        const { data: cust } = await (supabase as any)
          .from("customers")
          .select("loyalty_points")
          .eq("id", data.customerId)
          .single();

        await (supabase as any)
          .from("customers")
          .update({ loyalty_points: (cust?.loyalty_points || 0) + points })
          .eq("id", data.customerId);
      }
    }
    // ----------------------------

    // 3. Insert Items and Modifiers
    for (const item of data.items) {
      // --- STOCK DEDUCTION & COST CALCULATION ---
      let totalItemCost = 0;
      try {
        const { data: recipes } = await (supabase as any)
          .from("product_recipes")
          .select("inventory_item_id, quantity, inventory_items(cost_per_unit)")
          .eq("product_id", item.productId);

        if (recipes && recipes.length > 0) {
          for (const recipe of recipes) {
            const ingredientQuantity = Number(recipe.quantity);
            const ingredientCost = Number((recipe as any).inventory_items?.cost_per_unit || 0);
            totalItemCost += ingredientQuantity * ingredientCost;

            const deduction = item.quantity * ingredientQuantity;

            // Atomic update would be better via RPC, but following simple pattern for now
            const { data: invItem } = await (supabase as any)
              .from("inventory_items")
              .select("stock")
              .eq("id", recipe.inventory_item_id)
              .single();

            if (invItem) {
              await (supabase as any)
                .from("inventory_items")
                .update({ stock: Number(invItem.stock) - deduction })
                .eq("id", recipe.inventory_item_id);
            }
          }
        }
      } catch (stockError) {
        console.error("Error deducting stock/cost:", stockError);
      }

      const { data: saleItem, error: itemError } = await supabase
        .from("sale_items")
        .insert({
          sale_id: sale.id,
          product_id: item.productId,
          product_name: item.productName,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          total: item.quantity * item.unitPrice,
          unit_cost: totalItemCost
        })
        .select()
        .single();

      if (itemError) throw new Error(itemError.message);

      if (item.modifiers.length > 0) {
        const mods = item.modifiers.map(m => ({
          sale_item_id: saleItem.id,
          modifier_id: m.modifierId,
          modifier_name: m.modifierName,
          extra_price: m.extraPrice
        }));
        const { error: modsError } = await supabase.from("sale_item_modifiers").insert(mods);
        if (modsError) throw new Error(modsError.message);
      }
    }

    // 4. Return sale details for auto-print check
    const { data: settings } = await supabase.from("settings").select("auto_print").limit(1).maybeSingle();

    return {
      saleId: sale.id,
      autoPrint: !!settings?.auto_print
    };
  });

export const updateKdsStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: any) => z.object({ saleId: z.string().uuid(), status: z.string() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await (supabase as any)
      .from("sales")
      .update({ kds_status: data.status })
      .eq("id", data.saleId);
    if (error) throw error;
    return { success: true };
  });
