-- 1) FORCE RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;

ALTER TABLE public.role_change_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_change_audit FORCE ROW LEVEL SECURITY;

-- 2) Make policy helpers schema-qualified
DROP POLICY IF EXISTS "Users can update their own profile (except role)" ON public.profiles;
CREATE POLICY "Users can update their own profile (except role)"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = user_id AND deleted_at IS NULL)
  WITH CHECK (
    auth.uid() = user_id
    AND deleted_at IS NULL
    AND role = (SELECT p.role FROM public.profiles p WHERE p.user_id = auth.uid())
  );

-- Ensure users can still read their own profile (if not already present)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'Users can read their own profile'
  ) THEN
    CREATE POLICY "Users can read their own profile"
      ON public.profiles
      FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- Role audit table policy: schema-qualify helper
DROP POLICY IF EXISTS "Admins can manage role audit logs" ON public.role_change_audit;
CREATE POLICY "Admins can manage role audit logs"
  ON public.role_change_audit
  FOR ALL
  USING (public.get_current_user_role() = 'admin')
  WITH CHECK (public.get_current_user_role() = 'admin');

-- 3) Column-level belt-and-suspenders: non-admins cannot UPDATE role
REVOKE UPDATE (role) ON public.profiles FROM anon, authenticated;

-- 4) Optional: trigger guard to block non-admin role changes at the DB layer
CREATE OR REPLACE FUNCTION public.enforce_role_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role
     AND public.get_current_user_role() <> 'admin' THEN
    RAISE EXCEPTION 'forbidden: role changes require admin';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_role_guard ON public.profiles;
CREATE TRIGGER trg_enforce_role_guard
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.enforce_role_guard();

-- 5) Lock down the admin function's execute privileges
REVOKE ALL ON FUNCTION public.admin_change_user_role(uuid, user_role, text) FROM PUBLIC;
-- Grant execute to authenticated users (admins are authenticated)
GRANT EXECUTE ON FUNCTION public.admin_change_user_role(uuid, user_role, text) TO authenticated;

-- (Optional) Ensure trusted owners
DO $$
BEGIN
  ALTER FUNCTION public.admin_change_user_role(uuid, user_role, text) OWNER TO postgres;
  ALTER FUNCTION public.enforce_role_guard() OWNER TO postgres;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;