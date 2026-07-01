DROP POLICY IF EXISTS "Anyone can view receipts" ON storage.objects;
CREATE POLICY "Authenticated can view receipts" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'receipts');