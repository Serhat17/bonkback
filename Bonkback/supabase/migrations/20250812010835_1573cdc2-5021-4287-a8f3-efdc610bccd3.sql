-- Recreate profiles_secure to restrict rows to owner or admins only
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
WHERE (p.user_id = auth.uid()) OR (public.get_current_user_role() = 'admin');

-- Ensure strict grants
REVOKE ALL ON TABLE public.profiles_secure FROM PUBLIC;
GRANT SELECT ON TABLE public.profiles_secure TO authenticated;