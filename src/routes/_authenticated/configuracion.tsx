import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/PlaceholderPage";
import { Settings } from "lucide-react";
export const Route = createFileRoute("/_authenticated/_authenticated/configuracion")({
  component: () => <PlaceholderPage title="Configuración" subtitle="Datos del negocio, impuestos, impresora y más." icon={Settings} />,
});
