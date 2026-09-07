CREATE POLICY "Teachers can view profiles" ON public.profiles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'teacher'));

CREATE POLICY "Businesses view applicant profiles" ON public.profiles FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.applications a
    JOIN public.jobs j ON j.id = a.job_id
    WHERE a.student_id = profiles.id AND j.business_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.contracts c
    WHERE c.student_id = profiles.id AND c.business_id = auth.uid()
  )
);