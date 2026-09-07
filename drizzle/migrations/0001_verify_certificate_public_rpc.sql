CREATE OR REPLACE FUNCTION public.verify_certificate(_number text)
RETURNS TABLE(
  certificate_number text,
  title text,
  description text,
  student_name text,
  company_name text,
  teacher_name text,
  hours_completed integer,
  final_grade numeric,
  skills text[],
  issued_at timestamptz,
  revoked_at timestamptz,
  revoked_reason text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.certificate_number,
         c.title,
         c.description,
         COALESCE(sp.full_name, 'Nxënës'),
         COALESCE(bp.company_name, bpr.organization, bpr.full_name, '—'),
         tp.full_name,
         c.hours_completed,
         c.final_grade,
         c.skills,
         c.issued_at,
         c.revoked_at,
         c.revoked_reason
  FROM public.certificates c
  LEFT JOIN public.profiles sp ON sp.id = c.student_id
  LEFT JOIN public.profiles bpr ON bpr.id = c.business_id
  LEFT JOIN public.business_profiles bp ON bp.user_id = c.business_id
  LEFT JOIN public.profiles tp ON tp.id = c.teacher_id
  WHERE upper(c.certificate_number) = upper(_number)
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.verify_certificate(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_certificate(text) TO anon, authenticated, service_role;