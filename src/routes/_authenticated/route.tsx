// src/routes/_authenticated/route.tsx
import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: () => {
    return { 
      user: { id: 'local-user-1', email: 'admin@local.com' },
    };
  },
  component: () => <Outlet />,
  pendingComponent: () => (
    <div className="flex h-[400px] items-center justify-center">
      <div className="size-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
    </div>
  ),
});
