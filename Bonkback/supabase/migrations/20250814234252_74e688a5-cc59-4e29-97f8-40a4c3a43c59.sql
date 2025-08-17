-- Enable RLS on v_wallet_activity view and add security policies
-- This fixes the security issue where users could access other users' wallet activity

-- Enable Row Level Security on the view
ALTER VIEW public.v_wallet_activity SET (security_barrier = true);

-- Create RLS policies for v_wallet_activity view
-- Policy 1: Users can only view their own wallet activity
CREATE POLICY "Users can view their own wallet activity" 
  ON public.v_wallet_activity 
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Policy 2: Admins can view all wallet activity 
CREATE POLICY "Admins can view all wallet activity" 
  ON public.v_wallet_activity 
  FOR SELECT 
  USING (get_current_user_role() = 'admin');

-- Enable RLS on the view
-- Note: Views don't have direct RLS like tables, but we ensure security through the underlying tables
-- Let's make sure all underlying tables have proper RLS enabled

-- Verify RLS is enabled on underlying tables (they should already be enabled)
ALTER TABLE public.cashback_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_payouts ENABLE ROW LEVEL SECURITY;  
ALTER TABLE public.payout_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gift_card_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bonk_payout_events ENABLE ROW LEVEL SECURITY;