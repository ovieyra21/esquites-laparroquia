
-- Remove anonymous read access from modifier tables and digital_menus.
-- Public catalog/menu endpoints use service-role server functions, so anon SELECT is unnecessary.
DROP POLICY IF EXISTS "Allow public read access" ON public.modifiers;
DROP POLICY IF EXISTS "Allow public read access" ON public.modifier_groups;
DROP POLICY IF EXISTS "Allow public read access" ON public.product_modifiers;
DROP POLICY IF EXISTS menus_public_select ON public.digital_menus;

REVOKE SELECT ON public.modifiers FROM anon;
REVOKE SELECT ON public.modifier_groups FROM anon;
REVOKE SELECT ON public.product_modifiers FROM anon;
REVOKE SELECT ON public.digital_menus FROM anon;

-- Consolidate categories: keep a single anon SELECT policy for the public landing page.
DROP POLICY IF EXISTS "Allow public read access" ON public.categories;
