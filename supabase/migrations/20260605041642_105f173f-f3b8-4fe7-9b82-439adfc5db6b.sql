-- Certificates table
CREATE TABLE public.certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  student_id UUID NOT NULL,
  business_id UUID NOT NULL,
  teacher_id UUID,
  certificate_number TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  hours_completed INTEGER,
  final_grade NUMERIC(4,2),
  skills TEXT[],
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  issued_by UUID NOT NULL,
  revoked_at TIMESTAMPTZ,
  revoked_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.certificates TO authenticated;
GRANT SELECT ON public.certificates TO anon;
GRANT ALL ON public.certificates TO service_role;

ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;

-- Public view by certificate number (for verification page)
CREATE POLICY "Public can view non-revoked certificates"
ON public.certificates FOR SELECT
TO anon, authenticated
USING (revoked_at IS NULL);

CREATE POLICY "Students view own certificates"
ON public.certificates FOR SELECT
TO authenticated
USING (auth.uid() = student_id);

CREATE POLICY "Business view own issued certificates"
ON public.certificates FOR SELECT
TO authenticated
USING (auth.uid() = business_id);

CREATE POLICY "Teachers and admins view all"
ON public.certificates FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'teacher') OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Business issues certificates"
ON public.certificates FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = business_id AND auth.uid() = issued_by);

CREATE POLICY "Issuer can revoke"
ON public.certificates FOR UPDATE
TO authenticated
USING (auth.uid() = issued_by OR public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (auth.uid() = issued_by OR public.has_role(auth.uid(), 'super_admin'));

CREATE TRIGGER update_certificates_updated_at
BEFORE UPDATE ON public.certificates
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Generate certificate number function
CREATE OR REPLACE FUNCTION public.generate_certificate_number()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  _num TEXT;
BEGIN
  _num := 'ZP-' || to_char(now(), 'YYYY') || '-' || upper(substring(gen_random_uuid()::text, 1, 8));
  RETURN _num;
END;
$$;