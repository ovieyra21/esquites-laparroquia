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
  .inputValidator((d: unknown) => openInput.parse(d))
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
  .inputValidator((d: unknown) => closeInput.parse(d))
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
  .inputValidator((d: unknown) => moveInput.parse(d))
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

const cutDetailInput = z.object({ registerId: z.string().uuid() });

export type CashCutDetail = {
  id: string;
  openedAt: string;
  closedAt: string | null;
  cashierName: string;
  openingAmount: number;
  openingBreakdown: Record<string, number> | null;
  closingBreakdown: Record<string, number> | null;
  salesCash: number;
  salesCard: number;
  salesTransfer: number;
  salesCount: number;
  cashIn: number;
  cashOut: number;
  expectedAmount: number;
  realAmount: number;
  difference: number;
  notes: string | null;
  salesByHour: { hour: string; total: number; count: number }[];
  topProducts: { name: string; quantity: number }[];
};

export const getCashCutDetail = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => cutDetailInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;

    const { data: reg, error } = await supabase
      .from("cash_register")
      .select("*")
      .eq("id", data.registerId)
      .single();

    if (error || !reg) throw new Error("Corte no encontrado.");

    // Get cashier name
    const { data: profile } = reg.user_id
      ? await supabase.from("profiles").select("full_name").eq("id", reg.user_id).maybeSingle()
      : { data: null as { full_name: string | null } | null };


    // Get sales for this register
    const { data: sales } = await supabase
      .from("sales")
      .select("id, total, created_at, payment_method, sale_items(product_name, quantity)")
      .eq("cash_register_id", data.registerId);

    const activeSales = (sales ?? []).filter((s: any) => s.status !== "cancelada");

    // Sales by hour
    const hourlyMap: Record<number, { total: number; count: number }> = {};
    for (const s of activeSales) {
      const hour = new Date(s.created_at!).getHours();
      if (!hourlyMap[hour]) hourlyMap[hour] = { total: 0, count: 0 };
      hourlyMap[hour].total += Number(s.total ?? 0);
      hourlyMap[hour].count += 1;
    }

    // Top products
    const productMap: Record<string, number> = {};
    for (const s of activeSales) {
      for (const item of (s as any).sale_items ?? []) {
        const name = item.product_name ?? "Producto";
        productMap[name] = (productMap[name] || 0) + (item.quantity ?? 0);
      }
    }

    // Parse breakdowns
    let openingBreakdown: Record<string, number> | null = null;
    let closingBreakdown: Record<string, number> | null = null;
    try { if (reg.opening_breakdown) openingBreakdown = reg.opening_breakdown as any; } catch {}
    try { if (reg.closing_breakdown) closingBreakdown = reg.closing_breakdown as any; } catch {}

    return {
      id: reg.id,
      openedAt: reg.opened_at,
      closedAt: reg.closed_at,
      cashierName: profile?.data?.full_name ?? "Cajero",
      openingAmount: Number(reg.opening_amount),
      openingBreakdown,
      closingBreakdown,
      salesCash: Number(reg.total_sales_cash ?? 0),
      salesCard: Number(reg.total_sales_card ?? 0),
      salesTransfer: Number(reg.total_sales_transfer ?? 0),
      salesCount: activeSales.length,
      cashIn: 0, // Would need cash_movements query — simplified
      cashOut: 0,
      expectedAmount: Number(reg.expected_amount ?? 0),
      realAmount: Number(reg.real_amount ?? 0),
      difference: Number(reg.difference ?? 0),
      notes: reg.notes,
      salesByHour: Object.entries(hourlyMap)
        .map(([h, v]) => ({ hour: `${h}:00`, ...v }))
        .sort((a, b) => parseInt(a.hour) - parseInt(b.hour)),
      topProducts: Object.entries(productMap)
        .map(([name, quantity]) => ({ name, quantity }))
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 5),
    } as CashCutDetail;
  });
