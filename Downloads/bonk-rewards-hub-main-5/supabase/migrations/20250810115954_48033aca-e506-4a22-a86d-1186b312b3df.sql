-- Fix the core permission issue: process_referral_reward needs to be callable from claim_my_referral

-- Since claim_my_referral is SECURITY DEFINER, it runs as the function owner (postgres)
-- So we need to ensure process_referral_reward can be called by postgres/service_role

-- Grant proper permissions for the referral reward processing
GRANT EXECUTE ON FUNCTION public.process_referral_reward(uuid) TO service_role;

-- Also, let's check if there are any existing referrals that need processing
-- by manually calling the reward function for users who have referrals but no payouts

-- First, let's create a safer version that won't fail if already processed
CREATE OR REPLACE FUNCTION public.safe_process_referral_reward(referred_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_referrer_id uuid;
  v_ref_reward  numeric := 333333;
  v_recv_reward numeric := 333333;
  v_required_threshold numeric := 666666;
  v_existing_payout_count int;
BEGIN
  -- Check if rewards already processed
  SELECT COUNT(*) INTO v_existing_payout_count
  FROM public.referral_payouts 
  WHERE referred_user_id = safe_process_referral_reward.referred_user_id;
  
  IF v_existing_payout_count > 0 THEN
    RETURN json_build_object('success', true, 'message', 'Rewards already processed');
  END IF;

  -- Get referrer info
  SELECT p.referred_by
  INTO v_referrer_id
  FROM public.profiles p
  WHERE p.user_id = safe_process_referral_reward.referred_user_id
    AND p.deleted_at IS NULL
    AND p.referred_by IS NOT NULL;

  IF v_referrer_id IS NULL OR v_referrer_id = safe_process_referral_reward.referred_user_id THEN
    RETURN json_build_object('success', false, 'message', 'No valid referrer found');
  END IF;

  -- Create referrer payout (locked)
  INSERT INTO public.referral_payouts (
    referrer_id, referred_user_id, beneficiary_id, amount, required_threshold, status
  ) VALUES (
    v_referrer_id, safe_process_referral_reward.referred_user_id, v_referrer_id, v_ref_reward, v_required_threshold, 'locked'
  );

  -- Create referred user payout (unlocked)
  INSERT INTO public.referral_payouts (
    referrer_id, referred_user_id, beneficiary_id, amount, required_threshold, status
  ) VALUES (
    v_referrer_id, safe_process_referral_reward.referred_user_id, safe_process_referral_reward.referred_user_id, v_recv_reward, 0, 'unlocked'
  );

  -- Update balances
  UPDATE public.profiles
  SET bonk_balance = COALESCE(bonk_balance,0) + v_ref_reward,
      total_earned = COALESCE(total_earned,0) + v_ref_reward,
      updated_at = now()
  WHERE user_id = v_referrer_id AND deleted_at IS NULL;

  UPDATE public.profiles
  SET bonk_balance = COALESCE(bonk_balance,0) + v_recv_reward,
      total_earned = COALESCE(total_earned,0) + v_recv_reward,
      updated_at = now()
  WHERE user_id = safe_process_referral_reward.referred_user_id AND deleted_at IS NULL;

  -- Mark referral as claimed
  UPDATE public.referrals 
  SET reward_claimed = TRUE,
      referred_user_claimed = TRUE,
      updated_at = now()
  WHERE referred_id = safe_process_referral_reward.referred_user_id;

  RETURN json_build_object('success', true, 'message', 'Rewards processed successfully');

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.safe_process_referral_reward(uuid) TO service_role;

-- Update claim_my_referral to use the safer function
CREATE OR REPLACE FUNCTION public.claim_my_referral()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  me uuid := auth.uid();
  result json;
BEGIN
  IF me IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'not authenticated');
  END IF;

  -- Use the safe processing function
  SELECT public.safe_process_referral_reward(me) INTO result;
  
  RETURN result;
END;
$$;