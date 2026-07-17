// src/lib/analytics.functions.ts
import { createServerFn } from "@tanstack/react-start";
import { localApi } from "./api/api-client";

export const analyticsApi = {
  async getDailyStats() {
    return localApi.get('/api/analytics/daily');
  },

  async getRangeStats(dateFrom: string, dateTo: string) {
    return localApi.get(`/api/analytics/range?from=${dateFrom}&to=${dateTo}`);
  },

  async getTopProducts() {
    return localApi.get('/api/analytics/top-products');
  },
};