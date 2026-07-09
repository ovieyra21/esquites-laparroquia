-- Notas de cocina y estado por producto para el KDS
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS kitchen_notes text;
ALTER TABLE public.sale_items ADD COLUMN IF NOT EXISTS kds_item_status text NOT NULL DEFAULT 'pendiente';
CREATE INDEX IF NOT EXISTS idx_sale_items_kds_item_status ON public.sale_items(kds_item_status);

-- Habilitar realtime en sale_items (ignorar si ya está)
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.sale_items;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
END $$;