-- Replace profiles_secure view with a secure function to satisfy security requirements
-- This provides better security guarantees than a view

-- Drop the view
DROP VIEW IF EXISTS public.profiles_secure CASCADE;

-- Create a secure function to get profile data
CREATE OR REPLACE FUNCTION public.get_secure_profile(target_user_id uuid DEFAULT NULL)
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
  v_target uuid;
BEGIN
  -- Check authentication
  IF v_user IS NULL THEN
    RETURN;
  END IF;
  
  -- Determine target user
  v_target := COALESCE(target_user_id, v_user);
  
  -- Security check: only allow access to own data or admin access
  IF v_target != v_user AND get_current_user_role() != 'admin' THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT 
    p.id,
    p.user_id,
    CASE
      WHEN (v_user = p.user_id) OR (get_current_user_role() = 'admin') THEN p.email
      ELSE mask_email(p.email)
    END AS email,
    CASE
      WHEN (v_user = p.user_id) OR (get_current_user_role() = 'admin') THEN p.full_name
      ELSE
      CASE
        WHEN (p.full_name IS NOT NULL) THEN regexp_replace(p.full_name, '.', '*', 'g')
        ELSE NULL::text
      END
    END AS full_name,
    CASE
      WHEN (v_user = p.user_id) OR (get_current_user_role() = 'admin') THEN p.wallet_address
      ELSE mask_wallet(p.wallet_address)
    END AS wallet_address,
    p.role::text AS role,
    CASE
      WHEN (v_user = p.user_id) OR (get_current_user_role() = 'admin') THEN p.bonk_balance
      ELSE NULL::numeric
    END AS bonk_balance,
    CASE
      WHEN (v_user = p.user_id) OR (get_current_user_role() = 'admin') THEN p.total_earned
      ELSE NULL::numeric
    END AS total_earned,
    CASE
      WHEN (v_user = p.user_id) OR (get_current_user_role() = 'admin') THEN p.referral_code
      ELSE NULL::text
    END AS referral_code,
    p.referred_by,
    p.created_at,
    p.updated_at,
    p.deleted_at
  FROM profiles p
  WHERE p.user_id = v_target AND p.deleted_at IS NULL;
END;
$$;

-- Create a convenience function for getting current user's profile
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
LANGUAGE sql
SECURITY DEFINER
SET search_path TO ''
AS $$
  SELECT * FROM public.get_secure_profile(auth.uid());
$$;