-- 0) Ensure key is unique (or PK)
ALTER TABLE public.system_config
  ADD CONSTRAINT system_config_key_unique UNIQUE (key);

-- 1) Single UPSERT (as you had)
INSERT INTO public.system_config (key, value, description, updated_at)
VALUES ('base_domain', to_jsonb('https://bonkback.com'::text), 'Base domain for referral links and redirects', now())
ON CONFLICT (key) DO UPDATE
SET value = EXCLUDED.value,
    updated_at = now();

-- 2) RLS (enforce!) 
ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_config FORCE ROW LEVEL SECURITY;

-- 3) Policies: replace with scoped ones
DROP POLICY IF EXISTS "admin_manage_system_config" ON public.system_config;
DROP POLICY IF EXISTS "read_system_config" ON public.system_config;

-- Admins: can manage ONLY the base_domain row
CREATE POLICY "admin_manage_base_domain"
  ON public.system_config
  FOR ALL
  USING (public.get_current_user_role() = 'admin' AND key = 'base_domain')
  WITH CHECK (public.get_current_user_role() = 'admin' AND key = 'base_domain');

-- Everyone: read ONLY the base_domain row
CREATE POLICY "read_base_domain"
  ON public.system_config
  FOR SELECT
  USING (key = 'base_domain');