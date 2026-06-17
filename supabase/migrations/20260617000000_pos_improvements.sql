-- POS Improvements Migration
-- Add breakdown columns to cash_register
ALTER TABLE public.cash_register
ADD COLUMN IF NOT EXISTS opening_breakdown jsonb,
ADD COLUMN IF NOT EXISTS closing_breakdown jsonb;

-- Add whatsapp_number to settings
ALTER TABLE public.settings
ADD COLUMN IF NOT EXISTS whatsapp_number text;

-- Add emoji and includes to products
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS emoji text,
ADD COLUMN IF NOT EXISTS includes text;

-- RLS Policies for public access to products and categories
-- We want anonymous users to be able to see active products and categories for the menu.

-- Categories public access
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'categories' AND policyname = 'Allow public read access'
  ) THEN
    ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "Allow public read access" ON public.categories
      FOR SELECT TO anon USING (true);
  END IF;
END $$;

-- Products public access (only active products)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'products' AND policyname = 'Allow public read access'
  ) THEN
    ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "Allow public read access" ON public.products
      FOR SELECT TO anon USING (active = true);
  END IF;
END $$;

-- Modifier groups public access
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'modifier_groups' AND policyname = 'Allow public read access'
  ) THEN
    ALTER TABLE public.modifier_groups ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "Allow public read access" ON public.modifier_groups
      FOR SELECT TO anon USING (true);
  END IF;
END $$;

-- Modifiers public access
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'modifiers' AND policyname = 'Allow public read access'
  ) THEN
    ALTER TABLE public.modifiers ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "Allow public read access" ON public.modifiers
      FOR SELECT TO anon USING (true);
  END IF;
END $$;

-- Product modifiers public access
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'product_modifiers' AND policyname = 'Allow public read access'
  ) THEN
    ALTER TABLE public.product_modifiers ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "Allow public read access" ON public.product_modifiers
      FOR SELECT TO anon USING (true);
  END IF;
END $$;
