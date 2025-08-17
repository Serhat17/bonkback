-- 1) Masking helpers for defense-in-depth
CREATE OR REPLACE FUNCTION public.mask_email(p_email text)
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT CASE 
    WHEN p_email IS NULL OR length(p_email) = 0 THEN NULL
    ELSE
      -- keep first 2 chars of local part and mask domain completely
      (regexp_replace(split_part(p_email,'@',1), '(.{0,2}).*', '\1') || '***@***')
  END
$$;

CREATE OR REPLACE FUNCTION public.mask_wallet(p_wallet text)
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT CASE 
    WHEN p_wallet IS NULL OR length(p_wallet) = 0 THEN NULL
    WHEN length(p_wallet) <= 8 THEN '****'
    ELSE left(p_wallet, 4) || '****' || right(p_wallet, 4)
  END
$$;

-- 2) Secure read view with masking (applies even if mistakenly queried broadly)
DROP VIEW IF EXISTS public.profiles_secure CASCADE;
CREATE VIEW public.profiles_secure
WITH (security_barrier=true)
AS
SELECT
  p.id,
  p.user_id,
  CASE 
    WHEN auth.uid() = p.user_id OR public.get_current_user_role() = 'admin' THEN p.email
    ELSE public.mask_email(p.email)
  END AS email,
  p.full_name,
  CASE 
    WHEN auth.uid() = p.user_id OR public.get_current_user_role() = 'admin' THEN p.wallet_address
    ELSE public.mask_wallet(p.wallet_address)
  END AS wallet_address,
  p.role::text AS role,
  p.bonk_balance,
  p.total_earned,
  p.referral_code,
  p.referred_by,
  p.created_at,
  p.updated_at,
  p.deleted_at
FROM public.profiles p
WHERE p.deleted_at IS NULL OR public.get_current_user_role() = 'admin';

-- 3) Restrict exposure to authenticated only (no anon)
REVOKE ALL ON TABLE public.profiles_secure FROM PUBLIC;
GRANT SELECT ON TABLE public.profiles_secure TO authenticated;