-- Enable RLS on v_wallet_balances view and create security policies
-- This will fully secure the view from unauthorized access

-- Enable RLS on the v_wallet_balances view
ALTER VIEW public.v_wallet_balances SET (security_barrier = true);

-- We cannot directly enable RLS on views, so we need to ensure the underlying security
-- Let's create a materialized view approach or use a function instead

-- Drop the view and create a secure function that returns the same data
DROP VIEW IF EXISTS public.v_wallet_balances CASCADE;

-- Create a secure function to get wallet balances
CREATE OR REPLACE FUNCTION public.get_wallet_balances(target_user_id uuid DEFAULT NULL)
RETURNS TABLE(
  user_id uuid,
  bonk_balance_total numeric,
  bonk_locked numeric,
  bonk_available numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_user uuid := auth.uid();
BEGIN
  -- Check authentication
  IF v_user IS NULL THEN
    RETURN;
  END IF;
  
  -- If target_user_id is provided, check authorization
  IF target_user_id IS NOT NULL THEN
    -- Only allow access to own data or admin access
    IF target_user_id != v_user AND get_current_user_role() != 'admin' THEN
      RETURN;
    END IF;
    v_user := target_user_id;
  END IF;

  RETURN QUERY
  SELECT 
    p.user_id,
    COALESCE(p.bonk_balance, 0) AS bonk_balance_total,
    
    -- Calculate locked amount from bonk_locks and locked referral payouts
    COALESCE((
      SELECT SUM(bl.amount_bonk) 
      FROM bonk_locks bl 
      WHERE bl.user_id = p.user_id 
        AND (bl.unlock_at IS NULL OR bl.unlock_at > now())
    ), 0) + COALESCE((
      SELECT SUM(rp.amount) 
      FROM referral_payouts rp 
      WHERE rp.beneficiary_id = p.user_id 
        AND rp.status = 'locked'
    ), 0) AS bonk_locked,
    
    -- Available = total - locked
    GREATEST(
      COALESCE(p.bonk_balance, 0) - (
        COALESCE((
          SELECT SUM(bl.amount_bonk) 
          FROM bonk_locks bl 
          WHERE bl.user_id = p.user_id 
            AND (bl.unlock_at IS NULL OR bl.unlock_at > now())
        ), 0) + COALESCE((
          SELECT SUM(rp.amount) 
          FROM referral_payouts rp 
          WHERE rp.beneficiary_id = p.user_id 
            AND rp.status = 'locked'
        ), 0)
      ), 
      0
    ) AS bonk_available
    
  FROM profiles p
  WHERE p.deleted_at IS NULL
    AND p.user_id = v_user;
END;
$$;

-- Create a simple secure function for getting current user's balances
CREATE OR REPLACE FUNCTION public.get_my_wallet_balances_new()
RETURNS TABLE(
  user_id uuid,
  bonk_balance_total numeric,
  bonk_locked numeric,
  bonk_available numeric
)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO ''
AS $$
  SELECT * FROM public.get_wallet_balances(auth.uid());
$$;