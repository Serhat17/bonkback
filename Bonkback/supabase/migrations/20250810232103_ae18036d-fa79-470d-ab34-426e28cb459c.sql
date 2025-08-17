-- Fix referral RPC overloading: remove zero-arg variant and keep single robust version with optional code
-- 1) Drop the ambiguous zero-argument function to avoid RPC conflicts
DROP FUNCTION IF EXISTS public.claim_my_referral();

-- 2) Ensure the single canonical function exists (accepts optional referral code and returns JSON)
CREATE OR REPLACE FUNCTION public.claim_my_referral(p_referral_code text DEFAULT NULL::text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  me uuid := auth.uid();
  v_referrer_id uuid;
BEGIN
  IF me IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'not authenticated');
  END IF;

  -- If a referral code is provided, resolve referrer and set referred_by if empty
  IF p_referral_code IS NOT NULL AND length(trim(p_referral_code)) > 0 THEN
    SELECT p.user_id
    INTO v_referrer_id
    FROM public.profiles p
    WHERE upper(p.referral_code) = upper(trim(p_referral_code))
    LIMIT 1;

    -- Prevent self-referral
    IF v_referrer_id = me THEN
      v_referrer_id := NULL;
    END IF;

    -- Set referred_by only if not already set
    IF v_referrer_id IS NOT NULL THEN
      UPDATE public.profiles
      SET referred_by = v_referrer_id, updated_at = now()
      WHERE user_id = me AND referred_by IS NULL AND deleted_at IS NULL;
    END IF;
  END IF;

  -- Fallback: read referred_by from the current profile
  IF v_referrer_id IS NULL THEN
    SELECT referred_by INTO v_referrer_id
    FROM public.profiles
    WHERE user_id = me AND deleted_at IS NULL;
  END IF;

  -- Validate referrer
  IF v_referrer_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'No valid referrer found');
  END IF;
  IF v_referrer_id = me THEN
    RETURN json_build_object('success', false, 'error', 'Self-referrals are not allowed');
  END IF;

  -- Process the referral reward (idempotent in underlying logic)
  PERFORM public.process_referral_reward(me);

  RETURN json_build_object('success', true, 'message', 'Referral processed successfully');

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', 'claim_my_referral failed: ' || SQLERRM);
END;
$function$;