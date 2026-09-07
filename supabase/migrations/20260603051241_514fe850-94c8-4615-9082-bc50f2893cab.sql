-- Enums
CREATE TYPE public.job_type AS ENUM ('internship', 'full_time', 'part_time', 'apprenticeship');
CREATE TYPE public.work_mode AS ENUM ('onsite', 'remote', 'hybrid');
CREATE TYPE public.job_status AS ENUM ('draft', 'published', 'closed');
CREATE TYPE public.application_status AS ENUM ('pending', 'reviewing', 'accepted', 'rejected', 'withdrawn');

-- Jobs table
CREATE TABLE public.jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  job_type public.job_type NOT NULL DEFAULT 'internship',
  work_mode public.work_mode NOT NULL DEFAULT 'onsite',
  category TEXT,
  city TEXT,
  requirements TEXT,
  benefits TEXT,
  skills TEXT[] DEFAULT '{}',
  salary_min NUMERIC,
  salary_max NUMERIC,
  salary_currency TEXT DEFAULT 'ALL',
  positions INTEGER NOT NULL DEFAULT 1,
  deadline DATE,
  status public.job_status NOT NULL DEFAULT 'draft',
  views_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.jobs TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.jobs TO authenticated;
GRANT ALL ON public.jobs TO service_role;

ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view published jobs"
  ON public.jobs FOR SELECT
  USING (status = 'published');

CREATE POLICY "Businesses manage own jobs"
  ON public.jobs FOR ALL
  TO authenticated
  USING (auth.uid() = business_id)
  WITH CHECK (auth.uid() = business_id);

CREATE POLICY "Teachers and admins view all jobs"
  ON public.jobs FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'teacher') OR has_role(auth.uid(), 'super_admin'));

CREATE TRIGGER trg_jobs_updated_at
  BEFORE UPDATE ON public.jobs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE INDEX idx_jobs_status ON public.jobs(status);
CREATE INDEX idx_jobs_business ON public.jobs(business_id);
CREATE INDEX idx_jobs_created ON public.jobs(created_at DESC);

-- Applications table
CREATE TABLE public.applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cover_letter TEXT,
  status public.application_status NOT NULL DEFAULT 'pending',
  business_notes TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (job_id, student_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.applications TO authenticated;
GRANT ALL ON public.applications TO service_role;

ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students view own applications"
  ON public.applications FOR SELECT
  TO authenticated
  USING (auth.uid() = student_id);

CREATE POLICY "Students create own applications"
  ON public.applications FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = student_id AND has_role(auth.uid(), 'student'));

CREATE POLICY "Students update own applications"
  ON public.applications FOR UPDATE
  TO authenticated
  USING (auth.uid() = student_id)
  WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Businesses view applications to their jobs"
  ON public.applications FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = job_id AND j.business_id = auth.uid()));

CREATE POLICY "Businesses update applications to their jobs"
  ON public.applications FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = job_id AND j.business_id = auth.uid()));

CREATE POLICY "Teachers and admins view all applications"
  ON public.applications FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'teacher') OR has_role(auth.uid(), 'super_admin'));

CREATE TRIGGER trg_applications_updated_at
  BEFORE UPDATE ON public.applications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE INDEX idx_applications_job ON public.applications(job_id);
CREATE INDEX idx_applications_student ON public.applications(student_id);
CREATE INDEX idx_applications_status ON public.applications(status);