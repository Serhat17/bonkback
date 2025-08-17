-- Drop and recreate the function with the correct parameter name
DROP FUNCTION IF EXISTS public.safe_process_referral_reward(uuid);

CREATE OR REPLACE FUNCTION public.safe_process_referral_reward(p_referred_user_id uuid)
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
  WHERE referred_user_id = p_referred_user_id;
  
  IF v_existing_payout_count > 0 THEN
    RETURN json_build_object('success', true, 'message', 'Rewards already processed');
  END IF;

  -- Get referrer info
  SELECT profiles.referred_by
  INTO v_referrer_id
  FROM public.profiles
  WHERE profiles.user_id = p_referred_user_id
    AND profiles.deleted_at IS NULL
    AND profiles.referred_by IS NOT NULL;

  IF v_referrer_id IS NULL OR v_referrer_id = p_referred_user_id THEN
    RETURN json_build_object('success', false, 'message', 'No valid referrer found');
  END IF;

  -- Create referrer payout (locked)
  INSERT INTO public.referral_payouts (
    referrer_id, referred_user_id, beneficiary_id, amount, required_threshold, status
  ) VALUES (
    v_referrer_id, p_referred_user_id, v_referrer_id, v_ref_reward, v_required_threshold, 'locked'
  );

  -- Create referred user payout (unlocked)
  INSERT INTO public.referral_payouts (
    referrer_id, referred_user_id, beneficiary_id, amount, required_threshold, status
  ) VALUES (
    v_referrer_id, p_referred_user_id, p_referred_user_id, v_recv_reward, 0, 'unlocked'
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
  WHERE user_id = p_referred_user_id AND deleted_at IS NULL;

  -- Mark referral as claimed
  UPDATE public.referrals 
  SET reward_claimed = TRUE,
      referred_user_claimed = TRUE,
      updated_at = now()
  WHERE referred_id = p_referred_user_id;

  RETURN json_build_object('success', true, 'message', 'Rewards processed successfully');

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.safe_process_referral_reward(uuid) TO service_role;

-- Now process the existing unclaimed referral
SELECT public.safe_process_referral_reward('52f0c326-525b-425f-8a5c-d047dd27f12d'::uuid) as result;