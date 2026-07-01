
-- Expenses: restrict to admin/supervisor, or the creator (user_id)
DROP POLICY IF EXISTS "Authenticated can read expenses" ON public.expenses;
DROP POLICY IF EXISTS "Authenticated can insert expenses" ON public.expenses;
DROP POLICY IF EXISTS "Authenticated can update expenses" ON public.expenses;
DROP POLICY IF EXISTS "Authenticated can delete expenses" ON public.expenses;

CREATE POLICY "expenses_select_admin_supervisor_or_owner" ON public.expenses
FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'supervisor'::app_role) OR user_id = auth.uid());

CREATE POLICY "expenses_insert_authenticated_own" ON public.expenses
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "expenses_update_admin_supervisor" ON public.expenses
FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'supervisor'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'supervisor'::app_role));

CREATE POLICY "expenses_delete_admin" ON public.expenses
FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Customers: enforce created_by = auth.uid() on insert
DROP POLICY IF EXISTS "customers_insert_authenticated" ON public.customers;
CREATE POLICY "customers_insert_own" ON public.customers
FOR INSERT TO authenticated
WITH CHECK (created_by = auth.uid());

-- Receipts bucket: ownership via first path segment = user id (uploads placed under `${auth.uid()}/...`)
DROP POLICY IF EXISTS "Authenticated can view receipts" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can upload receipts" ON storage.objects;

CREATE POLICY "receipts_select_owner_or_admin" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'receipts'
  AND (
    owner = auth.uid()
    OR (storage.foldername(name))[1] = auth.uid()::text
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'supervisor'::app_role)
  )
);

CREATE POLICY "receipts_insert_own_folder" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'receipts'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "receipts_delete_owner_or_admin" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'receipts'
  AND (
    owner = auth.uid()
    OR (storage.foldername(name))[1] = auth.uid()::text
    OR has_role(auth.uid(), 'admin'::app_role)
  )
);
