-- Fix the get_my_secure_profile function to properly return current user's profile
CREATE OR REPLACE FUNCTION public.get_my_secure_profile()
RETURNS TABLE(
  id uuid, 
  user_id uuid, 
  email text, 
  full_name text, 
  wallet_address text, 
  role text, 
  bonk_balance numeric, 
  total_earned numeric, 
  referral_code text, 
  referred_by uuid, 
  created_at timestamp with time zone, 
  updated_at timestamp with time zone, 
  deleted_at timestamp with time zone
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

  -- Return the current user's profile data directly from profiles table
  RETURN QUERY
  SELECT 
    p.id,
    p.user_id,
    p.email,
    p.full_name,
    p.wallet_address,
    p.role::text AS role,
    p.bonk_balance,
    p.total_earned,
    p.referral_code,
    p.referred_by,
    p.created_at,
    p.updated_at,
    p.deleted_at
  FROM public.profiles p
  WHERE p.user_id = v_user 
    AND p.deleted_at IS NULL;
END;
$$;