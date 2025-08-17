-- Create secure gift card redemption eligibility and processing functions
-- with anti-abuse checks, proper indexing, and atomic operations

-- 1. Add indexes for gift card redemption queries
CREATE INDEX IF NOT EXISTS idx_gift_card_redemptions_user_id 
ON public.gift_card_redemptions (user_id);

CREATE INDEX IF NOT EXISTS idx_gift_card_redemptions_status 
ON public.gift_card_redemptions (status);

CREATE INDEX IF NOT EXISTS idx_gift_card_redemptions_created_at 
ON public.gift_card_redemptions (created_at);

CREATE INDEX IF NOT EXISTS idx_gift_cards_status 
ON public.gift_cards (status);

CREATE INDEX IF NOT EXISTS idx_bonk_locks_user_unlock 
ON public.bonk_locks (user_id, unlock_at);

CREATE INDEX IF NOT EXISTS idx_referral_payouts_beneficiary_status 
ON public.referral_payouts (beneficiary_id, status);

-- 2. Add system setting for referral ratio threshold
INSERT INTO public.system_settings (key, value, description, updated_by) 
VALUES (
  'gift_card_referral_ratio_threshold', 
  '2'::jsonb, 
  'Required ratio of normal cashback to referral rewards for gift card redemptions (2x means 2:1 ratio)', 
  (SELECT user_id FROM public.profiles WHERE role = 'admin' LIMIT 1)
) ON CONFLICT (key) DO UPDATE SET 
  value = EXCLUDED.value,
  description = EXCLUDED.description,
  updated_at = now();

-- 3. Create secure gift card redemption eligibility function
CREATE OR REPLACE FUNCTION public.check_gift_card_redemption_eligibility(
  _user_id uuid, 
  _bonk_amount numeric
)
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
  v_ratio_threshold numeric := 2;
  v_min_threshold numeric := 5.00;
BEGIN
  -- Validate inputs
  IF _user_id IS NULL THEN
    RETURN jsonb_build_object(
      'eligible', false,
      'reason', 'invalid_user_id',
      'message', 'Invalid user ID provided'
    );
  END IF;

  IF _bonk_amount IS NULL OR _bonk_amount <= 0 THEN
    RETURN jsonb_build_object(
      'eligible', false,
      'reason', 'invalid_amount',
      'message', 'Invalid redemption amount provided'
    );
  END IF;

  -- Get user's total BONK balance
  SELECT COALESCE(p.bonk_balance, 0)
  INTO v_total_balance
  FROM public.profiles p
  WHERE p.user_id = _user_id AND p.deleted_at IS NULL;

  IF v_total_balance IS NULL THEN
    RETURN jsonb_build_object(
      'eligible', false,
      'reason', 'user_not_found',
      'message', 'User profile not found'
    );
  END IF;

  -- Calculate locked amounts from bonk_locks
  SELECT COALESCE(SUM(bl.amount_bonk), 0)
  INTO v_locked_from_locks
  FROM public.bonk_locks bl
  WHERE bl.user_id = _user_id
    AND (bl.unlock_at IS NULL OR bl.unlock_at > now());

  -- Calculate locked referral payouts
  SELECT COALESCE(SUM(rp.amount), 0)
  INTO v_locked_referrals_pending
  FROM public.referral_payouts rp
  WHERE rp.beneficiary_id = _user_id
    AND rp.status = 'locked';

  -- Calculate total locked and available amounts
  v_locked_total := COALESCE(v_locked_from_locks, 0) + COALESCE(v_locked_referrals_pending, 0);
  v_available := GREATEST(COALESCE(v_total_balance, 0) - COALESCE(v_locked_total, 0), 0);

  -- Check sufficient available balance
  IF v_available < _bonk_amount THEN
    PERFORM public.log_blocked_gift_card_redemption(_user_id, 'insufficient_available', jsonb_build_object(
      'available', v_available, 
      'locked', v_locked_total, 
      'requested', _bonk_amount
    ));
    RETURN jsonb_build_object(
      'eligible', false,
      'reason', 'insufficient_available',
      'message', 'Insufficient available balance after locks',
      'available', v_available,
      'locked', v_locked_total,
      'requested', _bonk_amount
    );
  END IF;

  -- Check minimum threshold
  IF _bonk_amount < v_min_threshold THEN
    PERFORM public.log_blocked_gift_card_redemption(_user_id, 'below_minimum', jsonb_build_object(
      'requested', _bonk_amount, 
      'minimum', v_min_threshold
    ));
    RETURN jsonb_build_object(
      'eligible', false,
      'reason', 'below_minimum',
      'message', 'Minimum gift card redemption amount is ' || v_min_threshold || ' EUR equivalent',
      'requested', _bonk_amount,
      'minimum', v_min_threshold
    );
  END IF;

  -- Get referral ratio threshold from system settings
  SELECT COALESCE((value->>0)::numeric, 2)
  INTO v_ratio_threshold
  FROM public.system_settings
  WHERE key = 'gift_card_referral_ratio_threshold';

  -- Calculate normal cashback (approved/paid transactions, non-returned)
  SELECT COALESCE(SUM(ct.bonk_amount), 0)
  INTO v_normal_cashback
  FROM public.cashback_transactions ct
  WHERE ct.user_id = _user_id
    AND ct.is_returned = false
    AND ct.status IN ('approved', 'paid');

  -- Calculate total referral rewards (unlocked/completed)
  SELECT COALESCE(SUM(rp.amount), 0)
  INTO v_referral_rewards
  FROM public.referral_payouts rp
  WHERE rp.beneficiary_id = _user_id
    AND rp.status IN ('unlocked', 'completed');

  -- Apply anti-abuse referral ratio check
  IF v_normal_cashback < (v_ratio_threshold * v_referral_rewards) THEN
    PERFORM public.log_blocked_gift_card_redemption(
      _user_id, 
      'anti_abuse_referral_ratio', 
      jsonb_build_object(
        'normal_cashback_bonk', v_normal_cashback,
        'referral_rewards_bonk', v_referral_rewards,
        'required_normal_cashback_bonk', v_ratio_threshold * v_referral_rewards,
        'ratio_threshold', v_ratio_threshold
      )
    );
    RETURN jsonb_build_object(
      'eligible', false,
      'reason', 'anti_abuse_referral_ratio',
      'message', 'Gift card redemption blocked: normal cashback must be at least ' || v_ratio_threshold || 'x your referral rewards.',
      'normal_cashback_bonk', v_normal_cashback,
      'referral_rewards_bonk', v_referral_rewards,
      'required_normal_cashback_bonk', v_ratio_threshold * v_referral_rewards,
      'ratio_threshold', v_ratio_threshold
    );
  END IF;

  -- All checks passed
  RETURN jsonb_build_object(
    'eligible', true,
    'message', 'Gift card redemption eligible',
    'amount', _bonk_amount,
    'balance_total', v_total_balance,
    'locked_total', v_locked_total,
    'available', v_available
  );
END;
$function$;

-- 4. Create logging function for blocked gift card redemptions
CREATE OR REPLACE FUNCTION public.log_blocked_gift_card_redemption(
  _user_id uuid, 
  _reason text, 
  _details jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  INSERT INTO public.security_audit_log (
    user_id, 
    event_type, 
    severity, 
    source, 
    metadata
  ) VALUES (
    _user_id, 
    'gift_card_redemption_blocked', 
    'warning', 
    'check_gift_card_redemption_eligibility', 
    jsonb_build_object('reason', _reason) || COALESCE(_details, '{}'::jsonb)
  );
END;
$function$;

-- 5. Create atomic gift card redemption function
CREATE OR REPLACE FUNCTION public.redeem_gift_card_secure(
  _gift_card_id uuid,
  _bonk_amount numeric
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_current_balance numeric;
  v_eligibility_result jsonb;
  v_gift_card_available boolean := false;
  v_redemption_id uuid;
BEGIN
  -- Check authentication
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User not authenticated'
    );
  END IF;

  -- Validate gift card exists and is available
  SELECT (status = 'active' AND (available_quantity IS NULL OR available_quantity > 0))
  INTO v_gift_card_available
  FROM public.gift_cards
  WHERE id = _gift_card_id;

  IF NOT v_gift_card_available THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Gift card not available',
      'code', 'GIFT_CARD_UNAVAILABLE'
    );
  END IF;

  -- Check redemption eligibility (including anti-abuse checks)
  SELECT public.check_gift_card_redemption_eligibility(v_user_id, _bonk_amount)
  INTO v_eligibility_result;

  IF NOT (v_eligibility_result->>'eligible')::boolean THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', v_eligibility_result->>'message',
      'reason', v_eligibility_result->>'reason',
      'code', 'REDEMPTION_NOT_ELIGIBLE'
    ) || v_eligibility_result;
  END IF;

  -- Start atomic transaction for balance debit and redemption creation
  -- Get current balance with row lock to prevent race conditions
  SELECT bonk_balance
  INTO v_current_balance
  FROM public.profiles
  WHERE user_id = v_user_id AND deleted_at IS NULL
  FOR UPDATE;

  -- Double-check balance hasn't changed
  IF v_current_balance < _bonk_amount THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Insufficient balance at time of redemption',
      'code', 'INSUFFICIENT_BALANCE_RACE'
    );
  END IF;

  -- Debit user's BONK balance
  UPDATE public.profiles
  SET 
    bonk_balance = bonk_balance - _bonk_amount,
    updated_at = now()
  WHERE user_id = v_user_id AND deleted_at IS NULL;

  -- Create redemption record
  INSERT INTO public.gift_card_redemptions (
    user_id,
    gift_card_id,
    bonk_amount,
    status
  ) VALUES (
    v_user_id,
    _gift_card_id,
    _bonk_amount,
    'pending'
  ) RETURNING id INTO v_redemption_id;

  -- Update gift card available quantity if applicable
  UPDATE public.gift_cards
  SET 
    available_quantity = GREATEST(0, available_quantity - 1),
    updated_at = now()
  WHERE id = _gift_card_id 
    AND available_quantity IS NOT NULL 
    AND available_quantity > 0;

  -- Log successful redemption
  INSERT INTO public.security_audit_log (
    user_id,
    event_type,
    severity,
    source,
    metadata
  ) VALUES (
    v_user_id,
    'gift_card_redeemed',
    'info',
    'redeem_gift_card_secure',
    jsonb_build_object(
      'gift_card_id', _gift_card_id,
      'bonk_amount', _bonk_amount,
      'redemption_id', v_redemption_id
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'redemption_id', v_redemption_id,
    'message', 'Gift card redemption successful'
  );

EXCEPTION WHEN OTHERS THEN
  -- Log error
  INSERT INTO public.error_logs (
    id,
    user_id,
    error_message,
    severity,
    component,
    stack_trace,
    additional_data
  ) VALUES (
    gen_random_uuid(),
    v_user_id,
    'Gift card redemption failed: ' || SQLERRM,
    'error',
    'redeem_gift_card_secure',
    SQLSTATE,
    jsonb_build_object(
      'gift_card_id', _gift_card_id,
      'bonk_amount', _bonk_amount
    )
  );

  RETURN jsonb_build_object(
    'success', false,
    'error', 'Gift card redemption failed: ' || SQLERRM,
    'code', 'REDEMPTION_FAILED'
  );
END;
$function$;