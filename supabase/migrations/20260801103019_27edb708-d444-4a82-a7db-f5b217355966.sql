
CREATE TABLE public.application_shortlists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  teacher_id uuid NOT NULL,
  rank integer,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (application_id, teacher_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.application_shortlists TO authenticated;
GRANT ALL ON public.application_shortlists TO service_role;
ALTER TABLE public.application_shortlists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers manage their shortlists"
ON public.application_shortlists FOR ALL TO authenticated
USING (teacher_id = auth.uid() AND public.has_role(auth.uid(), 'teacher'))
WITH CHECK (teacher_id = auth.uid() AND public.has_role(auth.uid(), 'teacher'));

CREATE POLICY "Admins manage all shortlists"
ON public.application_shortlists FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Business owner can view shortlists for own jobs"
ON public.application_shortlists FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = application_shortlists.job_id AND j.business_id = auth.uid()));

CREATE POLICY "Student can view own shortlist entries"
ON public.application_shortlists FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.applications a WHERE a.id = application_shortlists.application_id AND a.student_id = auth.uid()));

CREATE TRIGGER update_application_shortlists_updated_at
BEFORE UPDATE ON public.application_shortlists
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS teacher_id uuid,
  ADD COLUMN IF NOT EXISTS documents_ready boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS winner_confirmed_at timestamptz;

CREATE TABLE public.practice_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  student_id uuid NOT NULL,
  business_id uuid NOT NULL,
  teacher_id uuid,
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  score integer NOT NULL DEFAULT 0,
  passed boolean NOT NULL DEFAULT false,
  comment text,
  submitted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (contract_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.practice_feedback TO authenticated;
GRANT ALL ON public.practice_feedback TO service_role;
ALTER TABLE public.practice_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Business manages feedback for own contracts"
ON public.practice_feedback FOR ALL TO authenticated
USING (business_id = auth.uid())
WITH CHECK (business_id = auth.uid());

CREATE POLICY "Admins manage all feedback"
ON public.practice_feedback FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Student views own feedback"
ON public.practice_feedback FOR SELECT TO authenticated
USING (student_id = auth.uid());

CREATE POLICY "Teachers view feedback"
ON public.practice_feedback FOR SELECT TO authenticated
USING (teacher_id = auth.uid() OR public.has_role(auth.uid(), 'teacher'));

CREATE TRIGGER update_practice_feedback_updated_at
BEFORE UPDATE ON public.practice_feedback
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE OR REPLACE FUNCTION public.practice_feedback_set_passed()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.passed := NEW.score >= 7;
  RETURN NEW;
END;
$$;

CREATE TRIGGER practice_feedback_passed
BEFORE INSERT OR UPDATE ON public.practice_feedback
FOR EACH ROW EXECUTE FUNCTION public.practice_feedback_set_passed();

ALTER TABLE public.certificates
  ADD COLUMN IF NOT EXISTS teacher_id uuid,
  ADD COLUMN IF NOT EXISTS feedback_id uuid REFERENCES public.practice_feedback(id) ON DELETE SET NULL;
