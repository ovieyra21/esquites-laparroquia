import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { localApi } from "./api/api-client";

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
  saleId: z.string(),
});

const detailInput = z.object({
  saleId: z.string(),
});

export type SaleHistoryRow = {
  id: string;
  folio: string;
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
  discount: number | null;
  discount_reason: string | null;
  is_courtesy: boolean | null;
  kitchen_notes: string | null;
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
  discount: number | null;
  discount_reason: string | null;
  is_courtesy: boolean | null;
  kitchen_notes: string | null;
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

export const getSalesHistory = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => historyInput.parse(d))
  .handler(async ({ data }) => {
    const params = new URLSearchParams();
    params.set('page', String(data.page));
    params.set('limit', String(data.pageSize));
    if (data.dateFrom) params.set('dateFrom', data.dateFrom);
    if (data.dateTo) params.set('dateTo', data.dateTo);
    if (data.paymentMethod) params.set('paymentMethod', data.paymentMethod);
    if (data.status) params.set('status', data.status);
    if (data.search) params.set('search', data.search);
    params.set('sortBy', data.sortBy);
    params.set('sortOrder', data.sortOrder);

    return localApi.get(`/api/sales/history?${params.toString()}`);
  });

export const getSaleDetail = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => detailInput.parse(d))
  .handler(async ({ data }) => {
    return localApi.get(`/api/sales/${data.saleId}`);
  });

export const getSalesSummary = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => summaryInput.parse(d))
  .handler(async ({ data }) => {
    const params = new URLSearchParams();
    if (data.dateFrom) params.set('dateFrom', data.dateFrom);
    if (data.dateTo) params.set('dateTo', data.dateTo);
    return localApi.get(`/api/sales/summary?${params.toString()}`);
  });

export const cancelSaleFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => cancelInput.parse(d))
  .handler(async ({ data }) => {
    return localApi.put(`/api/sales/${data.saleId}`, { cancelled: true, cancelled_at: new Date().toISOString() });
  });
