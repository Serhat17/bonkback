-- Enable required extension for digest()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Name the unique constraints explicitly so we can target them in ON CONFLICT
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'uq_reftrack_tracked_user_code'
  ) THEN
    ALTER TABLE public.referral_tracking
      ADD CONSTRAINT uq_reftrack_tracked_user_code
      UNIQUE (tracked_user_id, referral_code);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'uq_reftrack_fingerprint_code'
  ) THEN
    ALTER TABLE public.referral_tracking
      ADD CONSTRAINT uq_reftrack_fingerprint_code
      UNIQUE (device_fingerprint, referral_code);
  END IF;
END $$;

-- RLS: be strict and explicit
ALTER TABLE public.referral_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_tracking FORCE ROW LEVEL SECURITY;

-- Drop any loose policies created earlier
DROP POLICY IF EXISTS "Users can insert referral tracking" ON public.referral_tracking;
DROP POLICY IF EXISTS "Users can view their own referral tracking" ON public.referral_tracking;
DROP POLICY IF EXISTS "System can update referral tracking" ON public.referral_tracking;
DROP POLICY IF EXISTS "Admins can manage all referral tracking" ON public.referral_tracking;

-- INSERT: allow both anon + authenticated (so pre-signup tracking works)
CREATE POLICY "reftrack_insert_public"
ON public.referral_tracking
FOR INSERT
TO public
WITH CHECK (true);

-- SELECT: only see your related rows OR admins
CREATE POLICY "reftrack_select_scoped"
ON public.referral_tracking
FOR SELECT
TO authenticated
USING (
  auth.uid() = referrer_id
  OR auth.uid() = tracked_user_id
  OR auth.uid() = converted_user_id
  OR public.get_current_user_role() = 'admin'
);

-- UPDATE: server-only via service role (clients shouldn't update these rows)
CREATE POLICY "reftrack_update_service"
ON public.referral_tracking
FOR UPDATE
TO service_role
USING (true)
WITH CHECK (true);

-- (Optional) DELETE: admins only
CREATE POLICY "reftrack_delete_admin"
ON public.referral_tracking
FOR DELETE
TO authenticated
USING (public.get_current_user_role() = 'admin');

-- Keep updated_at fresh (assumes you have public.update_updated_at_column())
DROP TRIGGER IF EXISTS trg_reftrack_updated_at ON public.referral_tracking;
CREATE TRIGGER trg_reftrack_updated_at
BEFORE UPDATE ON public.referral_tracking
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- security_audit_log should allow inserts from anon/auth (or at least authenticated)
ALTER TABLE public.security_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_audit_log FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_insert_public" ON public.security_audit_log;
DROP POLICY IF EXISTS "audit_select_admin" ON public.security_audit_log;

CREATE POLICY "audit_insert_public"
ON public.security_audit_log
FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "audit_select_admin"
ON public.security_audit_log
FOR SELECT
TO authenticated
USING (public.get_current_user_role() = 'admin');

-- Fix track_referral_visit upsert logic (no expression in conflict target)
CREATE OR REPLACE FUNCTION public.track_referral_visit(
  p_referral_code      text,
  p_device_fingerprint text DEFAULT NULL,
  p_ip_address         text DEFAULT NULL,
  p_user_agent         text DEFAULT NULL,
  p_session_id         text DEFAULT NULL,
  p_utm_params         jsonb DEFAULT '{}',
  p_landing_page       text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_referrer_id        uuid;
  v_current_user_id    uuid := auth.uid();
  v_tracking_id        uuid;
  v_device_fingerprint text;
  v_ip_inet            inet;
BEGIN
  SELECT user_id INTO v_referrer_id
  FROM public.profiles
  WHERE referral_code = p_referral_code AND deleted_at IS NULL;

  IF v_referrer_id IS NULL THEN
    INSERT INTO public.security_audit_log (event_type,severity,source,metadata)
    VALUES ('referral_invalid_code','warning','track_referral_visit',
            jsonb_build_object('referral_code',p_referral_code,'ua',p_user_agent));
    RETURN jsonb_build_object('success',false,'error','Invalid referral code');
  END IF;

  IF v_current_user_id = v_referrer_id THEN
    INSERT INTO public.security_audit_log (user_id,event_type,severity,source,metadata)
    VALUES (v_current_user_id,'referral_self_attempt','warning','track_referral_visit',
            jsonb_build_object('referral_code',p_referral_code,'referrer_id',v_referrer_id));
    RETURN jsonb_build_object('success',false,'error','Self-referrals not allowed');
  END IF;

  -- derive fingerprint server-side if not provided
  v_device_fingerprint := COALESCE(
    p_device_fingerprint,
    encode(digest(COALESCE(p_ip_address,'')||'|'||COALESCE(p_user_agent,''),'sha256'),'hex')
  );

  -- safe inet cast
  v_ip_inet := NULLIF(p_ip_address,'')::inet;

  IF v_current_user_id IS NOT NULL THEN
    -- logged-in path: upsert by (tracked_user_id, referral_code)
    INSERT INTO public.referral_tracking(
      referral_code, referrer_id, device_fingerprint, ip_address, user_agent,
      session_id, tracked_user_id, utm_params, landing_page
    )
    VALUES (
      p_referral_code, v_referrer_id, v_device_fingerprint, v_ip_inet, p_user_agent,
      p_session_id, v_current_user_id, p_utm_params, p_landing_page
    )
    ON CONFLICT ON CONSTRAINT uq_reftrack_tracked_user_code
    DO UPDATE SET
      updated_at   = now(),
      expires_at   = now() + interval '90 days',
      device_fingerprint = EXCLUDED.device_fingerprint,
      ip_address   = EXCLUDED.ip_address,
      user_agent   = EXCLUDED.user_agent,
      session_id   = EXCLUDED.session_id,
      utm_params   = EXCLUDED.utm_params,
      landing_page = EXCLUDED.landing_page
    RETURNING id INTO v_tracking_id;
  ELSE
    -- anonymous path: upsert by (device_fingerprint, referral_code)
    INSERT INTO public.referral_tracking(
      referral_code, referrer_id, device_fingerprint, ip_address, user_agent,
      session_id, tracked_user_id, utm_params, landing_page
    )
    VALUES (
      p_referral_code, v_referrer_id, v_device_fingerprint, v_ip_inet, p_user_agent,
      p_session_id, NULL, p_utm_params, p_landing_page
    )
    ON CONFLICT ON CONSTRAINT uq_reftrack_fingerprint_code
    DO UPDATE SET
      updated_at   = now(),
      expires_at   = now() + interval '90 days',
      tracked_user_id = COALESCE(EXCLUDED.tracked_user_id, referral_tracking.tracked_user_id),
      ip_address   = EXCLUDED.ip_address,
      user_agent   = EXCLUDED.user_agent,
      session_id   = EXCLUDED.session_id,
      utm_params   = EXCLUDED.utm_params,
      landing_page = EXCLUDED.landing_page
    RETURNING id INTO v_tracking_id;
  END IF;

  INSERT INTO public.security_audit_log (user_id,event_type,severity,source,metadata)
  VALUES (v_current_user_id,'referral_tracked','info','track_referral_visit',
          jsonb_build_object('tracking_id',v_tracking_id,'code',p_referral_code,
                             'referrer_id',v_referrer_id,'dfp',v_device_fingerprint,
                             'logged_in', v_current_user_id IS NOT NULL));

  RETURN jsonb_build_object('success',true,'tracking_id',v_tracking_id,'message','Referral tracked');

EXCEPTION WHEN OTHERS THEN
  INSERT INTO public.error_logs (user_id,error_message,severity,component,stack_trace,additional_data)
  VALUES (v_current_user_id,'track_referral_visit failed: '||SQLERRM,'error','track_referral_visit',
          SQLSTATE, jsonb_build_object('code',p_referral_code,'dfp',v_device_fingerprint));
  RETURN jsonb_build_object('success',false,'error','Tracking failed: '||SQLERRM);
END;
$$;

-- Allow RPC execution where needed
REVOKE ALL ON FUNCTION public.track_referral_visit(text,text,text,text,text,jsonb,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.track_referral_visit(text,text,text,text,text,jsonb,text) TO anon, authenticated;