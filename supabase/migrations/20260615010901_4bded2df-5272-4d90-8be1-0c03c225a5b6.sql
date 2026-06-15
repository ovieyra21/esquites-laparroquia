
-- Tighten profiles SELECT: own row or admin/supervisor
DROP POLICY IF EXISTS profiles_select_authenticated ON public.profiles;
CREATE POLICY profiles_select_self_or_admin ON public.profiles
  FOR SELECT TO authenticated
  USING (
    id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'supervisor')
  );

-- Settings: split sensitive vs public. Keep table admin-only for full read.
-- Create a safe public view exposing only non-sensitive fields used by tickets/UI.
DROP POLICY IF EXISTS settings_select ON public.settings;
CREATE POLICY settings_select_admin ON public.settings
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'supervisor')
  );

CREATE OR REPLACE VIEW public.settings_public
WITH (security_invoker = true) AS
SELECT id, business_name, slogan, footer_message, tax
FROM public.settings;
GRANT SELECT ON public.settings_public TO authenticated, anon;

-- Sales: own row or admin/supervisor
DROP POLICY IF EXISTS sales_select_authenticated ON public.sales;
CREATE POLICY sales_select_own_or_admin ON public.sales
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'supervisor')
  );

-- Sale items: scoped via parent sale
DROP POLICY IF EXISTS sale_items_select ON public.sale_items;
CREATE POLICY sale_items_select_scoped ON public.sale_items
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.sales s
      WHERE s.id = sale_items.sale_id
        AND (
          s.user_id = auth.uid()
          OR public.has_role(auth.uid(), 'admin')
          OR public.has_role(auth.uid(), 'supervisor')
        )
    )
  );

DROP POLICY IF EXISTS sale_items_insert ON public.sale_items;
CREATE POLICY sale_items_insert_scoped ON public.sale_items
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.sales s
      WHERE s.id = sale_items.sale_id
        AND (s.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  );

-- Sale item modifiers: scoped via parent sale_item -> sale
DROP POLICY IF EXISTS sale_item_modifiers_select ON public.sale_item_modifiers;
CREATE POLICY sale_item_modifiers_select_scoped ON public.sale_item_modifiers
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.sale_items si
      JOIN public.sales s ON s.id = si.sale_id
      WHERE si.id = sale_item_modifiers.sale_item_id
        AND (
          s.user_id = auth.uid()
          OR public.has_role(auth.uid(), 'admin')
          OR public.has_role(auth.uid(), 'supervisor')
        )
    )
  );

DROP POLICY IF EXISTS sale_item_modifiers_insert ON public.sale_item_modifiers;
CREATE POLICY sale_item_modifiers_insert_scoped ON public.sale_item_modifiers
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.sale_items si
      JOIN public.sales s ON s.id = si.sale_id
      WHERE si.id = sale_item_modifiers.sale_item_id
        AND (s.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  );

-- Lock down SECURITY DEFINER functions: revoke from public/anon
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.current_user_has_any_role(app_role[]) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_cash_register_summary(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_has_any_role(app_role[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_cash_register_summary(uuid) TO authenticated;

-- Fix mutable search_path on touch_updated_at
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
