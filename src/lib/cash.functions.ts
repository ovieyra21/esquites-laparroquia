import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const openInput = z.object({
  openingAmount: z.number().min(0).max(1_000_000),
  breakdown: z.record(z.number()).optional(),
});
const closeInput = z.object({
  realAmount: z.number().min(0).max(1_000_000),
  notes: z.string().max(500).optional(),
  breakdown: z.record(z.number()).optional(),
});
const moveInput = z.object({
  type: z.enum(["entrada", "salida"]),
  amount: z.number().positive().max(1_000_000),
  concept: z.string().min(1).max(255),
  paymentMethod: z.string().max(50).optional().default("efectivo"),
});

export const openCashRegister = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => openInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: existing } = await supabase
      .from("cash_register")
      .select("id")
      .eq("user_id", userId)
      .eq("status", "abierta")
      .maybeSingle();
    if (existing) throw new Error("Ya tienes una caja abierta.");
    const { data: row, error } = await supabase
      .from("cash_register")
      .insert({
        user_id: userId,
        opening_amount: data.openingAmount,
        opening_breakdown: data.breakdown,
        status: "abierta"
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const closeCashRegister = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => closeInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: reg } = await supabase
      .from("cash_register")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "abierta")
      .maybeSingle();
    if (!reg) throw new Error("No hay caja abierta.");
    const { data: summary } = await supabase.rpc("get_cash_register_summary", { _register_id: reg.id });
    const s = summary as any;
    const expected = Number(s?.expected_cash ?? reg.opening_amount);
    const diff = Number(data.realAmount) - expected;
    const { error } = await supabase
      .from("cash_register")
      .update({
        status: "cerrada",
        closed_at: new Date().toISOString(),
        closing_amount: data.realAmount,
        real_amount: data.realAmount,
        expected_amount: expected,
        difference: diff,
        notes: data.notes ?? null,
        closing_breakdown: data.breakdown ?? null,
        total_sales_cash: s?.sales_cash ?? 0,
        total_sales_card: s?.sales_card ?? 0,
        total_sales_transfer: s?.sales_transfer ?? 0,
      })
      .eq("id", reg.id);
    if (error) throw new Error(error.message);
    return { id: reg.id, registerId: reg.id, difference: diff, expected };
  });

export const addCashMovement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => moveInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: reg } = await supabase
      .from("cash_register")
      .select("id")
      .eq("user_id", userId)
      .eq("status", "abierta")
      .maybeSingle();
    if (!reg) throw new Error("Abre la caja primero.");
    const { error } = await supabase.from("cash_movements").insert({
      type: data.type,
      amount: data.amount,
      concept: data.concept,
      payment_method: data.paymentMethod,
      user_id: userId,
      cash_register_id: reg.id,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getCurrentRegister = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: reg } = await supabase
      .from("cash_register")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "abierta")
      .maybeSingle();
    if (!reg) return { register: null, summary: null, movements: [] };
    const [{ data: summary }, { data: movements }] = await Promise.all([
      supabase.rpc("get_cash_register_summary", { _register_id: reg.id }),
      supabase.from("cash_movements").select("*").eq("cash_register_id", reg.id).order("created_at", { ascending: false }),
    ]);
    return { register: reg, summary, movements: movements ?? [] };
  });

export const getRegisterHistory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data, error } = await supabase
      .from("cash_register")
      .select("*")
      .eq("status", "cerrada")
      .order("closed_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return data ?? [];
  });
