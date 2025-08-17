-- Fix Supabase authentication settings for enhanced security

-- Enable leaked password protection
UPDATE auth.config SET
  security_check_enable_password_leaks = true
WHERE true;

-- Set OTP expiry to more secure timeframe (15 minutes instead of default 1 hour)
UPDATE auth.config SET
  security_otp_expiry = 900  -- 15 minutes in seconds
WHERE true;

-- Enable additional security features
UPDATE auth.config SET
  security_refresh_token_rotation_enabled = true,
  security_manual_linking_enabled = false,  -- Prevent manual account linking
  external_email_enabled = true,
  external_phone_enabled = false,  -- Disable phone auth for now
  security_captcha_enabled = false  -- Can be enabled later if needed
WHERE true;

-- Ensure session timeout is reasonable (24 hours)
UPDATE auth.config SET
  session_timebox = 86400  -- 24 hours in seconds
WHERE true;

-- Add rate limiting configuration for auth endpoints
INSERT INTO auth.rate_limits (endpoint, requests_per_hour, created_at, updated_at)
VALUES 
  ('signup', 10, now(), now()),
  ('signin', 20, now(), now()),
  ('recovery', 5, now(), now()),
  ('confirm', 20, now(), now())
ON CONFLICT (endpoint) 
DO UPDATE SET 
  requests_per_hour = EXCLUDED.requests_per_hour,
  updated_at = now();

-- Create audit log for authentication events
CREATE TABLE IF NOT EXISTS public.auth_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  event_type text NOT NULL,
  ip_address text,
  user_agent text,
  success boolean NOT NULL DEFAULT true,
  error_message text,
  metadata jsonb DEFAULT '{}',
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on auth audit log
ALTER TABLE public.auth_audit_log ENABLE ROW LEVEL SECURITY;

-- Create policy for auth audit log (admin only)
CREATE POLICY "Admin can view auth audit logs"
ON public.auth_audit_log
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Create function to log auth events
CREATE OR REPLACE FUNCTION public.log_auth_event(
  p_user_id uuid,
  p_event_type text,
  p_ip_address text DEFAULT NULL,
  p_user_agent text DEFAULT NULL,
  p_success boolean DEFAULT true,
  p_error_message text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  INSERT INTO public.auth_audit_log (
    user_id, event_type, ip_address, user_agent, 
    success, error_message, metadata
  ) VALUES (
    p_user_id, p_event_type, p_ip_address, p_user_agent,
    p_success, p_error_message, p_metadata
  );
END;
$function$;

-- Create trigger to automatically log sign in attempts
CREATE OR REPLACE FUNCTION public.auth_event_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  -- Log successful sign-ins
  IF TG_OP = 'UPDATE' AND OLD.last_sign_in_at IS DISTINCT FROM NEW.last_sign_in_at THEN
    PERFORM public.log_auth_event(
      NEW.id,
      'sign_in',
      NEW.last_sign_in_at::text,
      NULL,
      true,
      NULL,
      jsonb_build_object('last_sign_in_at', NEW.last_sign_in_at)
    );
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Note: We cannot create triggers on auth.users as it's in a protected schema
-- This would need to be configured at the Supabase dashboard level

COMMENT ON TABLE public.auth_audit_log IS 'Audit log for authentication events and security monitoring';
COMMENT ON FUNCTION public.log_auth_event IS 'Function to log authentication events for security auditing';