-- Patch: add logging on block outcomes inside check_payout_eligibility
CREATE OR REPLACE FUNCTION public.check_payout_eligibility(_user_id uuid, _amount numeric)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_total_balance numeric := 0;
  v_locked_from_locks numeric := 0;
  v_locked_referrals_pending numeric := 0;
  v_locked_total numeric := 0;
  v_available numeric := 0;
  v_normal_cashback numeric := 0;
  v_referral_rewards numeric := 0;
  v_last_payout timestamptz;
  v_min_threshold numeric := 15.00;
  v_rate_limit_ok boolean := false;
BEGIN
  SELECT COALESCE(p.bonk_balance, 0)
  INTO v_total_balance
  FROM public.profiles p
  WHERE p.user_id = _user_id AND p.deleted_at IS NULL;

  SELECT COALESCE(SUM(bl.amount_bonk), 0)
  INTO v_locked_from_locks
  FROM public.bonk_locks bl
  WHERE bl.user_id = _user_id
    AND (bl.unlock_at IS NULL OR bl.unlock_at > now());

  SELECT COALESCE(SUM(rp.amount), 0)
  INTO v_locked_referrals_pending
  FROM public.referral_payouts rp
  WHERE rp.beneficiary_id = _user_id
    AND rp.status IN ('locked');

  v_locked_total := COALESCE(v_locked_from_locks,0) + COALESCE(v_locked_referrals_pending,0);
  v_available := GREATEST(COALESCE(v_total_balance,0) - COALESCE(v_locked_total,0), 0);

  SELECT COALESCE(SUM(ct.bonk_amount), 0)
  INTO v_normal_cashback
  FROM public.cashback_transactions ct
  WHERE ct.user_id = _user_id
    AND ct.is_returned = false
    AND ct.status IN ('approved','paid');

  SELECT COALESCE(SUM(rp.amount), 0)
  INTO v_referral_rewards
  FROM public.referral_payouts rp
  WHERE rp.beneficiary_id = _user_id
    AND rp.status IN ('unlocked','completed');

  IF v_available < _amount THEN
    PERFORM public.log_blocked_payout(_user_id, 'insufficient_available', jsonb_build_object('available', v_available, 'locked', v_locked_total, 'requested', _amount));
    RETURN jsonb_build_object(
      'eligible', false,
      'reason', 'insufficient_available',
      'message', 'Insufficient available balance after locks',
      'available', v_available,
      'locked', v_locked_total,
      'requested', _amount
    );
  END IF;

  IF _amount < v_min_threshold THEN
    PERFORM public.log_blocked_payout(_user_id, 'below_minimum', jsonb_build_object('requested', _amount, 'minimum', v_min_threshold));
    RETURN jsonb_build_object(
      'eligible', false,
      'reason', 'below_minimum',
      'message', 'Minimum payout amount is 15 EUR',
      'requested', _amount,
      'minimum', v_min_threshold
    );
  END IF;

  IF v_normal_cashback < (2 * v_referral_rewards) THEN
    PERFORM public.log_blocked_payout(
      _user_id, 
      'anti_abuse_referral_ratio', 
      jsonb_build_object(
        'normal_cashback_bonk', v_normal_cashback,
        'referral_rewards_bonk', v_referral_rewards,
        'required_normal_cashback_bonk', 2 * v_referral_rewards
      )
    );
    RETURN jsonb_build_object(
      'eligible', false,
      'reason', 'anti_abuse_referral_ratio',
      'message', 'Payout blocked: normal cashback must be at least 2x your referral rewards before withdrawing.',
      'normal_cashback_bonk', v_normal_cashback,
      'referral_rewards_bonk', v_referral_rewards,
      'required_normal_cashback_bonk', 2 * v_referral_rewards
    );
  END IF;

  SELECT last_payout_at INTO v_last_payout
  FROM public.payout_rate_limits
  WHERE user_id = _user_id;

  IF v_last_payout IS NULL OR v_last_payout < (now() - INTERVAL '10 minutes') THEN
    v_rate_limit_ok := TRUE;
  END IF;

  IF NOT v_rate_limit_ok THEN
    PERFORM public.log_blocked_payout(_user_id, 'rate_limited', jsonb_build_object('last_payout', v_last_payout));
    RETURN jsonb_build_object(
      'eligible', false,
      'reason', 'rate_limited',
      'message', 'Please wait 10 minutes between payouts',
      'last_payout', v_last_payout
    );
  END IF;

  RETURN jsonb_build_object(
    'eligible', true,
    'message', 'Payout eligible',
    'amount', _amount,
    'balance_total', v_total_balance,
    'locked_total', v_locked_total,
    'available', v_available
  );
END;
$function$;