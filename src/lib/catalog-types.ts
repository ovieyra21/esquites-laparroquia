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
  image?: string;
  emoji?: string;
  includes?: string[];
  modifierGroups?: ModifierGroup[];
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  products: Product[];
}
