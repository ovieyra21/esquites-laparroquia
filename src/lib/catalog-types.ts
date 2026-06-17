// Catalog types used by the cart, POS and public menu.
// Data lives in the database (tables: categories, products).

export type ModifierOption = { id: string; label: string; priceDelta?: number };
export type ModifierGroup = {
  id: string;
  label: string;
  required: boolean;
  multi?: boolean;
  options: ModifierOption[];
};

export type Category = {
  id: string;
  name: string;
  icon: string | null;
};

export type Product = {
  id: string;
  name: string;
  price: number;
  category_id: string | null;
  description?: string | null;
  includes?: string[] | null;
  emoji: string;
  image_url?: string | null;
  modifiers?: ModifierGroup[];
};

// Hardcoded modifier presets, mapped to product names by keyword.
// (Until modifier groups are managed in the DB UI, this keeps the POS UX consistent.)
const FRITURAS: ModifierGroup = {
  id: "tipo-fritura",
  label: "Seleccione una fritura",
  required: true,
  options: ["Tostitos", "Takis", "Cheetos", "Doritos", "Ruffles", "Churros"].map((l) => ({
    id: l.toLowerCase(),
    label: l,
  })),
};

const TIPO_ELOTE: ModifierGroup = {
  id: "tipo-elote",
  label: "Seleccione tipo de elote",
  required: true,
  options: [
    { id: "blanco", label: "Elote Blanco" },
    { id: "amarillo", label: "Elote Amarillo" },
  ],
};

export function inferModifiers(p: { name: string; category_name?: string | null }): ModifierGroup[] | undefined {
  const n = p.name.toLowerCase();
  const cat = (p.category_name ?? "").toLowerCase();
  const out: ModifierGroup[] = [];
  if (cat === "fritura" && (n.includes("fritura") || n.includes("preparados con fritura"))) {
    out.push(FRITURAS);
  }
  if (cat === "elote") out.push(TIPO_ELOTE);
  return out.length ? out : undefined;
}
