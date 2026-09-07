
-- SAVED JOBS
CREATE TABLE public.saved_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, job_id)
);
GRANT SELECT, INSERT, DELETE ON public.saved_jobs TO authenticated;
GRANT ALL ON public.saved_jobs TO service_role;
ALTER TABLE public.saved_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own saved read" ON public.saved_jobs FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own saved insert" ON public.saved_jobs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own saved delete" ON public.saved_jobs FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- REVIEWS
CREATE TABLE public.reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contract_id UUID NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reviewee_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(contract_id, reviewer_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reviews TO authenticated;
GRANT ALL ON public.reviews TO service_role;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reviews read authenticated" ON public.reviews
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "reviews insert own for own contract" ON public.reviews
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = reviewer_id
    AND EXISTS (
      SELECT 1 FROM public.contracts c
      WHERE c.id = contract_id
        AND c.status = 'completed'
        AND (c.business_id = auth.uid() OR c.student_id = auth.uid())
        AND (
          (c.business_id = auth.uid() AND c.student_id = reviewee_id)
          OR (c.student_id = auth.uid() AND c.business_id = reviewee_id)
        )
    )
  );

CREATE POLICY "reviews update own" ON public.reviews
  FOR UPDATE TO authenticated USING (auth.uid() = reviewer_id);
CREATE POLICY "reviews delete own" ON public.reviews
  FOR DELETE TO authenticated USING (auth.uid() = reviewer_id);
