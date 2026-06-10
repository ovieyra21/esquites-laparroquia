import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Outlet, createRootRouteWithContext, HeadContent, Scripts } from "@tanstack/react-router";
import type { ReactNode } from "react";
import appCss from "../styles.css?url";
import { Sidebar } from "@/components/Sidebar";

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Esquites La Parroquia · POS" },
      { name: "description", content: "Sistema de punto de venta premium para Esquites La Parroquia." },
      { property: "og:title", content: "Esquites La Parroquia · POS" },
      { name: "twitter:title", content: "Esquites La Parroquia · POS" },
      { property: "og:description", content: "Sistema de punto de venta premium para Esquites La Parroquia." },
      { name: "twitter:description", content: "Sistema de punto de venta premium para Esquites La Parroquia." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/27f96284-ba40-4eab-b4df-d21579b51f92/id-preview-670ee205--3e83b723-f5de-4fbb-b7ed-d5ce26bd7120.lovable.app-1781118179707.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/27f96284-ba40-4eab-b4df-d21579b51f92/id-preview-670ee205--3e83b723-f5de-4fbb-b7ed-d5ce26bd7120.lovable.app-1781118179707.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:wght@600;700;800&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: () => (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="font-display text-6xl gold-text">404</h1>
        <p className="text-muted-foreground mt-2">Página no encontrada</p>
      </div>
    </div>
  ),
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="es" className="dark">
      <head><HeadContent /></head>
      <body>{children}<Scripts /></body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <div className="flex min-h-screen w-full">
        <Sidebar />
        <main className="flex-1 min-w-0"><Outlet /></main>
      </div>
    </QueryClientProvider>
  );
}
