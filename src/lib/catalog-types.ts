export interface Modifier {
  id: string;
  name: string;
  price: number;
}

export interface ModifierGroup {
  id: string;
  name: string;
  minSelections: number;
  maxSelections: number;
  modifiers: Modifier[];
}

export interface Product {
  id: string;
  name: string;
  price: number;
  category_id?: string | null;
  description?: string | null;
  image?: string | null;
  image_url?: string | null;
  emoji?: string | null;
  includes?: string[] | null;
  modifierGroups?: ModifierGroup[];
}

export interface Category {
  id: string;
  name: string;
  icon: string | null;
  products?: Product[];
}

// Hardcoded modifier presets, mapped to product names by keyword.
// (Until modifier groups are managed in the DB UI, this keeps the POS UX consistent.)
const FRITURAS: ModifierGroup = {
  id: "tipo-fritura",
  name: "Seleccione una fritura",
  minSelections: 1,
  maxSelections: 1,
  modifiers: ["Tostitos", "Takis", "Cheetos", "Doritos", "Ruffles", "Churros"].map((l) => ({
    id: l.toLowerCase(),
    name: l,
    price: 0,
  })),
};

const TIPO_ELOTE: ModifierGroup = {
  id: "tipo-elote",
  name: "Seleccione tipo de elote",
  minSelections: 1,
  maxSelections: 1,
  modifiers: [
    { id: "blanco", name: "Elote Blanco", price: 0 },
    { id: "amarillo", name: "Elote Amarillo", price: 0 },
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
