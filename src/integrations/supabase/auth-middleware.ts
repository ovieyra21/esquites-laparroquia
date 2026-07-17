import { createMiddleware } from '@tanstack/react-start'

export const requireSupabaseAuth = createMiddleware({ type: 'function' }).server(
  async ({ next }) => {
    return next({
      context: {
        supabase: {} as any,
        userId: 'local-user-1',
        claims: { sub: 'local-user-1' },
      },
    });
  },
);
