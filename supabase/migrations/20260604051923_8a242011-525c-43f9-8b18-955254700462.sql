
CREATE OR REPLACE FUNCTION public.find_student_by_email(_email TEXT)
RETURNS TABLE (id UUID, full_name TEXT, email TEXT)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'teacher') AND NOT public.has_role(auth.uid(), 'super_admin') THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;

  RETURN QUERY
  SELECT p.id, p.full_name, p.email
  FROM public.profiles p
  JOIN public.user_roles ur ON ur.user_id = p.id AND ur.role = 'student'
  WHERE lower(p.email) = lower(_email)
  LIMIT 1;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.find_student_by_email(TEXT) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.find_student_by_email(TEXT) TO authenticated;
