import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/PlaceholderPage";
import { History } from "lucide-react";
export const Route = createFileRoute("/historial")({
  component: () => <PlaceholderPage title="Historial de Ventas" subtitle="Consulta, reimprime y cancela ventas." icon={History} />,
});
