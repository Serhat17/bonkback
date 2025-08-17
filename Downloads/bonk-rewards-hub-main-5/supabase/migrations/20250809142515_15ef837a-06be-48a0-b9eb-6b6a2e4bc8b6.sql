-- Fix referral payouts: add beneficiary tracking and ensure both sides get credited exactly once

-- 1) Add beneficiary_id to indicate WHO the payout is for
ALTER TABLE public.referral_payouts
  ADD COLUMN IF NOT EXISTS beneficiary_id uuid;

-- Backfill existing rows: assume existing payouts were for the referrer
UPDATE public.referral_payouts
SET beneficiary_id = referrer_id
WHERE beneficiary_id IS NULL;

ALTER TABLE public.referral_payouts
  ALTER COLUMN beneficiary_id SET NOT NULL;

-- Sanity: beneficiary must be either referrer or referred user
ALTER TABLE public.referral_payouts
  ADD CONSTRAINT referral_payouts_beneficiary_ck
  CHECK (beneficiary_id = referrer_id OR beneficiary_id = referred_user_id);

-- Idempotency guard: only one payout per (beneficiary, referred_user)
CREATE UNIQUE INDEX IF NOT EXISTS uq_referral_payouts_beneficiary
  ON public.referral_payouts (beneficiary_id, referred_user_id);

-- 2) Idempotent reward function: credit both sides once
CREATE OR REPLACE FUNCTION public.process_referral_reward(referred_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_referrer_id uuid;
  v_ref_reward numeric := 333333;       -- BONK amount for referrer
  v_recv_reward numeric := 333333;      -- BONK amount for referred user
  v_required_threshold numeric := 666666;
  v_new_ref_payout uuid;
  v_new_recv_payout uuid;
BEGIN
  -- Resolve valid referrer (no self-referral)
  SELECT p.referred_by
  INTO v_referrer_id
  FROM public.profiles p
  WHERE p.user_id = referred_user_id
    AND p.deleted_at IS NULL
    AND p.referred_by IS NOT NULL;

  IF v_referrer_id IS NULL OR v_referrer_id = referred_user_id THEN
    RETURN;
  END IF;

  -- A) Referrer payout: locked until threshold
  INSERT INTO public.referral_payouts (
    referrer_id, referred_user_id, beneficiary_id, amount, required_threshold, status
  ) VALUES (
    v_referrer_id, referred_user_id, v_referrer_id, v_ref_reward, v_required_threshold, 'locked'
  )
  ON CONFLICT (beneficiary_id, referred_user_id) DO NOTHING
  RETURNING id INTO v_new_ref_payout;

  -- B) Referred user payout: unlocked immediately
  INSERT INTO public.referral_payouts (
    referrer_id, referred_user_id, beneficiary_id, amount, required_threshold, status
  ) VALUES (
    v_referrer_id, referred_user_id, referred_user_id, v_recv_reward, 0, 'unlocked'
  )
  ON CONFLICT (beneficiary_id, referred_user_id) DO NOTHING
  RETURNING id INTO v_new_recv_payout;

  -- Credit balances exactly once, guarded by the inserts above
  IF v_new_ref_payout IS NOT NULL THEN
    UPDATE public.profiles
    SET bonk_balance = COALESCE(bonk_balance,0) + v_ref_reward,
        total_earned = COALESCE(total_earned,0) + v_ref_reward,
        updated_at = now()
    WHERE user_id = v_referrer_id
      AND deleted_at IS NULL;
  END IF;

  IF v_new_recv_payout IS NOT NULL THEN
    UPDATE public.profiles
    SET bonk_balance = COALESCE(bonk_balance,0) + v_recv_reward,
        total_earned = COALESCE(total_earned,0) + v_recv_reward,
        updated_at = now()
    WHERE user_id = referred_user_id
      AND deleted_at IS NULL;
  END IF;

  -- Mark referral row claimed (idempotent upsert)
  INSERT INTO public.referrals (referral_code, referrer_id, referred_id, reward_claimed, referred_user_claimed)
  VALUES (
    (SELECT referral_code FROM public.profiles WHERE user_id = v_referrer_id),
    v_referrer_id,
    referred_user_id,
    TRUE, TRUE
  )
  ON CONFLICT (referrer_id, referred_id) DO UPDATE
  SET reward_claimed = TRUE,
      referred_user_claimed = TRUE,
      updated_at = now();

  -- Attempt unlock checks for referrer (if you gate on activity)
  PERFORM public.unlock_referral_payouts(v_referrer_id);

EXCEPTION WHEN OTHERS THEN
  -- Log but don't block user creation
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

REVOKE ALL ON FUNCTION public.process_referral_reward(uuid) FROM PUBLIC;