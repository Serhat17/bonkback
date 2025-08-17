-- Fix wallet balances security by recreating the view with built-in security filtering
-- This ensures users can only see their own wallet balance data

-- Drop and recreate v_wallet_balances view with security filtering built-in
DROP VIEW IF EXISTS public.v_wallet_balances CASCADE;

CREATE VIEW public.v_wallet_balances 
WITH (security_invoker = true)
AS
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
  AND (auth.uid() = p.user_id OR get_current_user_role() = 'admin');