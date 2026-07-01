import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// ─── Input Schemas ───

const historyInput = z.object({
  page: z.number().min(1).default(1),
  pageSize: z.number().min(5).max(100).default(20),
  dateFrom: z.string().optional().nullable(),
  dateTo: z.string().optional().nullable(),
  paymentMethod: z.string().optional().nullable(),
  status: z.string().optional().nullable(),
  search: z.string().optional().nullable(),
  sortBy: z.enum(["created_at", "total", "folio"]).default("created_at"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

const summaryInput = z.object({
  dateFrom: z.string().optional().nullable(),
  dateTo: z.string().optional().nullable(),
});

const cancelInput = z.object({
  saleId: z.string().uuid(),
});

const detailInput = z.object({
  saleId: z.string().uuid(),
});

// ─── Types ───

export type SaleHistoryRow = {
  id: string;
  folio: number;
  created_at: string;
  total: number;
  payment_method: string;
  cancelled: boolean;
  user_id: string;
  customer_id: string | null;
  cashier_name: string;
  customer_name: string | null;
  subtotal: number;
  tax: number;
  cash_received: number | null;
  change_amount: number | null;
};

export type SaleDetail = {
  id: string;
  folio: string;

  created_at: string;
  total: number;
  subtotal: number;
  tax: number;
  payment_method: string;
  cash_received: number | null;
  change_amount: number | null;
  cancelled: boolean;
  cancelled_at: string | null;
  cancelled_by: string | null;
  cashier_name: string;
  customer_name: string | null;
  customer_phone: string | null;
  items: {
    product_name: string;
    quantity: number;
    unit_price: number;
    total: number;
    modifiers: string[];
  }[];
};

export type SalesSummary = {
  totalSales: number;
  saleCount: number;
  avgTicket: number;
  cancelledCount: number;
  paymentBreakdown: { method: string; total: number; count: number }[];
  dailyTotals: { date: string; total: number; count: number }[];
};

// ─── Server Functions ───

export const getSalesHistory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => historyInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { page, pageSize, dateFrom, dateTo, paymentMethod, status, search, sortBy, sortOrder } =
      data;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from("sales")
      .select(
        "id, folio, created_at, subtotal, tax, total, payment_method, cancelled, user_id, customer_id, cash_received, change_amount",
        { count: "exact" },
      )
      .order(sortBy, { ascending: sortOrder === "asc" })
      .range(from, to);

    if (dateFrom) query = query.gte("created_at", dateFrom);
    if (dateTo) {
      // Include full end day
      const endOfDay = new Date(dateTo);
      endOfDay.setHours(23, 59, 59, 999);
      query = query.lte("created_at", endOfDay.toISOString());
    }
    if (paymentMethod) query = query.eq("payment_method", paymentMethod);
    if (status === "cancelled") query = query.eq("cancelled", true);
    else if (status === "active") query = query.eq("cancelled", false);

    const { data: sales, count, error } = await query;
    if (error) throw new Error(error.message);

    // Fetch profiles & customers in batch
    const userIds = [...new Set((sales ?? []).map((s: any) => s.user_id).filter(Boolean))];
    const customerIds = [
      ...new Set((sales ?? []).map((s: any) => s.customer_id).filter(Boolean)),
    ];

    const [profilesRes, customersRes] = await Promise.all([
      userIds.length > 0
        ? supabase.from("profiles").select("id, full_name").in("id", userIds)
        : { data: [] },
      customerIds.length > 0
        ? supabase.from("customers").select("id, name").in("id", customerIds)
        : { data: [] },
    ]);

    const profileMap = new Map(
      (profilesRes.data ?? []).map((p: any) => [p.id, p.full_name ?? "Cajero"]),
    );
    const customerMap = new Map(
      (customersRes.data ?? []).map((c: any) => [c.id, c.name]),
    );

    // Apply search filter client-side (since it spans multiple tables)
    let filtered = (sales ?? []).map((s: any) => ({
      ...s,
      cashier_name: profileMap.get(s.user_id) ?? "Cajero",
      customer_name: customerMap.get(s.customer_id) ?? null,
    }));

    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (s: any) =>
          String(s.folio).includes(q) ||
          s.cashier_name.toLowerCase().includes(q) ||
          (s.customer_name && s.customer_name.toLowerCase().includes(q)),
      );
    }

    return {
      sales: filtered as SaleHistoryRow[],
      total: count ?? 0,
      page,
      pageSize,
    };
  });

export const getSaleDetail = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => detailInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;

    const { data: sale, error } = await supabase
      .from("sales")
      .select("*, sale_items(*, sale_item_modifiers(*))")
      .eq("id", data.saleId)
      .single();

    if (error || !sale) throw new Error("Venta no encontrada.");

    const [profileRes, customerRes] = await Promise.all([
      sale.user_id
        ? supabase.from("profiles").select("full_name").eq("id", sale.user_id).maybeSingle()
        : { data: null },
      sale.customer_id
        ? supabase.from("customers").select("name, phone").eq("id", sale.customer_id).maybeSingle()
        : { data: null },
    ]);

    return {
      id: sale.id,
      folio: sale.folio,
      created_at: sale.created_at,
      total: Number(sale.total),
      subtotal: Number(sale.subtotal ?? 0),
      tax: Number(sale.tax ?? 0),
      payment_method: sale.payment_method ?? "efectivo",
      cash_received: sale.cash_received != null ? Number(sale.cash_received) : null,
      change_amount: sale.change_amount != null ? Number(sale.change_amount) : null,
      cancelled: sale.cancelled ?? false,
      cancelled_at: sale.cancelled_at,
      cancelled_by: sale.cancelled_by,
      cashier_name: profileRes.data?.full_name ?? "Cajero",
      customer_name: customerRes.data?.name ?? null,
      customer_phone: customerRes.data?.phone ?? null,
      items: (sale.sale_items ?? []).map((i: any) => ({
        product_name: i.product_name ?? "Producto",
        quantity: i.quantity ?? 1,
        unit_price: Number(i.unit_price ?? 0),
        total: Number(i.total ?? 0),
        modifiers: (i.sale_item_modifiers ?? []).map((m: any) => m.modifier_name).filter(Boolean),
      })),
    } as SaleDetail;
  });

export const getSalesSummary = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => summaryInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { dateFrom, dateTo } = data;

    let query = supabase
      .from("sales")
      .select("id, total, payment_method, cancelled, created_at");

    if (dateFrom) query = query.gte("created_at", dateFrom);
    if (dateTo) {
      const endOfDay = new Date(dateTo);
      endOfDay.setHours(23, 59, 59, 999);
      query = query.lte("created_at", endOfDay.toISOString());
    }

    const { data: sales, error } = await query;
    if (error) throw new Error(error.message);

    const activeSales = (sales ?? []).filter((s: any) => !s.cancelled);
    const cancelledSales = (sales ?? []).filter((s: any) => s.cancelled);

    // Payment breakdown
    const breakdown: Record<string, { total: number; count: number }> = {};
    for (const s of activeSales) {
      const method = s.payment_method || "efectivo";
      if (!breakdown[method]) breakdown[method] = { total: 0, count: 0 };
      breakdown[method].total += Number(s.total ?? 0);
      breakdown[method].count += 1;
    }

    // Daily totals
    const daily: Record<string, { total: number; count: number }> = {};
    for (const s of activeSales) {
      const day = (s.created_at as string).slice(0, 10);
      if (!daily[day]) daily[day] = { total: 0, count: 0 };
      daily[day].total += Number(s.total ?? 0);
      daily[day].count += 1;
    }

    const totalRevenue = activeSales.reduce((acc, s) => acc + Number(s.total ?? 0), 0);

    return {
      totalSales: totalRevenue,
      saleCount: activeSales.length,
      avgTicket: activeSales.length > 0 ? totalRevenue / activeSales.length : 0,
      cancelledCount: cancelledSales.length,
      paymentBreakdown: Object.entries(breakdown)
        .map(([method, val]) => ({ method, ...val }))
        .sort((a, b) => b.total - a.total),
      dailyTotals: Object.entries(daily)
        .map(([date, val]) => ({ date, ...val }))
        .sort((a, b) => a.date.localeCompare(b.date)),
    } as SalesSummary;
  });

export const cancelSaleFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => cancelInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: sale } = await supabase
      .from("sales")
      .select("cancelled, status")
      .eq("id", data.saleId)
      .single();

    if (!sale) throw new Error("Venta no encontrada.");
    if (sale.cancelled) throw new Error("La venta ya está cancelada.");

    const { error } = await supabase
      .from("sales")
      .update({ cancelled: true, cancelled_at: new Date().toISOString(), cancelled_by: userId })
      .eq("id", data.saleId);

    if (error) throw new Error(error.message);
    return { ok: true };
  });
