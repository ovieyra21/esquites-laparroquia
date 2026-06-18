import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Outlet, createRootRouteWithContext, HeadContent, Scripts } from "@tanstack/react-router";
import type { ReactNode } from "react";
import appCss from "../styles.css?url";
import { Sidebar } from "@/components/Sidebar";
import { ThemeProvider } from "@/components/theme-provider";
import { OfflineSync } from "@/components/OfflineSync";
import { Toaster } from "sonner";
import { Button } from "@/components/ui/button";

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
  pendingComponent: () => (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="size-12 border-4 border-gold border-t-transparent rounded-full animate-spin" />
        <p className="text-muted-foreground animate-pulse font-display text-sm tracking-widest uppercase">Iniciando La Parroquia...</p>
      </div>
    </div>
  ),
  errorComponent: ({ error }) => (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="max-w-md w-full bg-surface border border-destructive/20 p-8 rounded-3xl text-center shadow-2xl">
        <div className="size-16 bg-destructive/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <span className="text-3xl">⚠️</span>
        </div>
        <h1 className="text-2xl font-display font-bold text-foreground mb-4">Error de Aplicación</h1>
        <pre className="text-[10px] bg-black/40 p-4 rounded-xl overflow-auto text-left mb-6 max-h-40 font-mono text-muted-foreground">
          {error.message}
        </pre>
        <div className="flex gap-3">
          <Button onClick={() => window.location.reload()} className="flex-1 bg-gold hover:bg-gold/90 text-black font-bold h-12 rounded-xl">
            Reintentar Carga
          </Button>
          <Button onClick={() => window.history.back()} variant="outline" className="flex-1 h-12 rounded-xl">
            Volver
          </Button>
        </div>
      </div>
    </div>
  ),
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
    <html lang="es" suppressHydrationWarning>
      <head>
        <HeadContent />
        <script dangerouslySetInnerHTML={{ __html: `try{var t=localStorage.getItem('vite-ui-theme')||'system';var d=t==='dark'||(t==='system'&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d);document.documentElement.classList.toggle('light',!d);}catch(e){}` }} />
      </head>
      <body>{children}<Scripts /></body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <div className="flex min-h-screen w-full bg-background text-foreground">
          <Sidebar />
          <main className="flex-1 min-w-0">
            <Outlet />
            <OfflineSync />
            <Toaster position="top-right" richColors />
          </main>
        </div>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
