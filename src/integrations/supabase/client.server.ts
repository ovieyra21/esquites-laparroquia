// No-op server client - Supabase removed
import { localApi } from "@/lib/api/api-client";

export const supabaseAdmin = new Proxy({} as any, {
  get(_, prop) {
    if (prop === "from") {
      return (table: string) => ({
        select: (...args: any[]) => ({
          order: (...args2: any[]) => ({
            limit: (...args3: any[]) => ({
              maybeSingle: async () => {
                try { const data = await localApi.get(`/api/${table}`); return { data: Array.isArray(data) ? data[0] : data, error: null }; }
                catch (e) { return { data: null, error: e }; }
              },
              then: async (resolve: any) => {
                try { const data = await localApi.get(`/api/${table}`); resolve({ data, error: null }); }
                catch (e) { resolve({ data: null, error: e }); }
              }
            }),
            maybeSingle: async () => {
              try { const data = await localApi.get(`/api/${table}`); return { data: Array.isArray(data) ? data[0] : data, error: null }; }
              catch (e) { return { data: null, error: e }; }
            },
            then: async (resolve: any) => {
              try { const data = await localApi.get(`/api/${table}`); resolve({ data, error: null }); }
              catch (e) { resolve({ data: null, error: e }); }
            }
          }),
          eq: (col: string, val: any) => ({
            maybeSingle: async () => {
              try { const data = await localApi.get(`/api/${table}`); return { data: Array.isArray(data) ? data.find((d: any) => d[col] === val) : data, error: null }; }
              catch (e) { return { data: null, error: e }; }
            },
            single: async () => {
              try { const data = await localApi.get(`/api/${table}`); return { data: Array.isArray(data) ? data[0] : data, error: null }; }
              catch (e) { return { data: null, error: e }; }
            },
            then: async (resolve: any) => {
              try { const data = await localApi.get(`/api/${table}?${col}=eq.${val}`); resolve({ data, error: null }); }
              catch (e) { resolve({ data: null, error: e }); }
            }
          }),
          then: async (resolve: any) => {
            try { const data = await localApi.get(`/api/${table}`); resolve({ data, error: null }); }
            catch (e) { resolve({ data: null, error: e }); }
          }
        }),
        update: (values: any) => ({
          eq: (col: string, val: any) => ({
            then: async (resolve: any) => {
              try { const data = await localApi.put(`/api/${table}/${val}`, values); resolve({ data, error: null }); }
              catch (e) { resolve({ data: null, error: e }); }
            }
          }),
          neq: (col: string, val: any) => ({
            then: async (resolve: any) => {
              try { resolve({ data: null, error: null }); }
              catch (e) { resolve({ data: null, error: e }); }
            }
          }),
        }),
        insert: (values: any) => ({
          select: () => ({
            single: async () => {
              try { const data = await localApi.post(`/api/${table}`, Array.isArray(values) ? values[0] : values); return { data, error: null }; }
              catch (e) { return { data: null, error: e }; }
            }
          }),
        }),
        delete: () => ({
          eq: (col: string, val: any) => ({
            then: async (resolve: any) => {
              try { const data = await localApi.delete(`/api/${table}/${val}`); resolve({ data, error: null }); }
              catch (e) { resolve({ data: null, error: e }); }
            }
          }),
        }),
      });
    }
    if (prop === "storage") {
      return {
        from: (bucket: string) => ({
          upload: async (path: string, file: any) => ({ data: { path }, error: null }),
          createSignedUrl: async (path: string, ttl: number) => ({ data: { signedUrl: path }, error: null }),
          remove: async (paths: string[]) => ({ data: {}, error: null }),
        }),
      };
    }
    if (prop === "rpc") {
      return () => ({ then: async (resolve: any) => resolve({ data: true, error: null }) });
    }
    if (prop === "auth") {
      return {
        getSession: async () => ({ data: { session: null }, error: null }),
      };
    }
    return () => ({ then: async (resolve: any) => resolve({ data: [], error: null }) });
  },
});
