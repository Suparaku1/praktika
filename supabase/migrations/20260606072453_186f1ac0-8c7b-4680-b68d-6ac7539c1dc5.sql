
-- Allow super_admins to manage user_roles
CREATE POLICY "Super admins manage roles INSERT" ON public.user_roles
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Super admins manage roles DELETE" ON public.user_roles
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'super_admin'));

-- Allow super_admins to update business_profiles (e.g., verify)
CREATE POLICY "Super admins update business profiles" ON public.business_profiles
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- Allow super_admins to view all jobs (regardless of status) and update them
CREATE POLICY "Super admins view all jobs" ON public.jobs
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Super admins update any job" ON public.jobs
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Super admins delete any job" ON public.jobs
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'super_admin'));

-- Admin RPC: set a user's role (replaces existing roles for that user)
CREATE OR REPLACE FUNCTION public.admin_set_user_role(_user_id uuid, _role public.app_role)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'super_admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  DELETE FROM public.user_roles WHERE user_id = _user_id;
  INSERT INTO public.user_roles (user_id, role) VALUES (_user_id, _role);
END;
$$;

-- Admin RPC: list all users with profile + role info
CREATE OR REPLACE FUNCTION public.admin_list_users()
RETURNS TABLE (
  id uuid,
  email text,
  full_name text,
  organization text,
  created_at timestamptz,
  role public.app_role,
  business_verified boolean
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'super_admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  RETURN QUERY
  SELECT p.id, p.email, p.full_name, p.organization, p.created_at,
         (SELECT ur.role FROM public.user_roles ur WHERE ur.user_id = p.id ORDER BY
            CASE ur.role WHEN 'super_admin' THEN 1 WHEN 'teacher' THEN 2 WHEN 'business' THEN 3 ELSE 4 END
            LIMIT 1) AS role,
         (SELECT bp.verified FROM public.business_profiles bp WHERE bp.user_id = p.id) AS business_verified
  FROM public.profiles p
  ORDER BY p.created_at DESC;
END;
$$;

-- Admin RPC: platform-wide stats
CREATE OR REPLACE FUNCTION public.admin_platform_stats()
RETURNS TABLE (
  total_users bigint,
  total_students bigint,
  total_businesses bigint,
  total_teachers bigint,
  total_jobs bigint,
  published_jobs bigint,
  total_applications bigint,
  total_contracts bigint,
  total_certificates bigint,
  unverified_businesses bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'super_admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  RETURN QUERY SELECT
    (SELECT count(*) FROM public.profiles),
    (SELECT count(*) FROM public.user_roles WHERE role = 'student'),
    (SELECT count(*) FROM public.user_roles WHERE role = 'business'),
    (SELECT count(*) FROM public.user_roles WHERE role = 'teacher'),
    (SELECT count(*) FROM public.jobs),
    (SELECT count(*) FROM public.jobs WHERE status = 'published'),
    (SELECT count(*) FROM public.applications),
    (SELECT count(*) FROM public.contracts),
    (SELECT count(*) FROM public.certificates),
    (SELECT count(*) FROM public.business_profiles WHERE verified = false);
END;
$$;
