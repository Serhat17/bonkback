-- Drop and recreate the process_referral_reward function to fix parameter naming
DROP FUNCTION IF EXISTS public.process_referral_reward(uuid);

CREATE OR REPLACE FUNCTION public.process_referral_reward(p_referred_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_referral RECORD;
  v_referrer_profile RECORD;
  v_referred_profile RECORD;
  v_referrer_reward numeric := 10;
  v_referred_reward numeric := 5;
  v_threshold numeric := 0;
BEGIN
  -- Get referral relationship
  SELECT r.referrer_id, r.referred_id, r.reward_claimed, r.referred_user_claimed
  INTO v_referral
  FROM public.referrals r
  WHERE r.referred_id = p_referred_user_id
  LIMIT 1;

  IF v_referral.referrer_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'No referral relationship found'
    );
  END IF;

  -- Get profiles
  SELECT user_id, full_name, bonk_balance, total_earned
  INTO v_referrer_profile
  FROM public.profiles
  WHERE user_id = v_referral.referrer_id AND deleted_at IS NULL;

  SELECT user_id, full_name, bonk_balance, total_earned  
  INTO v_referred_profile
  FROM public.profiles
  WHERE user_id = p_referred_user_id AND deleted_at IS NULL;

  -- Check if rewards already processed
  IF EXISTS (
    SELECT 1 FROM public.referral_payouts rp 
    WHERE rp.referred_user_id = p_referred_user_id
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Rewards already processed for this referral'
    );
  END IF;

  -- Create referral payouts for both users
  -- Referrer reward (locked until referred user earns threshold)
  INSERT INTO public.referral_payouts (
    referrer_id, referred_user_id, beneficiary_id, amount, required_threshold, status
  ) VALUES (
    v_referral.referrer_id, p_referred_user_id, v_referral.referrer_id, v_referrer_reward, v_threshold, 'unlocked'
  );

  -- Referred user reward (immediate)
  INSERT INTO public.referral_payouts (
    referrer_id, referred_user_id, beneficiary_id, amount, required_threshold, status
  ) VALUES (
    v_referral.referrer_id, p_referred_user_id, p_referred_user_id, v_referred_reward, v_threshold, 'unlocked'
  );

  -- Update balances for both users
  UPDATE public.profiles 
  SET bonk_balance = COALESCE(bonk_balance, 0) + v_referrer_reward,
      updated_at = now()
  WHERE user_id = v_referral.referrer_id;

  UPDATE public.profiles 
  SET bonk_balance = COALESCE(bonk_balance, 0) + v_referred_reward,
      updated_at = now()
  WHERE user_id = p_referred_user_id;

  -- Mark referral as processed
  UPDATE public.referrals 
  SET reward_claimed = true, referred_user_claimed = true, updated_at = now()
  WHERE referrer_id = v_referral.referrer_id AND referred_id = p_referred_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Referral rewards processed successfully',
    'credited', jsonb_build_object(
      'referrer', v_referrer_reward,
      'referred', v_referred_reward
    ),
    'referrer_id', v_referral.referrer_id,
    'referred_user_id', p_referred_user_id
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', 'Processing failed: ' || SQLERRM,
    'sqlstate', SQLSTATE
  );
END;
$$;