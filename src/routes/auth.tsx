import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Iniciar sesión · Esquites La Parroquia" }] }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate({ to: "/pos" });
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md bg-card rounded-3xl gold-border p-8 space-y-6 shadow-[var(--shadow-gold)]">
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-2"><Logo size={64} /></div>
          <h1 className="font-display text-3xl gold-text">Esquites La Parroquia</h1>
          <p className="text-sm text-muted-foreground">Sistema local - acceso automático</p>
        </div>
        <Button onClick={() => navigate({ to: "/pos" })} className="w-full h-11 bg-gradient-to-r from-gold to-gold-soft text-primary-foreground font-bold">
          Ir al Punto de Venta
        </Button>
      </div>
    </div>
  );
}
