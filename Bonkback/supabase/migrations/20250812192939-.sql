-- Remediate linter: avoid SECURITY DEFINER where not essential
DROP FUNCTION IF EXISTS public.get_my_wallet_activity();
CREATE FUNCTION public.get_my_wallet_activity()
RETURNS SETOF public.v_wallet_activity
LANGUAGE sql
SET search_path TO ''
AS $fn$
  SELECT * FROM public.v_wallet_activity WHERE user_id = auth.uid() ORDER BY happened_at DESC;
$fn$;

-- Replace logging to use security_audit_log and invoker security
DROP FUNCTION IF EXISTS public.log_blocked_payout(uuid, text, jsonb);
CREATE FUNCTION public.log_blocked_payout(_user_id uuid, _reason text, _details jsonb)
RETURNS void
LANGUAGE plpgsql
SET search_path TO ''
AS $function$
BEGIN
  INSERT INTO public.security_audit_log (user_id, event_type, severity, source, metadata)
  VALUES (_user_id, 'payout_blocked', 'warning', 'check_payout_eligibility', jsonb_build_object('reason', _reason) || COALESCE(_details, '{}'::jsonb));
END;
$function$;