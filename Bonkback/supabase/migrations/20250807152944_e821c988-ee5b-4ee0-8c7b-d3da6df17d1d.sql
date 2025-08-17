-- ==========================================
-- CRITICAL DATABASE & SECURITY ENHANCEMENTS
-- Phase 1: Production Hardening Migration
-- ==========================================

-- 1. ADD MISSING INDEXES FOR PERFORMANCE
-- ==========================================
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_referral_code ON public.profiles(referral_code);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_created_at ON public.profiles(created_at);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cashback_transactions_user_id ON public.cashback_transactions(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cashback_transactions_offer_id ON public.cashback_transactions(offer_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cashback_transactions_status ON public.cashback_transactions(status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cashback_transactions_created_at ON public.cashback_transactions(created_at);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bonk_transfers_user_id ON public.bonk_transfers(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bonk_transfers_status ON public.bonk_transfers(status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bonk_transfers_created_at ON public.bonk_transfers(created_at);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payout_requests_user_id ON public.payout_requests(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payout_requests_status ON public.payout_requests(status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payout_requests_created_at ON public.payout_requests(created_at);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_referrals_referrer_id ON public.referrals(referrer_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_referrals_referred_id ON public.referrals(referred_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_referrals_created_at ON public.referrals(created_at);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cashback_offers_status ON public.cashback_offers(status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cashback_offers_merchant_name ON public.cashback_offers(merchant_name);

-- 2. ADD VALIDATION CONSTRAINTS
-- ==========================================

-- Email format validation
ALTER TABLE public.profiles 
ADD CONSTRAINT valid_email_format 
CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

-- Positive value checks
ALTER TABLE public.profiles 
ADD CONSTRAINT positive_bonk_balance 
CHECK (bonk_balance >= 0);

ALTER TABLE public.profiles 
ADD CONSTRAINT positive_total_earned 
CHECK (total_earned >= 0);

ALTER TABLE public.cashback_transactions 
ADD CONSTRAINT positive_purchase_amount 
CHECK (purchase_amount > 0);

ALTER TABLE public.cashback_transactions 
ADD CONSTRAINT positive_cashback_amount 
CHECK (cashback_amount >= 0);

ALTER TABLE public.cashback_transactions 
ADD CONSTRAINT positive_bonk_amount 
CHECK (bonk_amount >= 0);

ALTER TABLE public.bonk_transfers 
ADD CONSTRAINT positive_transfer_amount 
CHECK (amount > 0);

ALTER TABLE public.payout_requests 
ADD CONSTRAINT positive_payout_amount 
CHECK (amount > 0);

ALTER TABLE public.cashback_offers 
ADD CONSTRAINT positive_cashback_percentage 
CHECK (cashback_percentage > 0 AND cashback_percentage <= 100);

ALTER TABLE public.gift_cards 
ADD CONSTRAINT positive_bonk_price 
CHECK (bonk_price > 0);

ALTER TABLE public.gift_cards 
ADD CONSTRAINT positive_fiat_value 
CHECK (fiat_value > 0);

-- 3. ADD FOREIGN KEY CONSTRAINTS
-- ==========================================

-- Add foreign key for cashback_transactions.offer_id
ALTER TABLE public.cashback_transactions 
ADD CONSTRAINT fk_cashback_transactions_offer_id 
FOREIGN KEY (offer_id) REFERENCES public.cashback_offers(id) ON DELETE SET NULL;

-- Add foreign key for gift_card_redemptions.gift_card_id
ALTER TABLE public.gift_card_redemptions 
ADD CONSTRAINT fk_gift_card_redemptions_gift_card_id 
FOREIGN KEY (gift_card_id) REFERENCES public.gift_cards(id) ON DELETE RESTRICT;

-- Add foreign key for profiles.referred_by
ALTER TABLE public.profiles 
ADD CONSTRAINT fk_profiles_referred_by 
FOREIGN KEY (referred_by) REFERENCES public.profiles(user_id) ON DELETE SET NULL;

-- 4. CREATE RATE LIMITING TABLE & RLS
-- ==========================================

CREATE TABLE IF NOT EXISTS public.rate_limits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  action_type TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 1,
  window_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- RLS policies for rate_limits
CREATE POLICY "Users can view their own rate limits" 
ON public.rate_limits 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "System can manage all rate limits" 
ON public.rate_limits 
FOR ALL 
USING (true);

-- Indexes for rate_limits
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_rate_limits_user_id ON public.rate_limits(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_rate_limits_action_type ON public.rate_limits(action_type);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_rate_limits_window_start ON public.rate_limits(window_start);

-- Create secure check_rate_limit function
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  _user_id UUID,
  _action_type TEXT,
  _max_count INTEGER DEFAULT 10,
  _window_minutes INTEGER DEFAULT 60
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  current_count INTEGER;
  window_start TIMESTAMP WITH TIME ZONE;
BEGIN
  window_start := now() - (INTERVAL '1 minute' * _window_minutes);
  
  -- Get current count for this user and action within the window
  SELECT COALESCE(SUM(count), 0) INTO current_count
  FROM public.rate_limits
  WHERE user_id = _user_id 
    AND action_type = _action_type 
    AND window_start > window_start;
  
  -- Check if limit exceeded
  IF current_count >= _max_count THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'current_count', current_count,
      'max_count', _max_count,
      'reset_at', window_start + (INTERVAL '1 minute' * _window_minutes)
    );
  END IF;
  
  -- Increment counter
  INSERT INTO public.rate_limits (user_id, action_type, count, window_start)
  VALUES (_user_id, _action_type, 1, now())
  ON CONFLICT (user_id, action_type, window_start)
  DO UPDATE SET count = rate_limits.count + 1, updated_at = now();
  
  RETURN jsonb_build_object(
    'allowed', true,
    'current_count', current_count + 1,
    'max_count', _max_count
  );
END;
$$;

-- 5. CREATE ERROR LOGGING TABLE
-- ==========================================

CREATE TABLE IF NOT EXISTS public.error_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NULL,
  error_message TEXT NOT NULL,
  stack_trace TEXT NULL,
  url TEXT NULL,
  user_agent TEXT NULL,
  severity TEXT NOT NULL DEFAULT 'error',
  component TEXT NULL,
  additional_data JSONB NULL,
  resolved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;

-- RLS policy for error_logs (admins only)
CREATE POLICY "Only admins can access error logs" 
ON public.error_logs 
FOR ALL 
USING (get_current_user_role() = 'admin');

-- Indexes for error_logs
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_error_logs_user_id ON public.error_logs(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_error_logs_severity ON public.error_logs(severity);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_error_logs_created_at ON public.error_logs(created_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_error_logs_resolved ON public.error_logs(resolved);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_error_logs_component ON public.error_logs(component);

-- 6. ENHANCED ACCOUNT DELETION FUNCTION
-- ==========================================

CREATE OR REPLACE FUNCTION public.delete_user_account_enhanced(target_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  user_profile RECORD;
BEGIN
  -- Security check: Admin or owner only
  IF get_current_user_role() IS DISTINCT FROM 'admin' AND auth.uid() != target_user_id THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'Unauthorized: Only admin or account owner can delete account'
    );
  END IF;

  -- Get user profile for logging
  SELECT user_id, email, full_name, bonk_balance, total_earned, created_at
  INTO user_profile
  FROM public.profiles
  WHERE user_id = target_user_id AND deleted_at IS NULL;

  IF user_profile IS NULL THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'User not found or already deleted'
    );
  END IF;

  -- Log user data before deletion
  INSERT INTO public.deleted_users_log (
    id, email, full_name, reason, 
    additional_data
  ) VALUES (
    user_profile.user_id,
    user_profile.email,
    user_profile.full_name,
    'Account deletion request - GDPR compliance',
    jsonb_build_object(
      'bonk_balance', user_profile.bonk_balance,
      'total_earned', user_profile.total_earned,
      'account_created', user_profile.created_at,
      'deleted_by', CASE WHEN auth.uid() = target_user_id THEN 'self' ELSE 'admin' END
    )
  );

  -- Delete from all related tables (cascading cleanup)
  DELETE FROM public.error_logs WHERE user_id = target_user_id;
  DELETE FROM public.rate_limits WHERE user_id = target_user_id;
  DELETE FROM public.referral_payouts WHERE referrer_id = target_user_id OR referred_user_id = target_user_id;
  DELETE FROM public.referrals WHERE referrer_id = target_user_id OR referred_id = target_user_id;
  DELETE FROM public.cashback_transactions WHERE user_id = target_user_id;
  DELETE FROM public.gift_card_redemptions WHERE user_id = target_user_id;
  DELETE FROM public.payout_requests WHERE user_id = target_user_id;
  DELETE FROM public.bonk_transfers WHERE user_id = target_user_id;
  DELETE FROM public.bonk_payout_events WHERE user_id = target_user_id;
  DELETE FROM public.payout_rate_limits WHERE user_id = target_user_id;

  -- Soft delete profile (for audit trail)
  UPDATE public.profiles 
  SET 
    deleted_at = now(), 
    updated_at = now(),
    email = null,
    full_name = 'DELETED_USER',
    wallet_address = null,
    referral_code = null
  WHERE user_id = target_user_id AND deleted_at IS NULL;
  
  -- Hard delete from auth.users (triggers cascade cleanup)
  DELETE FROM auth.users WHERE id = target_user_id;

  RETURN jsonb_build_object(
    'success', true, 
    'message', 'Account and all associated data successfully deleted',
    'deleted_user_id', target_user_id,
    'deletion_logged', true
  );

EXCEPTION WHEN OTHERS THEN
  -- Log the error
  INSERT INTO public.error_logs (
    user_id, error_message, stack_trace, component, severity
  ) VALUES (
    target_user_id, 
    'Account deletion failed: ' || SQLERRM,
    SQLSTATE,
    'delete_user_account_enhanced',
    'critical'
  );
  
  RETURN jsonb_build_object(
    'success', false, 
    'error', 'Account deletion failed: ' || SQLERRM
  );
END;
$$;

-- Add unique constraint to rate_limits for proper conflict handling
ALTER TABLE public.rate_limits 
ADD CONSTRAINT unique_rate_limit_window 
UNIQUE (user_id, action_type, window_start);

-- Add update trigger for updated_at columns
CREATE TRIGGER update_rate_limits_updated_at
  BEFORE UPDATE ON public.rate_limits
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_error_logs_updated_at
  BEFORE UPDATE ON public.error_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();