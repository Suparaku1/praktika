
-- STUDENT PROFILES
CREATE TABLE public.student_profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  date_of_birth date,
  city text,
  school_name text,
  professional_program text,
  study_year int,
  bio text,
  skills text[] DEFAULT '{}',
  languages text[] DEFAULT '{}',
  experience text,
  education text,
  cv_url text,
  linkedin_url text,
  portfolio_url text,
  available_from date,
  looking_for text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_profiles TO authenticated;
GRANT ALL ON public.student_profiles TO service_role;
ALTER TABLE public.student_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students manage own profile" ON public.student_profiles
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Businesses view student profiles" ON public.student_profiles
  FOR SELECT TO authenticated USING (
    public.has_role(auth.uid(), 'business') OR
    public.has_role(auth.uid(), 'teacher') OR
    public.has_role(auth.uid(), 'super_admin')
  );

CREATE TRIGGER trg_student_profiles_updated BEFORE UPDATE ON public.student_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- BUSINESS PROFILES
CREATE TABLE public.business_profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_name text NOT NULL,
  nipt text UNIQUE,
  sector text,
  company_size text,
  city text,
  address text,
  description text,
  website text,
  logo_url text,
  contact_email text,
  contact_phone text,
  founded_year int,
  verified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_profiles TO authenticated;
GRANT SELECT ON public.business_profiles TO anon;
GRANT ALL ON public.business_profiles TO service_role;
ALTER TABLE public.business_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Businesses manage own profile" ON public.business_profiles
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Verified business profiles public read" ON public.business_profiles
  FOR SELECT TO anon, authenticated USING (verified = true);
CREATE POLICY "Admins view all business profiles" ON public.business_profiles
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'super_admin'));

CREATE TRIGGER trg_business_profiles_updated BEFORE UPDATE ON public.business_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- TEACHER PROFILES
CREATE TABLE public.teacher_profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  school_name text,
  subject text,
  professional_programs text[] DEFAULT '{}',
  years_experience int,
  work_phone text,
  bio text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.teacher_profiles TO authenticated;
GRANT ALL ON public.teacher_profiles TO service_role;
ALTER TABLE public.teacher_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers manage own profile" ON public.teacher_profiles
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Authenticated read teacher profiles" ON public.teacher_profiles
  FOR SELECT TO authenticated USING (true);

CREATE TRIGGER trg_teacher_profiles_updated BEFORE UPDATE ON public.teacher_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- STORAGE BUCKETS will be created via tool after migration
