-- Add unique constraints for idempotency
ALTER TABLE public.referrals
  ADD CONSTRAINT uq_referrals_pair UNIQUE (referrer_id, referred_id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_referral_payouts_beneficiary
  ON public.referral_payouts (beneficiary_id, referred_user_id);

-- Drop and recreate the corrected referral reward function
DROP FUNCTION IF EXISTS public.process_referral_reward(uuid);

-- Credit both referrer and referred user exactly once
CREATE OR REPLACE FUNCTION public.process_referral_reward(referred_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_referrer_id uuid;
  v_ref_reward  numeric := 333333;    -- BONK for referrer
  v_recv_reward numeric := 333333;    -- BONK for referred user
  v_required_threshold numeric := 666666;
  v_new_ref_payout uuid;
  v_new_recv_payout uuid;
BEGIN
  -- Resolve referrer from referrals/profiles (no self-referrals, no deleted)
  SELECT p.referred_by
  INTO v_referrer_id
  FROM public.profiles p
  WHERE p.user_id = referred_user_id
    AND p.deleted_at IS NULL
    AND p.referred_by IS NOT NULL;

  IF v_referrer_id IS NULL OR v_referrer_id = referred_user_id THEN
    RETURN;
  END IF;

  -- A) Referrer payout (locked until threshold)
  INSERT INTO public.referral_payouts (
    referrer_id, referred_user_id, beneficiary_id, amount, required_threshold, status
  ) VALUES (
    v_referrer_id, referred_user_id, v_referrer_id, v_ref_reward, v_required_threshold, 'locked'
  )
  ON CONFLICT (beneficiary_id, referred_user_id) DO NOTHING
  RETURNING id INTO v_new_ref_payout;

  -- B) Referred user payout (unlocked immediately)
  INSERT INTO public.referral_payouts (
    referrer_id, referred_user_id, beneficiary_id, amount, required_threshold, status
  ) VALUES (
    v_referrer_id, referred_user_id, referred_user_id, v_recv_reward, 0, 'unlocked'
  )
  ON CONFLICT (beneficiary_id, referred_user_id) DO NOTHING
  RETURNING id INTO v_new_recv_payout;

  -- Credit balances exactly once (only if the payout row is newly created)
  IF v_new_ref_payout IS NOT NULL THEN
    UPDATE public.profiles
    SET bonk_balance = COALESCE(bonk_balance,0) + v_ref_reward,
        total_earned = COALESCE(total_earned,0) + v_ref_reward,
        updated_at = now()
    WHERE user_id = v_referrer_id AND deleted_at IS NULL;
  END IF;

  IF v_new_recv_payout IS NOT NULL THEN
    UPDATE public.profiles
    SET bonk_balance = COALESCE(bonk_balance,0) + v_recv_reward,
        total_earned = COALESCE(total_earned,0) + v_recv_reward,
        updated_at = now()
    WHERE user_id = referred_user_id AND deleted_at IS NULL;
  END IF;

  -- Mark referral as claimed (idempotent upsert)
  INSERT INTO public.referrals (referral_code, referrer_id, referred_id, reward_claimed, referred_user_claimed)
  SELECT pr.referral_code, v_referrer_id, referred_user_id, TRUE, TRUE
  FROM public.profiles pr
  WHERE pr.user_id = v_referrer_id
  ON CONFLICT (referrer_id, referred_id) DO UPDATE
  SET reward_claimed = TRUE,
      referred_user_claimed = TRUE,
      updated_at = now();

  -- Try unlocks (if your unlock logic is per-user)
  PERFORM public.unlock_referral_payouts(v_referrer_id);

EXCEPTION WHEN OTHERS THEN
  INSERT INTO public.error_logs (id, user_id, error_message, severity, component, additional_data)
  VALUES (
    gen_random_uuid(),
    referred_user_id,
    'process_referral_reward: '||SQLERRM,
    'error',
    'process_referral_reward',
    jsonb_build_object('referrer_id', v_referrer_id, 'sqlstate', SQLSTATE)
  );
END;
$$;

-- Create batch processor function
CREATE OR REPLACE FUNCTION public.process_all_unclaimed_referrals()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  r record;
  n integer := 0;
BEGIN
  FOR r IN
    SELECT referrer_id, referred_id
    FROM public.referrals
    WHERE NOT reward_claimed
  LOOP
    PERFORM public.process_referral_reward(r.referred_id);
    n := n + 1;
  END LOOP;
  RETURN n;
END;
$$;

-- Revoke public access for security
REVOKE ALL ON FUNCTION public.process_referral_reward(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.process_all_unclaimed_referrals() FROM PUBLIC;