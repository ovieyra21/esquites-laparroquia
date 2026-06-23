import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// ─── Input Schemas ───

const createExpenseInput = z.object({
  amount: z.number().positive(),
  description: z.string().max(500).optional(),
  category: z.string().default("insumos"),
  supplier: z.string().max(200).optional(),
  expenseDate: z.string(),
  paymentMethod: z.string().max(50).default("efectivo"),
  photoUrl: z.string().max(1000).optional().nullable(),
  ocrText: z.string().max(2000).optional().nullable(),
});

const listExpensesInput = z.object({
  dateFrom: z.string().optional().nullable(),
  dateTo: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
  page: z.number().min(1).default(1),
  pageSize: z.number().min(5).max(100).default(20),
});

const deleteExpenseInput = z.object({ id: z.string().uuid() });

// ─── Types ───

export type Expense = {
  id: string;
  amount: number;
  description: string | null;
  category: string;
  supplier: string | null;
  expense_date: string;
  payment_method: string;
  photo_url: string | null;
  ocr_text: string | null;
  created_at: string;
  user_id: string;
};

export type ExpenseSummary = {
  total: number;
  count: number;
  byCategory: { category: string; total: number; count: number }[];
  byMonth: { month: string; total: number }[];
};

// ─── Server Functions ───

export const createExpense = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("expenses").insert({
      user_id: userId,
      amount: data.amount,
      description: data.description || null,
      category: data.category,
      supplier: data.supplier || null,
      expense_date: data.expenseDate,
      payment_method: data.paymentMethod,
      photo_url: data.photoUrl || null,
      ocr_text: data.ocrText || null,
    } as any);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listExpenses = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { dateFrom, dateTo, category, page, pageSize } = data;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from("expenses")
      .select("*", { count: "exact" })
      .order("expense_date", { ascending: false })
      .range(from, to);

    if (dateFrom) query = query.gte("expense_date", dateFrom);
    if (dateTo) query = query.lte("expense_date", dateTo);
    if (category) query = query.eq("category", category);

    const { data: expenses, count, error } = await query;
    if (error) throw new Error(error.message);

    return { expenses: (expenses ?? []) as Expense[], total: count ?? 0, page, pageSize };
  });

export const deleteExpense = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase.from("expenses").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getExpenseSummary = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { dateFrom, dateTo } = data;

    let query = supabase.from("expenses").select("amount, category, expense_date");
    if (dateFrom) query = query.gte("expense_date", dateFrom);
    if (dateTo) query = query.lte("expense_date", dateTo);

    const { data: expenses, error } = await query;
    if (error) throw new Error(error.message);

    const all = expenses ?? [];
    const total = all.reduce((s, e) => s + Number((e as any).amount), 0);

    // By category
    const catMap: Record<string, { total: number; count: number }> = {};
    for (const e of all) {
      const cat = (e as any).category || "otros";
      if (!catMap[cat]) catMap[cat] = { total: 0, count: 0 };
      catMap[cat].total += Number((e as any).amount);
      catMap[cat].count += 1;
    }

    // By month
    const monthMap: Record<string, number> = {};
    for (const e of all) {
      const m = ((e as any).expense_date as string).slice(0, 7);
      monthMap[m] = (monthMap[m] || 0) + Number((e as any).amount);
    }

    return {
      total,
      count: all.length,
      byCategory: Object.entries(catMap)
        .map(([category, val]) => ({ category, ...val }))
        .sort((a, b) => b.total - a.total),
      byMonth: Object.entries(monthMap)
        .map(([month, total]) => ({ month, total }))
        .sort((a, b) => a.month.localeCompare(b.month)),
    } as ExpenseSummary;
  });
