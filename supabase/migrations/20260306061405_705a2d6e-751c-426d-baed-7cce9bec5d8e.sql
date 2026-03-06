
DROP POLICY IF EXISTS "Empresas can upload business images" ON storage.objects;

CREATE POLICY "Empresas can upload business images" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'business-images'
    AND public.has_role(auth.uid(), 'EMPRESA'::app_role)
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
