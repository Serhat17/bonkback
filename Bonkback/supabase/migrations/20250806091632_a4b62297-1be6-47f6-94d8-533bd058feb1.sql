-- Create bonk_transfers table for tracking all BONK token transfers
CREATE TABLE public.bonk_transfers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  wallet_address TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  tx_hash TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  source_type TEXT NOT NULL, -- 'cashback', 'referral', 'promo', 'manual'
  source_id UUID, -- reference to cashback_transaction, referral, etc
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create bonk_payout_events table for audit trail
CREATE TABLE public.bonk_payout_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  transfer_id UUID NOT NULL REFERENCES public.bonk_transfers(id),
  user_id UUID NOT NULL,
  source TEXT NOT NULL, -- 'cashback', 'referral', 'promo'
  amount NUMERIC NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create referral_payouts table for tracking referral earnings
CREATE TABLE public.referral_payouts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_id UUID NOT NULL,
  referred_user_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'locked', -- 'locked', 'unlocked', 'paid'
  amount NUMERIC NOT NULL,
  required_threshold NUMERIC NOT NULL,
  unlocked_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create payout_rate_limits table for abuse prevention
CREATE TABLE public.payout_rate_limits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  last_payout_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  payout_count INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS on all tables
ALTER TABLE public.bonk_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bonk_payout_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payout_rate_limits ENABLE ROW LEVEL SECURITY;

-- RLS policies for bonk_transfers
CREATE POLICY "Users can view their own transfers" 
ON public.bonk_transfers 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all transfers" 
ON public.bonk_transfers 
FOR ALL 
USING (get_current_user_role() = 'admin');

-- RLS policies for bonk_payout_events
CREATE POLICY "Users can view their own payout events" 
ON public.bonk_payout_events 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all payout events" 
ON public.bonk_payout_events 
FOR ALL 
USING (get_current_user_role() = 'admin');

-- RLS policies for referral_payouts
CREATE POLICY "Users can view their own referral payouts" 
ON public.referral_payouts 
FOR SELECT 
USING (auth.uid() = referrer_id OR auth.uid() = referred_user_id);

CREATE POLICY "Admins can manage all referral payouts" 
ON public.referral_payouts 
FOR ALL 
USING (get_current_user_role() = 'admin');

-- RLS policies for payout_rate_limits
CREATE POLICY "Users can view their own rate limits" 
ON public.payout_rate_limits 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "System can manage rate limits" 
ON public.payout_rate_limits 
FOR ALL 
USING (true);

-- Create triggers for updated_at
CREATE TRIGGER update_bonk_transfers_updated_at
BEFORE UPDATE ON public.bonk_transfers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_referral_payouts_updated_at
BEFORE UPDATE ON public.referral_payouts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to check payout eligibility
CREATE OR REPLACE FUNCTION public.check_payout_eligibility(
  _user_id UUID,
  _amount NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
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

-- Function to unlock referral payouts when user reaches threshold
CREATE OR REPLACE FUNCTION public.unlock_referral_payouts(_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
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

-- Add wallet_address to profiles if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' 
    AND column_name = 'wallet_address'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN wallet_address TEXT;
  END IF;
END $$;

-- Update process_referral_reward function to use new system
CREATE OR REPLACE FUNCTION public.process_referral_reward(referred_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  referrer_id UUID;
  reward_amount NUMERIC := 333333; -- €5 worth of BONK at $0.000015
  required_threshold NUMERIC := 666666; -- €10 required to unlock €5 referral
BEGIN
  -- Get referrer
  SELECT referred_by INTO referrer_id 
  FROM public.profiles 
  WHERE user_id = referred_user_id 
  AND referred_by IS NOT NULL;
  
  IF referrer_id IS NOT NULL THEN
    -- Update referrer's balance
    UPDATE public.profiles 
    SET bonk_balance = bonk_balance + reward_amount,
        total_earned = total_earned + reward_amount
    WHERE user_id = referrer_id;
    
    -- Update referred user's balance
    UPDATE public.profiles 
    SET bonk_balance = bonk_balance + reward_amount,
        total_earned = total_earned + reward_amount
    WHERE user_id = referred_user_id;
    
    -- Create referral payout record (locked until threshold met)
    INSERT INTO public.referral_payouts (
      referrer_id, 
      referred_user_id, 
      amount, 
      required_threshold,
      status
    ) VALUES (
      referrer_id, 
      referred_user_id, 
      reward_amount, 
      required_threshold,
      'locked'
    );
    
    -- Try to unlock any eligible payouts
    PERFORM public.unlock_referral_payouts(referrer_id);
    PERFORM public.unlock_referral_payouts(referred_user_id);
    
    -- Create or update referral record
    INSERT INTO public.referrals (referrer_id, referred_id, referral_code, reward_claimed, referred_user_claimed)
    SELECT 
      referrer_id,
      referred_user_id,
      (SELECT referral_code FROM public.profiles WHERE user_id = referrer_id),
      TRUE,
      TRUE
    ON CONFLICT (referrer_id, referred_id) 
    DO UPDATE SET 
      reward_claimed = TRUE,
      referred_user_claimed = TRUE,
      updated_at = now();
  END IF;
END;
$$;