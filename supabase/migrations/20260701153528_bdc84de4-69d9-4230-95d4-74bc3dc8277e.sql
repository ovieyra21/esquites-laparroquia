
-- Fix settings: replace ALL policy with scoped INSERT/UPDATE/DELETE
DROP POLICY IF EXISTS settings_admin_write ON public.settings;
CREATE POLICY settings_admin_insert ON public.settings FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(),'admin'));
CREATE POLICY settings_admin_update ON public.settings FOR UPDATE TO authenticated USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE POLICY settings_admin_delete ON public.settings FOR DELETE TO authenticated USING (has_role(auth.uid(),'admin'));

-- Fix customers: restrict SELECT/UPDATE to admin+supervisor only
DROP POLICY IF EXISTS customers_select_own_or_admin_supervisor ON public.customers;
CREATE POLICY customers_select_admin_supervisor ON public.customers FOR SELECT TO authenticated USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'supervisor'));
DROP POLICY IF EXISTS customers_update_own_or_admin_supervisor ON public.customers;
CREATE POLICY customers_update_admin_supervisor ON public.customers FOR UPDATE TO authenticated USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'supervisor')) WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'supervisor'));

-- Add explicit UPDATE/DELETE policies for sales realtime completeness (deny by default; admin/supervisor via existing update policy is fine, add DELETE for admin)
CREATE POLICY sales_delete_admin ON public.sales FOR DELETE TO authenticated USING (has_role(auth.uid(),'admin'));

-- Fix function search_path
CREATE OR REPLACE FUNCTION public.set_customer_created_by()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
    NEW.created_by = auth.uid();
    RETURN NEW;
END;
$function$;
