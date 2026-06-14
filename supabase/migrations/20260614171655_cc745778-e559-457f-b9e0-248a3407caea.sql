
ALTER TABLE public.sale_items
  ADD COLUMN IF NOT EXISTS product_name TEXT,
  ADD COLUMN IF NOT EXISTS product_emoji TEXT;

-- Asegurar que product_id sea nullable (en caso de catálogo no migrado aún)
ALTER TABLE public.sale_items ALTER COLUMN product_id DROP NOT NULL;
