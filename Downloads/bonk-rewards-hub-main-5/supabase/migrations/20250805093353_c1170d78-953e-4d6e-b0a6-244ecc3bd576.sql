-- First run the migration to fix RLS policies
-- Fix get_current_user_role function to use SECURITY DEFINER properly
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO ''
AS $function$
  SELECT role::text FROM public.profiles WHERE user_id = auth.uid();
$function$;

-- Drop existing admin policies to recreate them with the fixed function
DROP POLICY IF EXISTS "Admins can manage offers" ON public.cashback_offers;
DROP POLICY IF EXISTS "Admins can view all transactions" ON public.cashback_transactions;
DROP POLICY IF EXISTS "Admins can view all redemptions" ON public.gift_card_redemptions;
DROP POLICY IF EXISTS "Admins can manage gift cards" ON public.gift_cards;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can manage all referrals" ON public.referrals;
DROP POLICY IF EXISTS "Admins can manage system settings" ON public.system_settings;

-- Recreate admin policies using the fixed function
CREATE POLICY "Admins can manage offers" 
ON public.cashback_offers 
FOR ALL 
TO authenticated
USING (public.get_current_user_role() = 'admin');

CREATE POLICY "Admins can view all transactions" 
ON public.cashback_transactions 
FOR ALL 
TO authenticated
USING (public.get_current_user_role() = 'admin');

CREATE POLICY "Admins can view all redemptions" 
ON public.gift_card_redemptions 
FOR ALL 
TO authenticated
USING (public.get_current_user_role() = 'admin');

CREATE POLICY "Admins can manage gift cards" 
ON public.gift_cards 
FOR ALL 
TO authenticated
USING (public.get_current_user_role() = 'admin');

CREATE POLICY "Admins can view all profiles" 
ON public.profiles 
FOR ALL 
TO authenticated
USING (public.get_current_user_role() = 'admin');

CREATE POLICY "Admins can manage all referrals" 
ON public.referrals 
FOR ALL 
TO authenticated
USING (public.get_current_user_role() = 'admin');

CREATE POLICY "Admins can manage system settings" 
ON public.system_settings 
FOR ALL 
TO authenticated
USING (public.get_current_user_role() = 'admin');

-- Update serhat.bilge@icloud.com to admin role
UPDATE public.profiles 
SET role = 'admin' 
WHERE email = 'serhat.bilge@icloud.com';

-- Add payout requests table
CREATE TABLE IF NOT EXISTS public.payout_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  amount NUMERIC NOT NULL,
  wallet_address TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'paid')),
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE,
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on payout requests
ALTER TABLE public.payout_requests ENABLE ROW LEVEL SECURITY;

-- Payout request policies
CREATE POLICY "Users can view their own payout requests" 
ON public.payout_requests 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own payout requests" 
ON public.payout_requests 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all payout requests" 
ON public.payout_requests 
FOR ALL 
TO authenticated
USING (public.get_current_user_role() = 'admin');

-- Update trigger for payout requests
CREATE TRIGGER update_payout_requests_updated_at
  BEFORE UPDATE ON public.payout_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();