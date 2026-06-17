
-- Inventory Items
CREATE TABLE IF NOT EXISTS inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  unit TEXT NOT NULL, -- 'kg', 'gr', 'l', 'ml', 'pza'
  stock DECIMAL(10,2) NOT NULL DEFAULT 0,
  min_stock DECIMAL(10,2) NOT NULL DEFAULT 0,
  cost_per_unit DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Recipes (Linking Products to Inventory)
CREATE TABLE IF NOT EXISTS product_recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  inventory_item_id UUID REFERENCES inventory_items(id) ON DELETE CASCADE,
  quantity DECIMAL(10,3) NOT NULL, -- amount of item per product
  UNIQUE(product_id, inventory_item_id)
);

-- Enable RLS
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_recipes ENABLE ROW LEVEL SECURITY;

-- Basic Policies (Allow authenticated users)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow all to authenticated' AND tablename = 'inventory_items') THEN
    CREATE POLICY "Allow all to authenticated" ON inventory_items FOR ALL TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow all to authenticated' AND tablename = 'product_recipes') THEN
    CREATE POLICY "Allow all to authenticated" ON product_recipes FOR ALL TO authenticated USING (true);
  END IF;
END $$;
