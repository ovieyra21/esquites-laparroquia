import { createFileRoute, notFound } from "@tanstack/react-router";
import { getPublicMenuUrl } from "@/lib/menus.functions";
import { Logo } from "@/components/Logo";

export const Route = createFileRoute("/m/$id")({
  loader: async ({ params }) => {
    const data = await getPublicMenuUrl({ data: { id: params.id } });
    if (!data.url) throw notFound();
    return data;
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: "Menú · Esquites La Parroquia" },
      { name: "description", content: loaderData?.filename ?? "Menú digital" },
    ],
  }),
  errorComponent: () => (
    <div className="min-h-screen grid place-items-center text-muted-foreground">
      No se pudo cargar el menú.
    </div>
  ),
  notFoundComponent: () => (
    <div className="min-h-screen grid place-items-center text-muted-foreground p-6 text-center">
      Este menú no está disponible.
    </div>
  ),
  component: MenuViewer,
});

function MenuViewer() {
  const { url, filename } = Route.useLoaderData();
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card/60">
        <Logo size={36} />
        <div>
          <div className="font-display gold-text leading-tight">Esquites La Parroquia</div>
          <div className="text-xs text-muted-foreground truncate">{filename ?? "Menú"}</div>
        </div>
      </header>
      <iframe
        src={url ?? ""}
        title="Menú PDF"
        className="flex-1 w-full border-0 bg-muted"
      />
    </div>
  );
}
