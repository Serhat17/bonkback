-- Since we can't apply RLS directly to views, we need to create secure RPC functions
-- that provide the same functionality but with proper access control

-- Create a secure function to get user's own wallet balances
CREATE OR REPLACE FUNCTION public.get_my_wallet_balances_secure()
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
  -- Check if user is authenticated
  IF v_user IS NULL THEN
    RETURN;
  END IF;

  -- Return only the current user's wallet balance data
  RETURN QUERY
  SELECT 
    vwb.user_id,
    vwb.bonk_balance_total,
    vwb.bonk_locked,
    vwb.bonk_available
  FROM public.v_wallet_balances vwb
  WHERE vwb.user_id = v_user;
END;
$$;

-- Create a secure function to get user's own wallet activity
CREATE OR REPLACE FUNCTION public.get_my_wallet_activity_secure()
RETURNS TABLE(
  user_id uuid,
  happened_at timestamp with time zone,
  type text,
  status text,
  amount_bonk numeric,
  amount_fiat_est numeric,
  source text,
  meta jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_user uuid := auth.uid();
BEGIN
  -- Check if user is authenticated
  IF v_user IS NULL THEN
    RETURN;
  END IF;

  -- Return only the current user's wallet activity data
  RETURN QUERY
  SELECT 
    vwa.user_id,
    vwa.happened_at,
    vwa.type,
    vwa.status,
    vwa.amount_bonk,
    vwa.amount_fiat_est,
    vwa.source,
    vwa.meta
  FROM public.v_wallet_activity vwa
  WHERE vwa.user_id = v_user
  ORDER BY vwa.happened_at DESC;
END;
$$;

-- Admin function to get any user's wallet balances (for admin dashboard)
CREATE OR REPLACE FUNCTION public.admin_get_user_wallet_balances(target_user_id uuid)
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
BEGIN
  -- Check if current user is admin
  IF get_current_user_role() != 'admin' THEN
    RAISE EXCEPTION 'Unauthorized: Admin role required';
  END IF;

  -- Return the specified user's wallet balance data
  RETURN QUERY
  SELECT 
    vwb.user_id,
    vwb.bonk_balance_total,
    vwb.bonk_locked,
    vwb.bonk_available
  FROM public.v_wallet_balances vwb
  WHERE vwb.user_id = target_user_id;
END;
$$;

-- Admin function to get any user's wallet activity (for admin dashboard)
CREATE OR REPLACE FUNCTION public.admin_get_user_wallet_activity(target_user_id uuid)
RETURNS TABLE(
  user_id uuid,
  happened_at timestamp with time zone,
  type text,
  status text,
  amount_bonk numeric,
  amount_fiat_est numeric,
  source text,
  meta jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  -- Check if current user is admin
  IF get_current_user_role() != 'admin' THEN
    RAISE EXCEPTION 'Unauthorized: Admin role required';
  END IF;

  -- Return the specified user's wallet activity data
  RETURN QUERY
  SELECT 
    vwa.user_id,
    vwa.happened_at,
    vwa.type,
    vwa.status,
    vwa.amount_bonk,
    vwa.amount_fiat_est,
    vwa.source,
    vwa.meta
  FROM public.v_wallet_activity vwa
  WHERE vwa.user_id = target_user_id
  ORDER BY vwa.happened_at DESC;
END;
$$;