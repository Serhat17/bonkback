-- Final auth system touches: trigger, permissions, role function, constraints

-- 1) Recreate auth trigger (ensures profile creation on signup)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2) Grant proper function permissions
REVOKE ALL ON FUNCTION public.generate_referral_code() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.generate_referral_code() TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;

-- 3) Ensure admin role checker function exists
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE(
    (SELECT role::text FROM public.profiles WHERE user_id = auth.uid()), 
    'user'
  );
$$;

-- 4) Enforce NOT NULL constraint on user_id (stricter inserts)
ALTER TABLE public.profiles
  ALTER COLUMN user_id SET NOT NULL;

-- 5) Grant execute on role function
GRANT EXECUTE ON FUNCTION public.get_current_user_role() TO authenticated, service_role;