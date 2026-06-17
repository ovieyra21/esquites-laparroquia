-- Seed menu catalog from Esquites La Parroquia printed menu.
-- Idempotent: safe to run more than once.

DO $$
DECLARE
  v_fritura UUID;
  v_elote UUID;
  v_papa_maruchan UUID;
  v_chicharron UUID;
  v_preparados UUID;
  v_lokos UUID;
  v_uchepos UUID;
  v_tipo_fritura UUID;
  v_color_elote UUID;
BEGIN
  INSERT INTO public.categories (name, icon)
  SELECT 'Fritura', '🍟'
  WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE lower(name) = lower('Fritura'));

  INSERT INTO public.categories (name, icon)
  SELECT 'Elote', '🌽'
  WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE lower(name) = lower('Elote'));

  IF EXISTS (SELECT 1 FROM public.categories WHERE lower(name) = lower('Maruchan'))
     AND NOT EXISTS (SELECT 1 FROM public.categories WHERE lower(name) = lower('Papa & Maruchan')) THEN
    UPDATE public.categories
    SET name = 'Papa & Maruchan', icon = '🍜'
    WHERE lower(name) = lower('Maruchan');
  ELSE
    INSERT INTO public.categories (name, icon)
    SELECT 'Papa & Maruchan', '🍜'
    WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE lower(name) = lower('Papa & Maruchan'));
  END IF;

  INSERT INTO public.categories (name, icon)
  SELECT 'Chicharrón Casero', '🐷'
  WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE lower(name) = lower('Chicharrón Casero'));

  INSERT INTO public.categories (name, icon)
  SELECT 'Preparados', '👑'
  WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE lower(name) = lower('Preparados'));

  INSERT INTO public.categories (name, icon)
  SELECT 'Lokos', '💥'
  WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE lower(name) = lower('Lokos'));

  INSERT INTO public.categories (name, icon)
  SELECT 'Uchepos', '🫔'
  WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE lower(name) = lower('Uchepos'));

  SELECT id INTO v_fritura FROM public.categories WHERE lower(name) = lower('Fritura') LIMIT 1;
  SELECT id INTO v_elote FROM public.categories WHERE lower(name) = lower('Elote') LIMIT 1;
  SELECT id INTO v_papa_maruchan FROM public.categories WHERE lower(name) = lower('Papa & Maruchan') LIMIT 1;
  SELECT id INTO v_chicharron FROM public.categories WHERE lower(name) = lower('Chicharrón Casero') LIMIT 1;
  SELECT id INTO v_preparados FROM public.categories WHERE lower(name) = lower('Preparados') LIMIT 1;
  SELECT id INTO v_lokos FROM public.categories WHERE lower(name) = lower('Lokos') LIMIT 1;
  SELECT id INTO v_uchepos FROM public.categories WHERE lower(name) = lower('Uchepos') LIMIT 1;

  UPDATE public.categories SET icon = '🍟' WHERE id = v_fritura AND icon IS NULL;
  UPDATE public.categories SET icon = '🌽' WHERE id = v_elote AND icon IS NULL;
  UPDATE public.categories SET icon = '🍜' WHERE id = v_papa_maruchan AND icon IS NULL;
  UPDATE public.categories SET icon = '🐷' WHERE id = v_chicharron AND icon IS NULL;
  UPDATE public.categories SET icon = '👑' WHERE id = v_preparados AND icon IS NULL;
  UPDATE public.categories SET icon = '💥' WHERE id = v_lokos AND icon IS NULL;
  UPDATE public.categories SET icon = '🫔' WHERE id = v_uchepos AND icon IS NULL;

  INSERT INTO public.products (category_id, name, description, price, active, display_order)
  SELECT incoming.category_id, incoming.name, incoming.description, incoming.price, incoming.active, incoming.display_order
  FROM (VALUES
    (v_fritura, 'Churros con crema y queso', NULL, 40, true, 10),
    (v_fritura, 'Frituras solas', 'Elige Tostitos, Takis, Cheetos, Doritos, Ruffles o Churros.', 25, true, 20),
    (v_fritura, 'Frituras con verdura', 'Con repollo, jitomate y cueritos.', 20, true, 30),
    (v_fritura, 'Frituras preparadas', 'Prepáralas con crema, queso, salsa y limón al gusto.', 35, true, 40),
    (v_fritura, 'Cacahuate japonés preparado', 'Preparado con crema, queso, salsa y limón al gusto.', 40, true, 50),
    (v_fritura, 'Papas doradas preparadas', 'Preparadas con crema, queso, salsa y limón al gusto.', 40, true, 60),
    (v_elote, 'Entero', 'Disponible en elote blanco o amarillo.', 25, true, 10),
    (v_elote, 'Entero con aderezos', 'Disponible en elote blanco o amarillo.', 40, true, 20),
    (v_elote, 'Vaso chico', 'Disponible en elote blanco o amarillo.', 35, true, 30),
    (v_elote, 'Cazuelita', 'Disponible en elote blanco o amarillo.', 40, true, 40),
    (v_elote, 'Vaso mediano', 'Disponible en elote blanco o amarillo.', 45, true, 50),
    (v_elote, 'Vaso grande', 'Disponible en elote blanco o amarillo.', 50, true, 60),
    (v_papa_maruchan, 'Papa cocida', NULL, 35, true, 10),
    (v_papa_maruchan, 'Papa cocida con aderezos', NULL, 50, true, 20),
    (v_papa_maruchan, 'Papa cocida con elote', NULL, 65, true, 30),
    (v_papa_maruchan, 'Maruchan con limón y salsa', NULL, 30, true, 40),
    (v_papa_maruchan, 'Maruchan con aderezos', NULL, 50, true, 50),
    (v_papa_maruchan, 'Maruchan con elote', NULL, 65, true, 60),
    (v_chicharron, 'Chicharrón preparado', 'Lleva jitomate, repollo, cueritos, sal, limón y salsa al gusto.', 40, true, 10),
    (v_preparados, 'Dorilocos', 'Con elote. Llevan elote, crema o mayonesa, queso, cacahuate japonés, salsa y limón al gusto.', 65, true, 10),
    (v_preparados, 'Tostilocos', 'Con elote. Llevan elote, crema o mayonesa, queso, cacahuate japonés, salsa y limón al gusto.', 65, true, 20),
    (v_preparados, 'Churrolocos', 'Con elote. Llevan elote, crema o mayonesa, queso, cacahuate japonés, salsa y limón al gusto.', 65, true, 30),
    (v_preparados, 'Chicharrolotes', 'Con elote. Llevan elote, crema o mayonesa, queso, cacahuate japonés, salsa y limón al gusto.', 65, true, 40),
    (v_preparados, 'Takilotes', 'Con elote. Llevan elote, crema o mayonesa, queso, cacahuate japonés, salsa y limón al gusto.', 65, true, 50),
    (v_preparados, 'Cheetolotes', 'Con elote. Llevan elote, crema o mayonesa, queso, cacahuate japonés, salsa y limón al gusto.', 65, true, 60),
    (v_lokos, 'Dorilokos', 'Llevan jitomate, repollo, cueritos, pepino, jícama, cacahuate japonés, gomitas, clamato, salsa inglesa y jugo Maggi.', 65, true, 10),
    (v_lokos, 'Tostilokos', 'Llevan jitomate, repollo, cueritos, pepino, jícama, cacahuate japonés, gomitas, clamato, salsa inglesa y jugo Maggi.', 65, true, 20),
    (v_lokos, 'Cheetolokos', 'Llevan jitomate, repollo, cueritos, pepino, jícama, cacahuate japonés, gomitas, clamato, salsa inglesa y jugo Maggi.', 65, true, 30),
    (v_lokos, 'Takilokos', 'Llevan jitomate, repollo, cueritos, pepino, jícama, cacahuate japonés, gomitas, clamato, salsa inglesa y jugo Maggi.', 65, true, 40),
    (v_lokos, 'Churrolokos', 'Llevan jitomate, repollo, cueritos, pepino, jícama, cacahuate japonés, gomitas, clamato, salsa inglesa y jugo Maggi.', 65, true, 50),
    (v_lokos, 'Rufflelokos', 'Llevan jitomate, repollo, cueritos, pepino, jícama, cacahuate japonés, gomitas, clamato, salsa inglesa y jugo Maggi.', 65, true, 60),
    (v_lokos, 'Papas lokas', 'Llevan jitomate, repollo, cueritos, pepino, jícama, cacahuate japonés, gomitas, clamato, salsa inglesa y jugo Maggi.', 65, true, 70),
    (v_lokos, 'Chicharrón loko', 'Llevan jitomate, repollo, cueritos, pepino, jícama, cacahuate japonés, gomitas, clamato, salsa inglesa y jugo Maggi.', 65, true, 80),
    (v_uchepos, 'Uchepo sencillo', NULL, 16, true, 10),
    (v_uchepos, 'Uchepos preparados', '3 piezas con crema, queso y salsa.', 40, true, 20),
    (v_uchepos, 'Uchepos con elote', '3 uchepos preparados + elote.', 65, true, 30)
  ) AS incoming(category_id, name, description, price, active, display_order)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.products p WHERE lower(p.name) = lower(incoming.name)
  );

  UPDATE public.products AS existing
  SET
    category_id = incoming.category_id,
    description = incoming.description,
    price = incoming.price,
    active = incoming.active,
    display_order = incoming.display_order
  FROM (
    VALUES
      (v_fritura, 'Churros con crema y queso', NULL::TEXT, 40::NUMERIC, true, 10),
      (v_fritura, 'Frituras solas', 'Elige Tostitos, Takis, Cheetos, Doritos, Ruffles o Churros.', 25::NUMERIC, true, 20),
      (v_fritura, 'Frituras con verdura', 'Con repollo, jitomate y cueritos.', 20::NUMERIC, true, 30),
      (v_elote, 'Entero', 'Disponible en elote blanco o amarillo.', 25::NUMERIC, true, 10),
      (v_elote, 'Entero con aderezos', 'Disponible en elote blanco o amarillo.', 40::NUMERIC, true, 20),
      (v_elote, 'Vaso chico', 'Disponible en elote blanco o amarillo.', 35::NUMERIC, true, 30),
      (v_elote, 'Cazuelita', 'Disponible en elote blanco o amarillo.', 40::NUMERIC, true, 40),
      (v_elote, 'Vaso mediano', 'Disponible en elote blanco o amarillo.', 45::NUMERIC, true, 50),
      (v_elote, 'Vaso grande', 'Disponible en elote blanco o amarillo.', 50::NUMERIC, true, 60),
      (v_papa_maruchan, 'Maruchan con limón y salsa', NULL::TEXT, 30::NUMERIC, true, 40),
      (v_papa_maruchan, 'Maruchan con aderezos', NULL::TEXT, 50::NUMERIC, true, 50),
      (v_papa_maruchan, 'Maruchan con elote', NULL::TEXT, 65::NUMERIC, true, 60)
  ) AS incoming(category_id, name, description, price, active, display_order)
  WHERE lower(existing.name) = lower(incoming.name);

  INSERT INTO public.modifier_groups (name, required)
  SELECT 'Tipo de fritura', true
  WHERE NOT EXISTS (SELECT 1 FROM public.modifier_groups WHERE lower(name) = lower('Tipo de fritura'));

  INSERT INTO public.modifier_groups (name, required)
  SELECT 'Color de elote', true
  WHERE NOT EXISTS (SELECT 1 FROM public.modifier_groups WHERE lower(name) = lower('Color de elote'));

  SELECT id INTO v_tipo_fritura FROM public.modifier_groups WHERE lower(name) = lower('Tipo de fritura') LIMIT 1;
  SELECT id INTO v_color_elote FROM public.modifier_groups WHERE lower(name) = lower('Color de elote') LIMIT 1;

  INSERT INTO public.modifiers (modifier_group_id, name, extra_price)
  SELECT v_tipo_fritura, option_name, 0
  FROM (VALUES ('Tostitos'), ('Takis'), ('Cheetos'), ('Doritos'), ('Ruffles'), ('Churros')) AS options(option_name)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.modifiers
    WHERE modifier_group_id = v_tipo_fritura AND lower(name) = lower(option_name)
  );

  INSERT INTO public.modifiers (modifier_group_id, name, extra_price)
  SELECT v_color_elote, option_name, 0
  FROM (VALUES ('Blanco'), ('Amarillo')) AS options(option_name)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.modifiers
    WHERE modifier_group_id = v_color_elote AND lower(name) = lower(option_name)
  );

  INSERT INTO public.product_modifiers (product_id, modifier_group_id)
  SELECT p.id, v_tipo_fritura
  FROM public.products p
  WHERE lower(p.name) IN (
    lower('Frituras solas'),
    lower('Frituras con verdura'),
    lower('Frituras preparadas')
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.product_modifiers pm
    WHERE pm.product_id = p.id AND pm.modifier_group_id = v_tipo_fritura
  );

  INSERT INTO public.product_modifiers (product_id, modifier_group_id)
  SELECT p.id, v_color_elote
  FROM public.products p
  WHERE p.category_id = v_elote
  AND NOT EXISTS (
    SELECT 1 FROM public.product_modifiers pm
    WHERE pm.product_id = p.id AND pm.modifier_group_id = v_color_elote
  );

  UPDATE public.settings
  SET
    business_name = COALESCE(business_name, 'Esquites La Parroquia'),
    slogan = COALESCE(slogan, '¡El sabor que nos une!'),
    address = COALESCE(address, 'Acámbaro, Gto.'),
    footer_message = COALESCE(footer_message, '¡El sabor que nos une!'),
    tax = COALESCE(tax, 0);
END $$;
