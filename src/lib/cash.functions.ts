// src/lib/cash.functions.ts
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { localApi } from "./api/api-client";

// ─── Validadores ──────────────────────────────────────────────

const openInput = z.object({
  openingAmount: z.number().min(0),
  breakdown: z.record(z.number()).optional(),
});

const closeInput = z.object({
  realAmount: z.number().min(0),
  notes: z.string().max(500).optional(),
  breakdown: z.record(z.number()).optional(),
});

const moveInput = z.object({
  type: z.enum(["entrada", "salida"]),
  amount: z.number(),
  concept: z.string().max(255).optional().default(""),
  paymentMethod: z.string().max(50).optional().default("efectivo"),
});

const deleteMovementInput = z.object({
  movementId: z.string(),
});

const updateMovementInput = z.object({
  movementId: z.string(),
  amount: z.number(),
  concept: z.string().max(255).optional(),
  paymentMethod: z.string().max(50).optional(),
});

const cutDetailInput = z.object({ 
  registerId: z.string() 
});

// ─── Types ──────────────────────────────────────────────────

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

// ─── Server Functions ──────────────────────────────────────

export const openCashRegister = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => openInput.parse(d))
  .handler(async ({ data }) => {
    return localApi.post('/api/cash/open', {
      openingAmount: data.openingAmount,
      breakdown: data.breakdown,
    });
  });

export const closeCashRegister = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => closeInput.parse(d))
  .handler(async ({ data }) => {
    return localApi.post('/api/cash/close', {
      realAmount: data.realAmount,
      notes: data.notes,
      breakdown: data.breakdown,
    });
  });

export const addCashMovement = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => moveInput.parse(d))
  .handler(async ({ data }) => {
    return localApi.post('/api/cash/movement', {
      type: data.type,
      amount: data.amount,
      concept: data.concept || "Sin concepto",
      paymentMethod: data.paymentMethod,
    });
  });

export const deleteCashMovement = createServerFn({ method: "DELETE" })
  .inputValidator((d: unknown) => deleteMovementInput.parse(d))
  .handler(async ({ data }) => {
    return localApi.delete(`/api/cash/movement/${data.movementId}`);
  });

export const updateCashMovement = createServerFn({ method: "PUT" })
  .inputValidator((d: unknown) => updateMovementInput.parse(d))
  .handler(async ({ data }) => {
    return localApi.put(`/api/cash/movement/${data.movementId}`, {
      amount: data.amount,
      concept: data.concept,
      paymentMethod: data.paymentMethod,
    });
  });

export const getCurrentRegister = createServerFn({ method: "GET" })
  .handler(async () => {
    return localApi.get('/api/cash/current');
  });

export const getRegisterHistory = createServerFn({ method: "GET" })
  .handler(async () => {
    return localApi.get('/api/cash/history');
  });

export const getCashCutDetail = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => cutDetailInput.parse(d))
  .handler(async ({ data }) => {
    return localApi.get(`/api/cash/cut/${data.registerId}`);
  });

export const checkRegisterOpen = createServerFn({ method: "GET" })
  .handler(async () => {
    const status = await localApi.get<{ open: boolean; registerId: string | null }>('/api/cash/status');
    return status.open;
  });