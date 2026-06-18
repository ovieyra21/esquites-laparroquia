import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    // getSession is safer for offline as it doesn't always hit the server
    const { data } = await supabase.auth.getSession();
    const user = data.session?.user;

    if (!user) {
      // If we are truly offline and have no session, we can't do much
      // but let's try to not hang.
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        return { user: null, isOffline: true };
      }
      throw redirect({ to: "/auth" });
    }
    return { user };
  },
  component: () => <Outlet />,
  pendingComponent: () => (
    <div className="flex h-[400px] items-center justify-center">
      <div className="size-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
    </div>
  ),
});
