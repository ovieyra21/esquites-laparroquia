
-- ============================================================
-- BLOQUE 1: Auth, profiles, roles
-- ============================================================

-- Drop legacy users table (not linked to auth.users)
DROP TABLE IF EXISTS public.users CASCADE;

-- App role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'cajero', 'supervisor');

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_authenticated" ON public.profiles
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- User roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- has_role security definer
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.current_user_has_any_role(_roles public.app_role[])
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = ANY(_roles)
  )
$$;

CREATE POLICY "user_roles_select_own_or_admin" ON public.user_roles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "user_roles_admin_manage" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
  );
  -- Default role: cajero. First user gets admin (handled separately).
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'cajero');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- updated_at helper
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER profiles_touch_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============================================================
-- BLOQUE 2: Cash register + movements
-- ============================================================

-- Ampliar cash_register
ALTER TABLE public.cash_register
  ALTER COLUMN id SET NOT NULL,
  ALTER COLUMN opening_amount SET DEFAULT 0,
  ALTER COLUMN opening_amount SET NOT NULL,
  ALTER COLUMN status SET DEFAULT 'abierta',
  ALTER COLUMN status SET NOT NULL,
  ALTER COLUMN opened_at SET DEFAULT now(),
  ALTER COLUMN opened_at SET NOT NULL,
  ADD COLUMN IF NOT EXISTS expected_amount NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS real_amount NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS difference NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS total_sales_cash NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_sales_card NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_sales_transfer NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

-- Asegurar user_id FK válido
ALTER TABLE public.cash_register
  DROP CONSTRAINT IF EXISTS cash_register_user_id_fkey;
UPDATE public.cash_register SET user_id = NULL WHERE user_id IS NOT NULL AND user_id NOT IN (SELECT id FROM auth.users);
ALTER TABLE public.cash_register
  ADD CONSTRAINT cash_register_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- Solo una caja abierta por cajero
CREATE UNIQUE INDEX IF NOT EXISTS uq_cash_register_open_per_user
  ON public.cash_register(user_id) WHERE status = 'abierta';

GRANT SELECT, INSERT, UPDATE ON public.cash_register TO authenticated;
GRANT ALL ON public.cash_register TO service_role;
ALTER TABLE public.cash_register ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cash_register_select" ON public.cash_register
  FOR SELECT TO authenticated USING (
    user_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'supervisor')
  );
CREATE POLICY "cash_register_insert_own" ON public.cash_register
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "cash_register_update_own_or_admin" ON public.cash_register
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- Transform expenses → cash_movements (entrada/salida)
ALTER TABLE public.expenses RENAME TO cash_movements;
ALTER TABLE public.cash_movements
  ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'salida',
  ADD COLUMN IF NOT EXISTS cash_register_id UUID REFERENCES public.cash_register(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'efectivo';

ALTER TABLE public.cash_movements
  ADD CONSTRAINT cash_movements_type_chk CHECK (type IN ('entrada', 'salida'));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cash_movements TO authenticated;
GRANT ALL ON public.cash_movements TO service_role;
ALTER TABLE public.cash_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cash_movements_select" ON public.cash_movements
  FOR SELECT TO authenticated USING (
    user_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'supervisor')
  );
CREATE POLICY "cash_movements_insert_own" ON public.cash_movements
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- Sales: vincular cajero y caja
ALTER TABLE public.sales
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS cash_register_id UUID REFERENCES public.cash_register(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS cancelled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancelled_by UUID REFERENCES auth.users(id);

GRANT SELECT, INSERT, UPDATE ON public.sales TO authenticated;
GRANT ALL ON public.sales TO service_role;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sales_select_authenticated" ON public.sales
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "sales_insert_own" ON public.sales
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "sales_update_cancel" ON public.sales
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'supervisor'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'supervisor'));

-- Sale items / modifiers RLS
GRANT SELECT, INSERT ON public.sale_items TO authenticated;
GRANT ALL ON public.sale_items TO service_role;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sale_items_select" ON public.sale_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "sale_items_insert" ON public.sale_items FOR INSERT TO authenticated WITH CHECK (true);

GRANT SELECT, INSERT ON public.sale_item_modifiers TO authenticated;
GRANT ALL ON public.sale_item_modifiers TO service_role;
ALTER TABLE public.sale_item_modifiers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sale_item_modifiers_select" ON public.sale_item_modifiers FOR SELECT TO authenticated USING (true);
CREATE POLICY "sale_item_modifiers_insert" ON public.sale_item_modifiers FOR INSERT TO authenticated WITH CHECK (true);

-- Catálogo (lectura libre auth, escritura admin)
GRANT SELECT ON public.categories TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.categories TO authenticated;
GRANT ALL ON public.categories TO service_role;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "categories_select" ON public.categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "categories_admin_write" ON public.categories FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

GRANT SELECT ON public.products TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "products_select" ON public.products FOR SELECT TO authenticated USING (true);
CREATE POLICY "products_admin_write" ON public.products FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.modifier_groups TO authenticated;
GRANT ALL ON public.modifier_groups TO service_role;
ALTER TABLE public.modifier_groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "modgroups_select" ON public.modifier_groups FOR SELECT TO authenticated USING (true);
CREATE POLICY "modgroups_admin_write" ON public.modifier_groups FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.modifiers TO authenticated;
GRANT ALL ON public.modifiers TO service_role;
ALTER TABLE public.modifiers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "modifiers_select" ON public.modifiers FOR SELECT TO authenticated USING (true);
CREATE POLICY "modifiers_admin_write" ON public.modifiers FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_modifiers TO authenticated;
GRANT ALL ON public.product_modifiers TO service_role;
ALTER TABLE public.product_modifiers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pmods_select" ON public.product_modifiers FOR SELECT TO authenticated USING (true);
CREATE POLICY "pmods_admin_write" ON public.product_modifiers FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.digital_menus TO authenticated;
GRANT SELECT ON public.digital_menus TO anon;
GRANT ALL ON public.digital_menus TO service_role;
ALTER TABLE public.digital_menus ENABLE ROW LEVEL SECURITY;
CREATE POLICY "menus_public_select" ON public.digital_menus FOR SELECT USING (active = true);
CREATE POLICY "menus_admin_all" ON public.digital_menus FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- Settings (negocio + impresora)
-- ============================================================
ALTER TABLE public.settings
  ADD COLUMN IF NOT EXISTS footer_message TEXT DEFAULT '¡El sabor que nos une!',
  ADD COLUMN IF NOT EXISTS rfc TEXT,
  ADD COLUMN IF NOT EXISTS printer_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS printer_ip TEXT,
  ADD COLUMN IF NOT EXISTS printer_port INTEGER DEFAULT 9100,
  ADD COLUMN IF NOT EXISTS printer_width INTEGER DEFAULT 80,
  ADD COLUMN IF NOT EXISTS auto_print BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS auto_cut BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS open_drawer BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

GRANT SELECT ON public.settings TO authenticated;
GRANT INSERT, UPDATE ON public.settings TO authenticated;
GRANT ALL ON public.settings TO service_role;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "settings_select" ON public.settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "settings_admin_write" ON public.settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Seed single settings row if empty
INSERT INTO public.settings (business_name, slogan, address, phone)
SELECT 'Esquites La Parroquia', '¡El sabor que nos une!', 'Acámbaro, Gto.', NULL
WHERE NOT EXISTS (SELECT 1 FROM public.settings);

-- ============================================================
-- Resumen de caja
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_cash_register_summary(_register_id UUID)
RETURNS JSON
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  reg public.cash_register;
  v_cash NUMERIC := 0;
  v_card NUMERIC := 0;
  v_transfer NUMERIC := 0;
  v_mixto NUMERIC := 0;
  v_in NUMERIC := 0;
  v_out NUMERIC := 0;
  v_sales_count INT := 0;
BEGIN
  SELECT * INTO reg FROM public.cash_register WHERE id = _register_id;
  IF reg IS NULL THEN RETURN NULL; END IF;

  SELECT
    COALESCE(SUM(CASE WHEN payment_method='efectivo' THEN total ELSE 0 END),0),
    COALESCE(SUM(CASE WHEN payment_method='tarjeta' THEN total ELSE 0 END),0),
    COALESCE(SUM(CASE WHEN payment_method='transferencia' THEN total ELSE 0 END),0),
    COALESCE(SUM(CASE WHEN payment_method='mixto' THEN total ELSE 0 END),0),
    COUNT(*)
  INTO v_cash, v_card, v_transfer, v_mixto, v_sales_count
  FROM public.sales
  WHERE cash_register_id = _register_id AND cancelled = false;

  SELECT
    COALESCE(SUM(CASE WHEN type='entrada' AND payment_method='efectivo' THEN amount ELSE 0 END),0),
    COALESCE(SUM(CASE WHEN type='salida' AND payment_method='efectivo' THEN amount ELSE 0 END),0)
  INTO v_in, v_out
  FROM public.cash_movements
  WHERE cash_register_id = _register_id;

  RETURN json_build_object(
    'register_id', reg.id,
    'opening_amount', reg.opening_amount,
    'sales_cash', v_cash,
    'sales_card', v_card,
    'sales_transfer', v_transfer,
    'sales_mixto', v_mixto,
    'sales_total', v_cash + v_card + v_transfer + v_mixto,
    'sales_count', v_sales_count,
    'cash_in', v_in,
    'cash_out', v_out,
    'expected_cash', reg.opening_amount + v_cash + v_in - v_out
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_cash_register_summary(UUID) TO authenticated;
