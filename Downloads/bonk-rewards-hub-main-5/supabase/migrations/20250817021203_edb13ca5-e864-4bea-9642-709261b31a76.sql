-- Final polish for referral system reliability

-- 1. Ensure the trigger helper function exists
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

-- 2. Set trusted ownership on the RPC function
DO $$
BEGIN
  ALTER FUNCTION public.track_referral_visit(
    text,text,text,text,text,jsonb,text
  ) OWNER TO postgres;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- 3. Ensure error_logs accepts inserts from anon users (for pre-auth tracking errors)
ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.error_logs FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "error_logs_insert_public" ON public.error_logs;
DROP POLICY IF EXISTS "error_logs_select_admin" ON public.error_logs;

CREATE POLICY "error_logs_insert_public"
ON public.error_logs
FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "error_logs_select_admin"
ON public.error_logs
FOR SELECT
TO authenticated
USING (public.get_current_user_role() = 'admin');

-- 4. Performance indexes for analytics
CREATE INDEX IF NOT EXISTS idx_reftrack_referrer ON public.referral_tracking(referrer_id);
CREATE INDEX IF NOT EXISTS idx_reftrack_created ON public.referral_tracking(created_at);
CREATE INDEX IF NOT EXISTS idx_reftrack_expires ON public.referral_tracking(expires_at);
CREATE INDEX IF NOT EXISTS idx_reftrack_converted ON public.referral_tracking(converted_user_id) WHERE converted_user_id IS NOT NULL;

-- 5. Index for security audit log queries
CREATE INDEX IF NOT EXISTS idx_security_audit_timestamp ON public.security_audit_log(timestamp);
CREATE INDEX IF NOT EXISTS idx_security_audit_user_event ON public.security_audit_log(user_id, event_type);