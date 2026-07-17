// Local-only client - Supabase removed
import { localApi } from "@/lib/api/api-client";

export const supabase = {
  from: (table: string) => {
    const urlTable = table === "sales" ? "sales" : table;
    return {
      select: (...args: any[]) => ({
        eq: (col: string, val: any) => ({
          in: (col: string, vals: any[]) => ({
            order: (col: string, opts?: any) => ({
              limit: (n: number) => ({
                range: (from: number, to: number) => ({
                  maybeSingle: async () => {
                    try {
                      const data = await localApi.get(`/api/${urlTable}`);
                      return { data: Array.isArray(data) ? data[0] : data, error: null };
                    } catch (e) { return { data: null, error: e }; }
                  },
                  single: async () => {
                    try {
                      const data = await localApi.get(`/api/${urlTable}`);
                      return { data: Array.isArray(data) ? data[0] : data, error: null };
                    } catch (e) { return { data: null, error: e }; }
                  },
                  then: async (resolve: any) => {
                    try {
                      const data = await localApi.get(`/api/${urlTable}`);
                      resolve({ data: Array.isArray(data) ? data.slice(from, to + 1) : data, count: Array.isArray(data) ? data.length : 1, error: null });
                    } catch (e) { resolve({ data: null, count: 0, error: e }); }
                  }
                }),
                then: async (resolve: any) => {
                  try { const data = await localApi.get(`/api/${urlTable}?limit=${n}`); resolve({ data, error: null }); }
                  catch (e) { resolve({ data: null, error: e }); }
                }
              }),
              then: async (resolve: any) => {
                try { const data = await localApi.get(`/api/${urlTable}`); resolve({ data, error: null }); }
                catch (e) { resolve({ data: null, error: e }); }
              }
            }),
            single: async () => {
              try { const data = await localApi.get(`/api/${urlTable}?${col}=eq.${val}`); return { data: Array.isArray(data) ? data[0] : data, error: null }; }
              catch (e) { return { data: null, error: e }; }
            },
            maybeSingle: async () => {
              try { const data = await localApi.get(`/api/${urlTable}?${col}=eq.${val}`); return { data: Array.isArray(data) ? data[0] : data, error: null }; }
              catch (e) { return { data: null, error: e }; }
            },
            then: async (resolve: any) => {
              try { const data = await localApi.get(`/api/${urlTable}?${col}=eq.${val}`); resolve({ data, error: null }); }
              catch (e) { resolve({ data: null, error: e }); }
            }
          }),
          then: async (resolve: any) => {
            try { const data = await localApi.get(`/api/${urlTable}?${col}=eq.${val}`); resolve({ data, error: null }); }
            catch (e) { resolve({ data: null, error: e }); }
          }
        }),
        limit: (n: number) => ({
          maybeSingle: async () => {
            try { const data = await localApi.get(`/api/${urlTable}`); return { data: Array.isArray(data) ? data[0] : data, error: null }; }
            catch (e) { return { data: null, error: e }; }
          },
          order: (col: string, opts?: any) => ({
            then: async (resolve: any) => {
              try { const data = await localApi.get(`/api/${urlTable}`); resolve({ data: data.slice(0, n), error: null }); }
              catch (e) { resolve({ data: null, error: e }); }
            }
          }),
          then: async (resolve: any) => {
            try { const data = await localApi.get(`/api/${urlTable}`); resolve({ data: data.slice(0, n), error: null }); }
            catch (e) { resolve({ data: null, error: e }); }
          }
        }),
        not: (col: string, op: string, val: any) => ({
          eq: (col2: string, val2: any) => ({
            then: async (resolve: any) => {
              try { const data = await localApi.get(`/api/${urlTable}`); resolve({ data, error: null }); }
              catch (e) { resolve({ data: null, error: e }); }
            }
          }),
        }),
        or: (filter: string) => ({
          order: (col: string, opts?: any) => ({
            then: async (resolve: any) => {
              try { const data = await localApi.get(`/api/${urlTable}`); resolve({ data, error: null }); }
              catch (e) { resolve({ data: null, error: e }); }
            }
          }),
        }),
        then: async (resolve: any) => {
          try { const data = await localApi.get(`/api/${urlTable}`); resolve({ data, error: null }); }
          catch (e) { resolve({ data: null, error: e }); }
        }
      }),
      update: (values: any) => ({
        eq: (col: string, val: any) => ({
          then: async (resolve: any) => {
            try { const data = await localApi.put(`/api/${urlTable}/${val}`, values); resolve({ data, error: null }); }
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
            try { const data = await localApi.post(`/api/${urlTable}`, Array.isArray(values) ? values[0] : values); return { data, error: null }; }
            catch (e) { return { data: null, error: e }; }
          }
        }),
      }),
      delete: () => ({
        eq: (col: string, val: any) => ({
          then: async (resolve: any) => {
            try { const data = await localApi.delete(`/api/${urlTable}/${val}`); resolve({ data, error: null }); }
            catch (e) { resolve({ data: null, error: e }); }
          }
        }),
      }),
      rpc: (fn: string, params: any) => ({
        then: async (resolve: any) => { resolve({ data: true, error: null }); }
      }),
    };
  },
  channel: () => ({
    on: () => ({ subscribe: () => ({}) }),
  }),
  removeChannel: () => {},
  auth: {
    getSession: async () => ({ data: { session: { user: { id: 'local-user-1', email: 'admin@local.com' } } }, error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    signOut: async () => {},
    getUser: async () => ({ data: { user: { id: 'local-user-1' } }, error: null }),
    getClaims: async () => ({ data: { claims: { sub: 'local-user-1' } }, error: null }),
  },
  storage: {
    from: (bucket: string) => ({
      upload: async (path: string, file: any) => ({ data: { path }, error: null }),
      createSignedUrl: async (path: string, ttl: number) => ({ data: { signedUrl: path }, error: null }),
      remove: async (paths: string[]) => ({ data: {}, error: null }),
    }),
  },
} as any;
