import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/PlaceholderPage";
import { QrCode } from "lucide-react";
export const Route = createFileRoute("/menu")({
  component: () => <PlaceholderPage title="Menú Digital & QR" subtitle="Sube el menú PDF y genera tu código QR." icon={QrCode} />,
});
