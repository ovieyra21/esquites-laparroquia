import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/PlaceholderPage";
import { Package } from "lucide-react";
export const Route = createFileRoute("/_authenticated/productos")({
  component: () => <PlaceholderPage title="Productos" subtitle="Administra el catálogo, precios e imágenes." icon={Package} />,
});
