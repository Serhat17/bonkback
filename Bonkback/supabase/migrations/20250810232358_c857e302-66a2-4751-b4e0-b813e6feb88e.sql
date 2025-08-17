-- Add a secure RPC to process only the current user's unclaimed referrals
CREATE OR REPLACE FUNCTION public.process_my_unclaimed_referrals()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  me uuid := auth.uid();
  r record;
  processed int := 0;
BEGIN
  IF me IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'not authenticated');
  END IF;

  FOR r IN
    SELECT referred_id
    FROM public.referrals
    WHERE referrer_id = me AND NOT reward_claimed
  LOOP
    -- Validate referred user's profile links back to current user and avoid self-ref anomalies
    IF EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = r.referred_id
        AND p.deleted_at IS NULL
        AND p.referred_by = me
        AND p.referred_by <> r.referred_id
    ) THEN
      PERFORM public.process_referral_reward(r.referred_id);
      processed := processed + 1;
    END IF;
  END LOOP;

  RETURN json_build_object('success', true, 'processed', processed);
END;
$function$;