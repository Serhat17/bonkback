-- Secure profiles_secure depending on object type (table vs view)
DO $$
DECLARE
  v_relkind "char";
BEGIN
  SELECT c.relkind
  INTO v_relkind
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relname = 'profiles_secure';

  -- If it's a regular table ('r'), enable RLS and add strict policies
  IF v_relkind = 'r' THEN
    -- Enable RLS
    EXECUTE 'ALTER TABLE public.profiles_secure ENABLE ROW LEVEL SECURITY';

    -- Create admin manage-all policy if missing
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = 'public' AND tablename = 'profiles_secure' AND policyname = 'Admins manage profiles_secure'
    ) THEN
      EXECUTE $$CREATE POLICY "Admins manage profiles_secure"
      ON public.profiles_secure
      FOR ALL
      USING (public.get_current_user_role() = 'admin')
      WITH CHECK (public.get_current_user_role() = 'admin')$$;
    END IF;

    -- Users can view their own row
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = 'public' AND tablename = 'profiles_secure' AND policyname = 'Users view own profiles_secure'
    ) THEN
      EXECUTE $$CREATE POLICY "Users view own profiles_secure"
      ON public.profiles_secure
      FOR SELECT
      USING (auth.uid() = user_id)$$;
    END IF;

    -- Users can update their own row
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = 'public' AND tablename = 'profiles_secure' AND policyname = 'Users update own profiles_secure'
    ) THEN
      EXECUTE $$CREATE POLICY "Users update own profiles_secure"
      ON public.profiles_secure
      FOR UPDATE
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id)$$;
    END IF;

    -- Users can insert their own row
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = 'public' AND tablename = 'profiles_secure' AND policyname = 'Users insert own profiles_secure'
    ) THEN
      EXECUTE $$CREATE POLICY "Users insert own profiles_secure"
      ON public.profiles_secure
      FOR INSERT
      WITH CHECK (auth.uid() = user_id)$$;
    END IF;

  ELSIF v_relkind = 'v' THEN
    -- If it's a view, ensure invoker security and barrier so underlying table RLS applies
    EXECUTE 'ALTER VIEW public.profiles_secure SET (security_invoker = true, security_barrier = true)';
  END IF;
END$$;

-- Tighten grants for either case (table or view)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relname='profiles_secure'
  ) THEN
    EXECUTE 'REVOKE ALL ON TABLE public.profiles_secure FROM PUBLIC';
    -- Allow authenticated role to select; underlying RLS (or view + underlying RLS) will restrict rows
    EXECUTE 'GRANT SELECT ON TABLE public.profiles_secure TO authenticated';
  END IF;
END$$;

-- Document the intent
COMMENT ON TABLE public.profiles_secure IS 'Holds/represents sensitive profile data. If table: RLS enforced (owner-only + admin). If view: security_invoker=true so underlying profiles RLS applies.';