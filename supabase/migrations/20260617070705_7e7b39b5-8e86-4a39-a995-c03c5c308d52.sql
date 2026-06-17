
-- 1. Cash register denominations breakdown
ALTER TABLE public.cash_register
  ADD COLUMN IF NOT EXISTS opening_breakdown jsonb,
  ADD COLUMN IF NOT EXISTS closing_breakdown jsonb;

-- 2. Settings: whatsapp number for digital menu orders
ALTER TABLE public.settings
  ADD COLUMN IF NOT EXISTS whatsapp_number text;

-- 3. Products: emoji column for display in menu
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS emoji text,
  ADD COLUMN IF NOT EXISTS includes text[];

-- 4. Public (anon) read on products + categories for public menu
GRANT SELECT ON public.products TO anon;
GRANT SELECT ON public.categories TO anon;

DROP POLICY IF EXISTS products_public_select ON public.products;
CREATE POLICY products_public_select ON public.products
  FOR SELECT TO anon USING (active = true);

DROP POLICY IF EXISTS categories_public_select ON public.categories;
CREATE POLICY categories_public_select ON public.categories
  FOR SELECT TO anon USING (true);

-- 5. Seed categories and products (idempotent)
INSERT INTO public.categories (name, icon) VALUES
  ('Fritura', '🌽'),
  ('Elote', '🌽'),
  ('Maruchan', '🍜'),
  ('Chicharrón', '🥓'),
  ('Preparados', '🥣'),
  ('Lokos', '🔥'),
  ('Uchepos', '🫔')
ON CONFLICT DO NOTHING;

-- Seed products only if none exist yet (avoid duplicating)
DO $$
DECLARE
  cat_fritura uuid;
  cat_elote uuid;
  cat_maruchan uuid;
  cat_chicharron uuid;
  cat_preparados uuid;
  cat_lokos uuid;
  cat_uchepos uuid;
  has_products int;
BEGIN
  SELECT count(*) INTO has_products FROM public.products;
  IF has_products > 0 THEN RETURN; END IF;

  SELECT id INTO cat_fritura FROM public.categories WHERE name='Fritura' LIMIT 1;
  SELECT id INTO cat_elote FROM public.categories WHERE name='Elote' LIMIT 1;
  SELECT id INTO cat_maruchan FROM public.categories WHERE name='Maruchan' LIMIT 1;
  SELECT id INTO cat_chicharron FROM public.categories WHERE name='Chicharrón' LIMIT 1;
  SELECT id INTO cat_preparados FROM public.categories WHERE name='Preparados' LIMIT 1;
  SELECT id INTO cat_lokos FROM public.categories WHERE name='Lokos' LIMIT 1;
  SELECT id INTO cat_uchepos FROM public.categories WHERE name='Uchepos' LIMIT 1;

  INSERT INTO public.products (category_id, name, description, price, emoji, includes, display_order, active) VALUES
    (cat_fritura, 'Churros con crema y queso', NULL, 40, '🥨', NULL, 1, true),
    (cat_fritura, 'Frituras solas', NULL, 25, '🍟', NULL, 2, true),
    (cat_fritura, 'Fritura con verdura', 'Repollo, jitomate, cueritos', 20, '🥗', NULL, 3, true),
    (cat_fritura, 'Preparados con Frituras', NULL, 35, '🌶️', NULL, 4, true),
    (cat_fritura, 'Preparados con Cacahuate japonés', NULL, 40, '🥜', NULL, 5, true),
    (cat_fritura, 'Preparados con Papas doradas', NULL, 40, '🥔', NULL, 6, true),
    (cat_elote, 'Entero', NULL, 25, '🌽', NULL, 1, true),
    (cat_elote, 'Entero con aderezos', NULL, 40, '🌽', NULL, 2, true),
    (cat_elote, 'Vaso chico', NULL, 35, '🥤', NULL, 3, true),
    (cat_elote, 'Cazuelita', NULL, 40, '🍲', NULL, 4, true),
    (cat_elote, 'Vaso mediano', NULL, 45, '🥤', NULL, 5, true),
    (cat_elote, 'Vaso grande', NULL, 50, '🥛', NULL, 6, true),
    (cat_maruchan, 'Maruchan con limón y salsa', NULL, 30, '🍜', NULL, 1, true),
    (cat_maruchan, 'Maruchan con aderezos', NULL, 50, '🍜', NULL, 2, true),
    (cat_maruchan, 'Maruchan con elote', NULL, 65, '🍜', NULL, 3, true),
    (cat_chicharron, 'Chicharrón preparado', 'Jitomate, repollo, cueritos, sal, limón y salsa al gusto.', 40, '🥓', NULL, 1, true),
    (cat_preparados, 'Dorilocos', NULL, 65, '🥣', ARRAY['Elote','Crema o mayonesa','Queso','Cacahuate japonés','Salsa','Limón'], 1, true),
    (cat_preparados, 'Tostilocos', NULL, 65, '🥣', ARRAY['Elote','Crema o mayonesa','Queso','Cacahuate japonés','Salsa','Limón'], 2, true),
    (cat_preparados, 'Churrolocos', NULL, 65, '🥣', ARRAY['Elote','Crema o mayonesa','Queso','Cacahuate japonés','Salsa','Limón'], 3, true),
    (cat_preparados, 'Chicharrolotes', NULL, 65, '🥣', ARRAY['Elote','Crema o mayonesa','Queso','Cacahuate japonés','Salsa','Limón'], 4, true),
    (cat_preparados, 'Takilotes', NULL, 65, '🥣', ARRAY['Elote','Crema o mayonesa','Queso','Cacahuate japonés','Salsa','Limón'], 5, true),
    (cat_preparados, 'Cheetolotes', NULL, 65, '🥣', ARRAY['Elote','Crema o mayonesa','Queso','Cacahuate japonés','Salsa','Limón'], 6, true),
    (cat_lokos, 'Dorilokos', NULL, 65, '🔥', ARRAY['Jitomate','Repollo','Pepino','Jícama','Cueritos','Cacahuate japonés','Gomitas','Clamato','Salsa inglesa','Jugo Maggi'], 1, true),
    (cat_lokos, 'Tostilokos', NULL, 65, '🔥', ARRAY['Jitomate','Repollo','Pepino','Jícama','Cueritos','Cacahuate japonés','Gomitas','Clamato','Salsa inglesa','Jugo Maggi'], 2, true),
    (cat_lokos, 'Cheetolokos', NULL, 65, '🔥', ARRAY['Jitomate','Repollo','Pepino','Jícama','Cueritos','Cacahuate japonés','Gomitas','Clamato','Salsa inglesa','Jugo Maggi'], 3, true),
    (cat_lokos, 'Takilokos', NULL, 65, '🔥', ARRAY['Jitomate','Repollo','Pepino','Jícama','Cueritos','Cacahuate japonés','Gomitas','Clamato','Salsa inglesa','Jugo Maggi'], 4, true),
    (cat_lokos, 'Churrolokos', NULL, 65, '🔥', ARRAY['Jitomate','Repollo','Pepino','Jícama','Cueritos','Cacahuate japonés','Gomitas','Clamato','Salsa inglesa','Jugo Maggi'], 5, true),
    (cat_lokos, 'Rufflelokos', NULL, 65, '🔥', ARRAY['Jitomate','Repollo','Pepino','Jícama','Cueritos','Cacahuate japonés','Gomitas','Clamato','Salsa inglesa','Jugo Maggi'], 6, true),
    (cat_lokos, 'Papas Lokas', NULL, 65, '🔥', ARRAY['Jitomate','Repollo','Pepino','Jícama','Cueritos','Cacahuate japonés','Gomitas','Clamato','Salsa inglesa','Jugo Maggi'], 7, true),
    (cat_lokos, 'Chicharrón Loko', NULL, 65, '🔥', ARRAY['Jitomate','Repollo','Pepino','Jícama','Cueritos','Cacahuate japonés','Gomitas','Clamato','Salsa inglesa','Jugo Maggi'], 8, true),
    (cat_uchepos, 'Uchepo sencillo', NULL, 16, '🫔', NULL, 1, true),
    (cat_uchepos, 'Uchepos preparados (3 pz)', 'Crema, queso, salsa', 40, '🫔', NULL, 2, true),
    (cat_uchepos, 'Uchepos con elote', '3 uchepos preparados + elote', 65, '🫔', NULL, 3, true);
END $$;
