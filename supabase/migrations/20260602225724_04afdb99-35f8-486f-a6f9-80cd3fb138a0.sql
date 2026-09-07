
-- CVs: user folder = auth.uid()
CREATE POLICY "Users manage own CV files" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'cvs' AND auth.uid()::text = (storage.foldername(name))[1])
  WITH CHECK (bucket_id = 'cvs' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Privileged roles read CVs" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'cvs' AND (
      public.has_role(auth.uid(), 'business') OR
      public.has_role(auth.uid(), 'teacher') OR
      public.has_role(auth.uid(), 'super_admin')
    )
  );

-- Avatars
CREATE POLICY "Users manage own avatar" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1])
  WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Authenticated read avatars" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'avatars');

-- Logos
CREATE POLICY "Users manage own logo" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'logos' AND auth.uid()::text = (storage.foldername(name))[1])
  WITH CHECK (bucket_id = 'logos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Authenticated read logos" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'logos');
