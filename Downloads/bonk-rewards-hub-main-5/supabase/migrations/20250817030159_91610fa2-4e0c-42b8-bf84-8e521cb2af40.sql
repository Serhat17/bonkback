-- Fix the debug function and core referral issues

-- Debug function to check referral status (fixed)
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
  payouts_json jsonb;
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

  -- Get payout info as JSON
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', rp.id,
      'beneficiary_id', rp.beneficiary_id,
      'amount', rp.amount,
      'status', rp.status,
      'required_threshold', rp.required_threshold,
      'created_at', rp.created_at
    )
  ), '[]'::jsonb)
  INTO payouts_json
  FROM public.referral_payouts rp
  WHERE rp.referred_user_id = v_user_id OR rp.referrer_id = v_user_id;

  RETURN jsonb_build_object(
    'user_id', v_user_id,
    'profile', row_to_json(profile_info),
    'referral', row_to_json(referral_info),
    'payouts', payouts_json
  );
END;
$$;

-- Create a simple function to fix a user's referral rewards manually
CREATE OR REPLACE FUNCTION public.fix_my_referral_rewards()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_referrer_id uuid;
  v_referred_id uuid;
  fixed_count INTEGER := 0;
  result jsonb;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Authentication required');
  END IF;

  -- Case 1: User is a referrer with claimed referrals but no payout records
  FOR v_referred_id IN 
    SELECT rf.referred_id
    FROM public.referrals rf
    WHERE rf.referrer_id = v_user_id 
      AND rf.reward_claimed = true
      AND NOT EXISTS (
        SELECT 1 FROM public.referral_payouts rp 
        WHERE rp.referrer_id = rf.referrer_id 
          AND rp.referred_user_id = rf.referred_id
          AND rp.beneficiary_id = rf.referrer_id
      )
  LOOP
    -- Create referrer payout (locked)
    INSERT INTO public.referral_payouts (
      referrer_id, referred_user_id, beneficiary_id, amount, status, required_threshold
    ) VALUES (
      v_user_id, v_referred_id, v_user_id, 333333, 'locked', 15.00
    ) ON CONFLICT (beneficiary_id, referred_user_id) DO NOTHING;

    -- Update referrer balance
    UPDATE public.profiles 
    SET bonk_balance = COALESCE(bonk_balance, 0) + 333333,
        updated_at = now()
    WHERE user_id = v_user_id;

    fixed_count := fixed_count + 1;
  END LOOP;

  -- Case 2: User is referred but missing their referral payout
  SELECT rf.referrer_id INTO v_referrer_id
  FROM public.referrals rf
  WHERE rf.referred_id = v_user_id 
    AND rf.referred_user_claimed = true
    AND NOT EXISTS (
      SELECT 1 FROM public.referral_payouts rp 
      WHERE rp.referrer_id = rf.referrer_id 
        AND rp.referred_user_id = rf.referred_id
        AND rp.beneficiary_id = rf.referred_id
    )
  LIMIT 1;

  IF v_referrer_id IS NOT NULL THEN
    -- Create referred user payout (unlocked)
    INSERT INTO public.referral_payouts (
      referrer_id, referred_user_id, beneficiary_id, amount, status, required_threshold
    ) VALUES (
      v_referrer_id, v_user_id, v_user_id, 333333, 'unlocked', 0
    ) ON CONFLICT (beneficiary_id, referred_user_id) DO NOTHING;

    -- Update referred user balance
    UPDATE public.profiles 
    SET bonk_balance = COALESCE(bonk_balance, 0) + 333333,
        updated_at = now()
    WHERE user_id = v_user_id;

    fixed_count := fixed_count + 1;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'fixed_count', fixed_count,
    'message', format('Fixed %s referral reward(s)', fixed_count)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.fix_my_referral_rewards() TO authenticated;