// src/lib/crm.functions.ts
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { localApi } from "./api/api-client";

export const crmApi = {
  async getCustomers() {
    return localApi.get('/api/customers');
  },

  async createCustomer(data: any) {
    return localApi.post('/api/customers', data);
  },

  async updateCustomer(id: string, data: any) {
    return localApi.put(`/api/customers/${id}`, data);
  },
};