-- Enable RLS on v_wallet_balances view
ALTER TABLE public.v_wallet_balances ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only view their own wallet balances
CREATE POLICY "Users can view their own wallet balances" 
ON public.v_wallet_balances 
FOR SELECT 
USING (auth.uid() = user_id);

-- Policy: Admins can view all wallet balances (for administrative purposes)
CREATE POLICY "Admins can view all wallet balances" 
ON public.v_wallet_balances 
FOR SELECT 
USING (get_current_user_role() = 'admin');

-- Also secure the v_wallet_activity view while we're at it (same issue)
ALTER TABLE public.v_wallet_activity ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only view their own wallet activity
CREATE POLICY "Users can view their own wallet activity" 
ON public.v_wallet_activity 
FOR SELECT 
USING (auth.uid() = user_id);

-- Policy: Admins can view all wallet activity
CREATE POLICY "Admins can view all wallet activity" 
ON public.v_wallet_activity 
FOR SELECT 
USING (get_current_user_role() = 'admin');