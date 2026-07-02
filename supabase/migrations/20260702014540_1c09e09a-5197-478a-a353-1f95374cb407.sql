
DROP POLICY IF EXISTS inventory_items_select_authenticated ON public.inventory_items;
CREATE POLICY inventory_items_select_admin_supervisor ON public.inventory_items
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'supervisor'::app_role));

DROP POLICY IF EXISTS product_recipes_select_authenticated ON public.product_recipes;
CREATE POLICY product_recipes_select_admin_supervisor ON public.product_recipes
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'supervisor'::app_role));
