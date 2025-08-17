-- Fix security issue with profiles_secure view
-- The current view is reasonably secure but can be improved

-- First, let's drop the existing view
DROP VIEW IF EXISTS public.profiles_secure;

-- Create a more secure version that ensures proper access control
-- and handles edge cases better
CREATE VIEW public.profiles_secure 
WITH (security_invoker = true) AS
SELECT 
  p.id,
  p.user_id,
  CASE 
    WHEN (auth.uid() = p.user_id OR get_current_user_role() = 'admin') 
    THEN p.email 
    ELSE mask_email(p.email)
  END AS email,
  CASE 
    WHEN (auth.uid() = p.user_id OR get_current_user_role() = 'admin') 
    THEN p.full_name 
    ELSE CASE 
      WHEN p.full_name IS NOT NULL THEN regexp_replace(p.full_name, '.', '*', 'g')
      ELSE NULL
    END
  END AS full_name,
  CASE 
    WHEN (auth.uid() = p.user_id OR get_current_user_role() = 'admin') 
    THEN p.wallet_address 
    ELSE mask_wallet(p.wallet_address)
  END AS wallet_address,
  p.role::text,
  CASE 
    WHEN (auth.uid() = p.user_id OR get_current_user_role() = 'admin') 
    THEN p.bonk_balance 
    ELSE NULL
  END AS bonk_balance,
  CASE 
    WHEN (auth.uid() = p.user_id OR get_current_user_role() = 'admin') 
    THEN p.total_earned 
    ELSE NULL
  END AS total_earned,
  CASE 
    WHEN (auth.uid() = p.user_id OR get_current_user_role() = 'admin') 
    THEN p.referral_code 
    ELSE NULL
  END AS referral_code,
  p.referred_by,
  p.created_at,
  p.updated_at,
  p.deleted_at
FROM public.profiles p
WHERE 
  -- Only show profiles that the user has permission to see
  (
    -- User can see their own profile (including soft-deleted)
    auth.uid() = p.user_id 
    OR 
    -- Admins can see all profiles (including soft-deleted)
    get_current_user_role() = 'admin'
    OR 
    -- Regular users can see public info of non-deleted profiles
    (p.deleted_at IS NULL AND auth.role() = 'authenticated')
  );

-- Create a secure function to get user's own secure profile data
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
  created_at timestamptz,
  updated_at timestamptz,
  deleted_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user uuid := auth.uid();
BEGIN
  -- Check if user is authenticated
  IF v_user IS NULL THEN
    RETURN;
  END IF;

  -- Return only the current user's complete profile data
  RETURN QUERY
  SELECT 
    p.id,
    p.user_id,
    p.email,
    p.full_name,
    p.wallet_address,
    p.role::text,
    p.bonk_balance,
    p.total_earned,
    p.referral_code,
    p.referred_by,
    p.created_at,
    p.updated_at,
    p.deleted_at
  FROM public.profiles p
  WHERE p.user_id = v_user;
END;
$$;

-- Create a secure function for admins to get any user's secure profile
CREATE OR REPLACE FUNCTION public.admin_get_secure_profile(target_user_id uuid)
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
  created_at timestamptz,
  updated_at timestamptz,
  deleted_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Check if current user is admin
  IF get_current_user_role() != 'admin' THEN
    RAISE EXCEPTION 'Unauthorized: Admin role required';
  END IF;

  -- Return the specified user's complete profile data
  RETURN QUERY
  SELECT 
    p.id,
    p.user_id,
    p.email,
    p.full_name,
    p.wallet_address,
    p.role::text,
    p.bonk_balance,
    p.total_earned,
    p.referral_code,
    p.referred_by,
    p.created_at,
    p.updated_at,
    p.deleted_at
  FROM public.profiles p
  WHERE p.user_id = target_user_id;
END;
$$;