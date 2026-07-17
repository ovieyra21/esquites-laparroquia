// src/lib/expenses.functions.ts
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { localApi } from "./api/api-client";

export type Expense = {
  id: string;
  amount: number;
  category: string;
  description: string | null;
  supplier: string | null;
  expense_date: string;
  payment_method: string;
  photo_url: string | null;
  created_at: string;
  user_id: string;
  status: string;
  paid_to: string | null;
  payment_period: string | null;
};

const createExpenseInput = z.object({
  amount: z.number().positive(),
  description: z.string().max(500).optional(),
  category: z.string().default("insumos"),
  supplier: z.string().max(200).optional(),
  expenseDate: z.string(),
  paymentMethod: z.string().max(50).default("efectivo"),
  photoUrl: z.string().max(1000).optional().nullable(),
  status: z.enum(["pagado", "pendiente"]).default("pagado"),
  paidTo: z.string().max(200).optional().nullable(),
  paymentPeriod: z.string().max(50).optional().nullable(),
});

export const createExpense = createServerFn({ method: "POST" })
  .validator((d: unknown) => createExpenseInput.parse(d))
  .handler(async ({ data }) => {
    return localApi.post('/api/expenses', {
      amount: data.amount,
      description: data.description || null,
      category: data.category,
      supplier: data.supplier || null,
      expense_date: data.expenseDate,
      payment_method: data.paymentMethod,
      photo_url: data.photoUrl || null,
      status: data.status,
      paid_to: data.paidTo || null,
      payment_period: data.paymentPeriod || null,
    });
  });

const listExpensesInput = z.object({
  dateFrom: z.string().optional().nullable(),
  dateTo: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
  status: z.string().optional().nullable(),
  page: z.number().min(1).default(1),
  pageSize: z.number().min(5).max(100).default(20),
});

export const listExpenses = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => listExpensesInput.parse(d))
  .handler(async ({ data }) => {
    const params = new URLSearchParams();
    if (data.page) params.set('page', String(data.page));
    if (data.pageSize) params.set('limit', String(data.pageSize));
    if (data.dateFrom) params.set('dateFrom', data.dateFrom);
    if (data.dateTo) params.set('dateTo', data.dateTo);
    if (data.category) params.set('category', data.category);
    if (data.status) params.set('status', data.status);

    return localApi.get(`/api/expenses?${params.toString()}`);
  });

const deleteExpenseInput = z.object({ id: z.string() });

export const deleteExpense = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => deleteExpenseInput.parse(d))
  .handler(async ({ data }) => {
    return localApi.delete(`/api/expenses/${data.id}`);
  });

const summaryInput = z.object({ 
  dateFrom: z.string().optional().nullable(), 
  dateTo: z.string().optional().nullable() 
});

export const getExpenseSummary = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => summaryInput.parse(d))
  .handler(async ({ data }) => {
    const params = new URLSearchParams();
    if (data.dateFrom) params.set('dateFrom', data.dateFrom);
    if (data.dateTo) params.set('dateTo', data.dateTo);
    return localApi.get(`/api/expenses/summary?${params.toString()}`);
  });

export const payExpense = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id: z.string() }).parse(d))
  .handler(async ({ data }) => {
    return localApi.post(`/api/expenses/${data.id}/pay`);
  });