-- Fix linter 0010: ensure views use invoker security so caller RLS applies
-- Apply to profiles_secure (currently created with security_barrier only)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_views 
    WHERE schemaname = 'public' AND viewname = 'profiles_secure'
  ) THEN
    -- Set both security_invoker and (re)set security_barrier for clarity
    EXECUTE 'ALTER VIEW public.profiles_secure SET (security_invoker = true, security_barrier = true)';
  END IF;
END$$;

-- Keep strict grants
REVOKE ALL ON TABLE public.profiles_secure FROM PUBLIC;
GRANT SELECT ON TABLE public.profiles_secure TO authenticated;

-- Optional: document intent
COMMENT ON VIEW public.profiles_secure IS 'Secured view with security_invoker=true and security_barrier=true; RLS enforced based on querying user.';