
CREATE POLICY "menus_admin_objects_all"
ON storage.objects
FOR ALL TO authenticated
USING (bucket_id = 'menus' AND public.has_role(auth.uid(), 'admin'))
WITH CHECK (bucket_id = 'menus' AND public.has_role(auth.uid(), 'admin'));
