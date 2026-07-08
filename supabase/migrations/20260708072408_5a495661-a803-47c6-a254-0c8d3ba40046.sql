
-- Lock down categories from anon; server functions use service role for public menu.
DROP POLICY IF EXISTS categories_public_select ON public.categories;
REVOKE SELECT ON public.categories FROM anon;

-- Scope inventory_items write policy to authenticated role explicitly.
DROP POLICY IF EXISTS inventory_items_write_admin_supervisor ON public.inventory_items;
CREATE POLICY inventory_items_write_admin_supervisor
  ON public.inventory_items
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'supervisor'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'supervisor'::app_role));

-- Scope product_recipes write policy to authenticated role explicitly.
DROP POLICY IF EXISTS product_recipes_write_admin_supervisor ON public.product_recipes;
CREATE POLICY product_recipes_write_admin_supervisor
  ON public.product_recipes
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'supervisor'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'supervisor'::app_role));
