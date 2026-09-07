CREATE OR REPLACE FUNCTION public.generate_certificate_number()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  _num TEXT;
BEGIN
  _num := 'ZP-' || to_char(now(), 'YYYY') || '-' || upper(substring(gen_random_uuid()::text, 1, 8));
  RETURN _num;
END;
$$;