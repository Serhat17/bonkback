-- Debug and fix the existing referral rewards issue

-- First, let's see what's in referral_payouts and fix the threshold issue
UPDATE public.referral_payouts 
SET required_threshold = CASE 
  WHEN beneficiary_id != referred_user_id THEN 15.00  -- referrer gets 15.00 threshold
  ELSE 0                                             -- referred user gets 0 threshold (unlocked)
END,
updated_at = now()
WHERE required_threshold > 100; -- Fix any unreasonably high thresholds

-- Force unlock payouts for users who have met the corrected threshold
UPDATE public.referral_payouts
SET status = 'unlocked', 
    unlocked_at = now(), 
    updated_at = now()
WHERE status = 'locked' 
  AND beneficiary_id IN (
    SELECT user_id FROM public.profiles 
    WHERE COALESCE(total_earned, 0) >= required_threshold
  );

-- Create a manual referral crediting function for testing
CREATE OR REPLACE FUNCTION public.manual_credit_referral_test(
  p_referrer_code text,
  p_referred_user_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_referrer_id uuid;
  v_current_user_id uuid := COALESCE(p_referred_user_id, auth.uid());
  result jsonb;
BEGIN
  IF v_current_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No user specified');
  END IF;

  -- Find referrer
  SELECT user_id INTO v_referrer_id
  FROM public.profiles
  WHERE referral_code = p_referrer_code AND deleted_at IS NULL;

  IF v_referrer_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Referrer not found');
  END IF;

  -- Create/update referral record
  INSERT INTO public.referrals (referrer_id, referred_id, referral_code)
  VALUES (v_referrer_id, v_current_user_id, p_referrer_code)
  ON CONFLICT (referrer_id, referred_id) DO UPDATE
    SET referral_code = EXCLUDED.referral_code, updated_at = now();

  -- Set referred_by in profile if not set
  UPDATE public.profiles
  SET referred_by = v_referrer_id, updated_at = now()
  WHERE user_id = v_current_user_id AND referred_by IS NULL;

  -- Process the reward
  SELECT public.process_referral_reward(v_current_user_id) INTO result;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.manual_credit_referral_test(text, uuid) TO authenticated;

-- Debug function to check referral status
CREATE OR REPLACE FUNCTION public.debug_referral_status(p_user_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid := COALESCE(p_user_id, auth.uid());
  profile_info RECORD;
  referral_info RECORD;
  payout_info RECORD[];
BEGIN
  -- Get profile info
  SELECT user_id, referral_code, referred_by, bonk_balance, total_earned
  INTO profile_info
  FROM public.profiles
  WHERE user_id = v_user_id;

  -- Get referral info
  SELECT referrer_id, referred_id, reward_claimed, referred_user_claimed
  INTO referral_info
  FROM public.referrals
  WHERE referred_id = v_user_id OR referrer_id = v_user_id
  LIMIT 1;

  -- Get payout info
  SELECT array_agg(
    jsonb_build_object(
      'id', rp.id,
      'beneficiary_id', rp.beneficiary_id,
      'amount', rp.amount,
      'status', rp.status,
      'required_threshold', rp.required_threshold
    )
  )
  INTO payout_info
  FROM public.referral_payouts rp
  WHERE rp.referred_user_id = v_user_id OR rp.referrer_id = v_user_id;

  RETURN jsonb_build_object(
    'user_id', v_user_id,
    'profile', row_to_json(profile_info),
    'referral', row_to_json(referral_info),
    'payouts', COALESCE(payout_info, ARRAY[]::jsonb[])
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.debug_referral_status(uuid) TO authenticated;