-- Fix security issues: Set search_path for functions to prevent vulnerabilities

-- Fix check_payout_eligibility function
CREATE OR REPLACE FUNCTION public.check_payout_eligibility(
  _user_id UUID,
  _amount NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  user_balance NUMERIC;
  last_payout TIMESTAMP WITH TIME ZONE;
  rate_limit_passed BOOLEAN := FALSE;
  min_threshold NUMERIC := 15.00; -- 15 EUR minimum
  result JSONB;
BEGIN
  -- Get user's current balance
  SELECT bonk_balance INTO user_balance 
  FROM public.profiles 
  WHERE user_id = _user_id;
  
  -- Check minimum threshold (15 EUR)
  IF user_balance < min_threshold THEN
    RETURN jsonb_build_object(
      'eligible', false,
      'reason', 'insufficient_balance',
      'message', 'Minimum balance of 15 EUR required',
      'current_balance', user_balance,
      'required_balance', min_threshold
    );
  END IF;
  
  -- Check rate limiting (max 1 payout per 10 minutes)
  SELECT last_payout_at INTO last_payout
  FROM public.payout_rate_limits
  WHERE user_id = _user_id;
  
  IF last_payout IS NULL OR last_payout < (now() - INTERVAL '10 minutes') THEN
    rate_limit_passed := TRUE;
  END IF;
  
  IF NOT rate_limit_passed THEN
    RETURN jsonb_build_object(
      'eligible', false,
      'reason', 'rate_limited',
      'message', 'Please wait 10 minutes between payouts',
      'last_payout', last_payout
    );
  END IF;
  
  -- Check if amount is available
  IF _amount > user_balance THEN
    RETURN jsonb_build_object(
      'eligible', false,
      'reason', 'insufficient_amount',
      'message', 'Requested amount exceeds available balance',
      'requested', _amount,
      'available', user_balance
    );
  END IF;
  
  RETURN jsonb_build_object(
    'eligible', true,
    'message', 'Payout eligible',
    'amount', _amount,
    'balance', user_balance
  );
END;
$$;

-- Fix unlock_referral_payouts function
CREATE OR REPLACE FUNCTION public.unlock_referral_payouts(_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  user_total_earned NUMERIC;
BEGIN
  -- Get user's total earned amount
  SELECT total_earned INTO user_total_earned 
  FROM public.profiles 
  WHERE user_id = _user_id;
  
  -- Unlock referral payouts where user has reached the threshold
  UPDATE public.referral_payouts 
  SET 
    status = 'unlocked',
    unlocked_at = now(),
    updated_at = now()
  WHERE referrer_id = _user_id 
    AND status = 'locked' 
    AND user_total_earned >= required_threshold;
END;
$$;