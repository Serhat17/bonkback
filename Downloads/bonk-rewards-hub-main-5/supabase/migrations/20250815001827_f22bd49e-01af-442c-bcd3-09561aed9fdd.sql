-- Fix profiles_secure view security vulnerability
-- Remove the clause that allows any authenticated user to see all profiles

DROP VIEW IF EXISTS public.profiles_secure CASCADE;

CREATE VIEW public.profiles_secure 
WITH (security_invoker = true)
AS
SELECT 
    id,
    user_id,
    CASE
        WHEN ((auth.uid() = user_id) OR (get_current_user_role() = 'admin'::text)) THEN email
        ELSE mask_email(email)
    END AS email,
    CASE
        WHEN ((auth.uid() = user_id) OR (get_current_user_role() = 'admin'::text)) THEN full_name
        ELSE
        CASE
            WHEN (full_name IS NOT NULL) THEN regexp_replace(full_name, '.', '*', 'g')
            ELSE NULL::text
        END
    END AS full_name,
    CASE
        WHEN ((auth.uid() = user_id) OR (get_current_user_role() = 'admin'::text)) THEN wallet_address
        ELSE mask_wallet(wallet_address)
    END AS wallet_address,
    (role)::text AS role,
    CASE
        WHEN ((auth.uid() = user_id) OR (get_current_user_role() = 'admin'::text)) THEN bonk_balance
        ELSE NULL::numeric
    END AS bonk_balance,
    CASE
        WHEN ((auth.uid() = user_id) OR (get_current_user_role() = 'admin'::text)) THEN total_earned
        ELSE NULL::numeric
    END AS total_earned,
    CASE
        WHEN ((auth.uid() = user_id) OR (get_current_user_role() = 'admin'::text)) THEN referral_code
        ELSE NULL::text
    END AS referral_code,
    referred_by,
    created_at,
    updated_at,
    deleted_at
FROM profiles p
WHERE (auth.uid() = user_id) OR (get_current_user_role() = 'admin'::text);