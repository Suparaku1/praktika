CREATE POLICY "Teachers update assigned contracts" ON public.contracts FOR UPDATE TO authenticated USING (teacher_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin')) WITH CHECK (teacher_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Teachers view contract docs" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'contract-documents' AND EXISTS (SELECT 1 FROM public.contracts c WHERE c.id::text = (storage.foldername(name))[1] AND (c.teacher_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'))));

CREATE POLICY "Teachers upload contract docs" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'contract-documents' AND EXISTS (SELECT 1 FROM public.contracts c WHERE c.id::text = (storage.foldername(name))[1] AND (c.teacher_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'))));

CREATE POLICY "Teachers delete contract docs" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'contract-documents' AND EXISTS (SELECT 1 FROM public.contracts c WHERE c.id::text = (storage.foldername(name))[1] AND (c.teacher_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'))));