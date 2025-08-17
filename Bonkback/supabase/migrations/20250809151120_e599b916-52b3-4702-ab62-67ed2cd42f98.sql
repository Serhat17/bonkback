-- Create auth audit log for authentication events and security monitoring
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

-- Create session timeout tracking table
CREATE TABLE IF NOT EXISTS public.session_timeouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  session_started_at timestamp with time zone DEFAULT now(),
  last_activity_at timestamp with time zone DEFAULT now(),
  timeout_minutes integer DEFAULT 120,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on session timeouts
ALTER TABLE public.session_timeouts ENABLE ROW LEVEL SECURITY;

-- Create policies for session timeouts
CREATE POLICY "Users can manage their own sessions"
ON public.session_timeouts
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all sessions"
ON public.session_timeouts
FOR SELECT
USING (get_current_user_role() = 'admin');

-- Function to update session activity
CREATE OR REPLACE FUNCTION public.update_session_activity(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  UPDATE public.session_timeouts
  SET 
    last_activity_at = now(),
    updated_at = now()
  WHERE user_id = p_user_id AND is_active = true;
  
  -- If no active session exists, create one
  IF NOT FOUND THEN
    INSERT INTO public.session_timeouts (user_id, session_started_at, last_activity_at)
    VALUES (p_user_id, now(), now())
    ON CONFLICT DO NOTHING;
  END IF;
END;
$function$;

-- Function to check session timeout
CREATE OR REPLACE FUNCTION public.check_session_timeout(p_user_id uuid, p_timeout_minutes integer DEFAULT 120)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  last_activity timestamp with time zone;
  is_expired boolean := false;
BEGIN
  SELECT last_activity_at INTO last_activity
  FROM public.session_timeouts
  WHERE user_id = p_user_id AND is_active = true
  ORDER BY last_activity_at DESC
  LIMIT 1;
  
  IF last_activity IS NULL THEN
    RETURN false; -- No session found
  END IF;
  
  -- Check if session has expired
  IF last_activity < (now() - interval '1 minute' * p_timeout_minutes) THEN
    -- Mark session as inactive
    UPDATE public.session_timeouts
    SET is_active = false, updated_at = now()
    WHERE user_id = p_user_id AND is_active = true;
    
    is_expired := true;
  END IF;
  
  RETURN is_expired;
END;
$function$;

-- Create trigger to automatically update timestamps
CREATE OR REPLACE FUNCTION public.update_session_timeouts_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO ''
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE TRIGGER update_session_timeouts_updated_at
  BEFORE UPDATE ON public.session_timeouts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_session_timeouts_updated_at();

COMMENT ON TABLE public.auth_audit_log IS 'Audit log for authentication events and security monitoring';
COMMENT ON TABLE public.session_timeouts IS 'Tracks user session activity and timeouts for enhanced security';
COMMENT ON FUNCTION public.log_auth_event IS 'Function to log authentication events for security auditing';
COMMENT ON FUNCTION public.update_session_activity IS 'Updates last activity timestamp for user session tracking';
COMMENT ON FUNCTION public.check_session_timeout IS 'Checks if user session has timed out and marks it inactive';