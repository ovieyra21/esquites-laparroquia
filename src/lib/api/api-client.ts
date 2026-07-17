// src/lib/api/api-client.ts
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// ─── Cliente para el servidor local (SQLite) ────────────────

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const localApi = {
  async get<T>(endpoint: string): Promise<T> {
    const res = await fetch(`${API_BASE}${endpoint}`);
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async post<T>(endpoint: string, data?: any): Promise<T> {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: data ? JSON.stringify(data) : undefined,
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async put<T>(endpoint: string, data?: any): Promise<T> {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: data ? JSON.stringify(data) : undefined,
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async delete<T>(endpoint: string): Promise<T> {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
};

// ─── Ejemplo de createServerFn con tu API local ─────────────

export const getLocalProducts = createServerFn({ method: "GET" })
  .handler(async () => {
    return localApi.get('/api/products');
  });

export const getLocalSettings = createServerFn({ method: "GET" })
  .handler(async () => {
    return localApi.get('/api/settings');
  });