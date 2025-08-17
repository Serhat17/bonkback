-- 1) First, let's create the instrumentation and logging infrastructure
-- Drop existing referral functions to avoid conflicts
DROP FUNCTION IF EXISTS public.claim_my_referral(text);
DROP FUNCTION IF EXISTS public.process_my_unclaimed_referrals();
DROP FUNCTION IF EXISTS public.process_referral_reward(uuid);
DROP FUNCTION IF EXISTS public.safe_process_referral_reward(uuid);

-- 2) Create the canonical referral reward processing function
CREATE OR REPLACE FUNCTION public.process_referral_reward(referred_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_referrer_id uuid;
  v_referrer_payout_id uuid;
  v_referred_payout_id uuid;
  v_referrer_amount numeric := 333333;
  v_referred_amount numeric := 333333;
  v_existing_referral boolean := false;
BEGIN
  -- Log the attempt
  INSERT INTO public.security_audit_log (user_id, event_type, severity, source, metadata)
  VALUES (referred_user_id, 'referral_claim_attempt', 'info', 'process_referral_reward',
          jsonb_build_object('referred_user_id', referred_user_id, 'source', 'direct'));

  -- Find the referrer
  SELECT referrer_id INTO v_referrer_id
  FROM public.referrals
  WHERE referred_id = referred_user_id
  LIMIT 1;

  IF v_referrer_id IS NULL THEN
    INSERT INTO public.security_audit_log (user_id, event_type, severity, source, metadata)
    VALUES (referred_user_id, 'referral_claim_blocked', 'warning', 'process_referral_reward',
            jsonb_build_object('reason', 'no_referrer', 'referred_user_id', referred_user_id));
    RETURN jsonb_build_object('success', false, 'error', 'No referrer found');
  END IF;

  -- Prevent self-referral
  IF v_referrer_id = referred_user_id THEN
    INSERT INTO public.security_audit_log (user_id, event_type, severity, source, metadata)
    VALUES (referred_user_id, 'referral_claim_blocked', 'warning', 'process_referral_reward',
            jsonb_build_object('reason', 'self_referral', 'referrer_id', v_referrer_id, 'referred_user_id', referred_user_id));
    RETURN jsonb_build_object('success', false, 'error', 'Self-referrals are not allowed');
  END IF;

  -- Check if already processed
  SELECT EXISTS(
    SELECT 1 FROM public.referral_payouts 
    WHERE referred_user_id = process_referral_reward.referred_user_id
  ) INTO v_existing_referral;

  IF v_existing_referral THEN
    INSERT INTO public.security_audit_log (user_id, event_type, severity, source, metadata)
    VALUES (referred_user_id, 'referral_claim_blocked', 'info', 'process_referral_reward',
            jsonb_build_object('reason', 'duplicate', 'referrer_id', v_referrer_id, 'referred_user_id', referred_user_id));
    RETURN jsonb_build_object('success', false, 'error', 'Referral reward already processed');
  END IF;

  BEGIN
    -- Create referral payouts for both parties (in transaction)
    -- Referrer gets locked reward
    INSERT INTO public.referral_payouts (
      referrer_id, referred_user_id, beneficiary_id, amount, status, required_threshold
    ) VALUES (
      v_referrer_id, referred_user_id, v_referrer_id, v_referrer_amount, 'locked', 15.00
    ) RETURNING id INTO v_referrer_payout_id;

    -- Referred user gets unlocked reward
    INSERT INTO public.referral_payouts (
      referrer_id, referred_user_id, beneficiary_id, amount, status, required_threshold
    ) VALUES (
      v_referrer_id, referred_user_id, referred_user_id, v_referred_amount, 'unlocked', 0
    ) RETURNING id INTO v_referred_payout_id;

    -- Update balances only if payouts were created
    IF v_referrer_payout_id IS NOT NULL THEN
      UPDATE public.profiles 
      SET bonk_balance = COALESCE(bonk_balance, 0) + v_referrer_amount,
          updated_at = now()
      WHERE user_id = v_referrer_id;
    END IF;

    IF v_referred_payout_id IS NOT NULL THEN
      UPDATE public.profiles 
      SET bonk_balance = COALESCE(bonk_balance, 0) + v_referred_amount,
          updated_at = now()
      WHERE user_id = referred_user_id;
    END IF;

    -- Mark referral as processed
    UPDATE public.referrals
    SET reward_claimed = true, 
        referred_user_claimed = true,
        updated_at = now()
    WHERE referrer_id = v_referrer_id AND referred_id = referred_user_id;

    -- Log success
    INSERT INTO public.security_audit_log (user_id, event_type, severity, source, metadata)
    VALUES (referred_user_id, 'referral_claim_success', 'info', 'process_referral_reward',
            jsonb_build_object(
              'referrer_id', v_referrer_id,
              'referred_id', referred_user_id,
              'referrer_amount', v_referrer_amount,
              'referred_amount', v_referred_amount
            ));

    INSERT INTO public.security_audit_log (user_id, event_type, severity, source, metadata)
    VALUES (referred_user_id, 'referral_credit_written', 'info', 'process_referral_reward',
            jsonb_build_object(
              'referrer_payout_id', v_referrer_payout_id,
              'referred_payout_id', v_referred_payout_id,
              'profile_rows_updated', true
            ));

    RETURN jsonb_build_object(
      'success', true,
      'referrer_id', v_referrer_id,
      'credited', jsonb_build_object(
        'referrer', v_referrer_amount,
        'referred', v_referred_amount
      ),
      'payout_ids', jsonb_build_object(
        'referrer', v_referrer_payout_id,
        'referred', v_referred_payout_id
      )
    );

  EXCEPTION WHEN OTHERS THEN
    -- Log the failure
    INSERT INTO public.error_logs (user_id, error_message, severity, component, stack_trace, additional_data)
    VALUES (referred_user_id, 'process_referral_reward failed: ' || SQLERRM, 'error', 'process_referral_reward',
            SQLSTATE, jsonb_build_object('referrer_id', v_referrer_id, 'referred_user_id', referred_user_id));

    INSERT INTO public.security_audit_log (user_id, event_type, severity, source, metadata)
    VALUES (referred_user_id, 'referral_credit_failed', 'error', 'process_referral_reward',
            jsonb_build_object('sqlstate', SQLSTATE, 'message', SQLERRM));

    RETURN jsonb_build_object('success', false, 'error', 'Failed to process referral reward: ' || SQLERRM);
  END;
END;
$$;

-- 3) Create client-facing wrapper function
CREATE OR REPLACE FUNCTION public.claim_my_referral(p_referral_code text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_current_user_id uuid := auth.uid();
  v_referrer_id uuid;
  v_result jsonb;
BEGIN
  IF v_current_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Authentication required');
  END IF;

  -- Log attempt
  INSERT INTO public.security_audit_log (user_id, event_type, severity, source, metadata)
  VALUES (v_current_user_id, 'referral_claim_attempt', 'info', 'claim_my_referral',
          jsonb_build_object('referral_code', p_referral_code, 'source', 'manual'));

  -- If no code provided, check if user already has referred_by set
  IF p_referral_code IS NULL THEN
    SELECT referred_by INTO v_referrer_id
    FROM public.profiles 
    WHERE user_id = v_current_user_id AND deleted_at IS NULL;

    IF v_referrer_id IS NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'No referral code provided and user not referred');
    END IF;
  ELSE
    -- Find referrer by code
    SELECT user_id INTO v_referrer_id
    FROM public.profiles
    WHERE referral_code = p_referral_code AND deleted_at IS NULL;

    IF v_referrer_id IS NULL THEN
      INSERT INTO public.security_audit_log (user_id, event_type, severity, source, metadata)
      VALUES (v_current_user_id, 'referral_claim_blocked', 'warning', 'claim_my_referral',
              jsonb_build_object('reason', 'invalid_code', 'referral_code', p_referral_code));
      RETURN jsonb_build_object('success', false, 'error', 'Invalid referral code');
    END IF;

    -- Prevent self-referral
    IF v_referrer_id = v_current_user_id THEN
      INSERT INTO public.security_audit_log (user_id, event_type, severity, source, metadata)
      VALUES (v_current_user_id, 'referral_claim_blocked', 'warning', 'claim_my_referral',
              jsonb_build_object('reason', 'self_referral', 'referral_code', p_referral_code));
      RETURN jsonb_build_object('success', false, 'error', 'Self-referrals are not allowed');
    END IF;

    -- Set referred_by if not already set
    UPDATE public.profiles
    SET referred_by = v_referrer_id, updated_at = now()
    WHERE user_id = v_current_user_id AND referred_by IS NULL;

    -- Create or update referral record
    INSERT INTO public.referrals (referrer_id, referred_id, referral_code)
    VALUES (v_referrer_id, v_current_user_id, p_referral_code)
    ON CONFLICT (referrer_id, referred_id) 
    DO UPDATE SET referral_code = EXCLUDED.referral_code, updated_at = now();
  END IF;

  -- Call the canonical reward processing function
  SELECT public.process_referral_reward(v_current_user_id) INTO v_result;

  RETURN v_result;
END;
$$;

-- 4) Create function to process unclaimed referrals for referrers
CREATE OR REPLACE FUNCTION public.process_my_unclaimed_referrals()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_current_user_id uuid := auth.uid();
  v_processed_count integer := 0;
  v_total_amount numeric := 0;
  r RECORD;
BEGIN
  IF v_current_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Authentication required');
  END IF;

  -- Process unclaimed referrals where current user is the referrer
  FOR r IN 
    SELECT rf.referred_id, rf.referral_code
    FROM public.referrals rf
    WHERE rf.referrer_id = v_current_user_id 
      AND rf.reward_claimed = false
      AND NOT EXISTS (
        SELECT 1 FROM public.referral_payouts rp 
        WHERE rp.referred_user_id = rf.referred_id
      )
  LOOP
    DECLARE
      v_result jsonb;
    BEGIN
      SELECT public.process_referral_reward(r.referred_id) INTO v_result;
      
      IF (v_result->>'success')::boolean THEN
        v_processed_count := v_processed_count + 1;
        v_total_amount := v_total_amount + COALESCE((v_result->'credited'->>'referrer')::numeric, 0);
      END IF;
    END;
  END LOOP;

  IF v_processed_count > 0 THEN
    INSERT INTO public.security_audit_log (user_id, event_type, severity, source, metadata)
    VALUES (v_current_user_id, 'referral_batch_processed', 'info', 'process_my_unclaimed_referrals',
            jsonb_build_object('processed_count', v_processed_count, 'total_amount', v_total_amount));
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'processed', v_processed_count,
    'total_credited', v_total_amount,
    'message', format('Processed %s referral(s) for %s BONK total', v_processed_count, v_total_amount)
  );
END;
$$;

-- 5) Set proper permissions
REVOKE ALL ON FUNCTION public.process_referral_reward(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.process_referral_reward(uuid) TO service_role;

REVOKE ALL ON FUNCTION public.claim_my_referral(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_my_referral(text) TO authenticated;

REVOKE ALL ON FUNCTION public.process_my_unclaimed_referrals() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.process_my_unclaimed_referrals() TO authenticated;

-- 6) Ensure referral_payouts has proper unique constraint
ALTER TABLE public.referral_payouts 
DROP CONSTRAINT IF EXISTS uq_referral_payouts_beneficiary_referred;

ALTER TABLE public.referral_payouts 
ADD CONSTRAINT uq_referral_payouts_beneficiary_referred 
UNIQUE (beneficiary_id, referred_user_id);

-- 7) Create trigger to update referral payout status based on user earnings
CREATE OR REPLACE FUNCTION public.unlock_referral_payouts_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- When a user's total_earned increases, unlock their referral payouts if threshold is met
  IF NEW.total_earned > OLD.total_earned AND NEW.total_earned >= 15.00 THEN
    UPDATE public.referral_payouts
    SET status = 'unlocked', unlocked_at = now(), updated_at = now()
    WHERE beneficiary_id = NEW.user_id 
      AND status = 'locked' 
      AND required_threshold <= NEW.total_earned;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_unlock_referral_payouts ON public.profiles;
CREATE TRIGGER trg_unlock_referral_payouts
AFTER UPDATE OF total_earned ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.unlock_referral_payouts_trigger();