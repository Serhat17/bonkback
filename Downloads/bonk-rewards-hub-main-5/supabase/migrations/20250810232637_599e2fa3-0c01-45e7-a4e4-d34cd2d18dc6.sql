-- Make referrer claim processor always attempt processing and clean self-ref anomalies
CREATE OR REPLACE FUNCTION public.process_my_unclaimed_referrals()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  me uuid := auth.uid();
  r record;
  attempted int := 0;
BEGIN
  IF me IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'not authenticated');
  END IF;

  -- Cleanup: fix accidental self-refer entries on the referrer's own profile
  UPDATE public.profiles
  SET referred_by = NULL, updated_at = now()
  WHERE user_id = me AND referred_by = me;

  FOR r IN
    SELECT referred_id
    FROM public.referrals
    WHERE referrer_id = me AND NOT reward_claimed
  LOOP
    PERFORM public.process_referral_reward(r.referred_id);
    attempted := attempted + 1;
  END LOOP;

  RETURN json_build_object('success', true, 'processed', attempted);
END;
$function$;