-- Fix Security Definer Views by converting them to Security Invoker
-- This addresses the ERROR-level security linter findings

-- Drop and recreate profiles_secure view as SECURITY INVOKER
DROP VIEW IF EXISTS public.profiles_secure;

CREATE VIEW public.profiles_secure 
WITH (security_invoker = true) 
AS
SELECT 
  id,
  user_id,
  CASE 
    WHEN (auth.uid() = user_id OR get_current_user_role() = 'admin') 
    THEN email 
    ELSE mask_email(email) 
  END AS email,
  CASE 
    WHEN (auth.uid() = user_id OR get_current_user_role() = 'admin') 
    THEN full_name 
    ELSE CASE 
      WHEN full_name IS NOT NULL 
      THEN regexp_replace(full_name, '.', '*', 'g') 
      ELSE NULL 
    END 
  END AS full_name,
  CASE 
    WHEN (auth.uid() = user_id OR get_current_user_role() = 'admin') 
    THEN wallet_address 
    ELSE mask_wallet(wallet_address) 
  END AS wallet_address,
  role::text AS role,
  CASE 
    WHEN (auth.uid() = user_id OR get_current_user_role() = 'admin') 
    THEN bonk_balance 
    ELSE NULL 
  END AS bonk_balance,
  CASE 
    WHEN (auth.uid() = user_id OR get_current_user_role() = 'admin') 
    THEN total_earned 
    ELSE NULL 
  END AS total_earned,
  CASE 
    WHEN (auth.uid() = user_id OR get_current_user_role() = 'admin') 
    THEN referral_code 
    ELSE NULL 
  END AS referral_code,
  referred_by,
  created_at,
  updated_at,
  deleted_at
FROM profiles p
WHERE (
  auth.uid() = user_id 
  OR get_current_user_role() = 'admin' 
  OR (deleted_at IS NULL AND auth.role() = 'authenticated')
);

-- Drop and recreate v_wallet_activity view as SECURITY INVOKER  
DROP VIEW IF EXISTS public.v_wallet_activity;

CREATE VIEW public.v_wallet_activity 
WITH (security_invoker = true)
AS
WITH cashback AS (
  SELECT 
    ct.user_id,
    ct.created_at AS happened_at,
    'earning'::text AS type,
    'Cashback'::text AS source,
    ct.bonk_amount::numeric AS amount_bonk,
    ct.cashback_amount::numeric AS amount_fiat_est,
    ct.status::text AS status,
    jsonb_build_object(
      'offer_id', ct.offer_id,
      'purchase_amount', ct.purchase_amount,
      'order_id', ct.order_id
    ) AS meta
  FROM cashback_transactions ct
  WHERE ct.status = ANY(ARRAY['approved'::cashback_status, 'paid'::cashback_status])
    AND ct.is_returned = false
),
referrals AS (
  SELECT 
    rp.beneficiary_id AS user_id,
    rp.created_at AS happened_at,
    'earning'::text AS type,
    'Referral'::text AS source,
    rp.amount AS amount_bonk,
    NULL::numeric AS amount_fiat_est,
    rp.status,
    jsonb_build_object(
      'referrer_id', rp.referrer_id,
      'referred_user_id', rp.referred_user_id
    ) AS meta
  FROM referral_payouts rp
  WHERE rp.status = ANY(ARRAY['unlocked'::text, 'completed'::text])
),
withdrawals AS (
  SELECT 
    pr.user_id,
    pr.requested_at AS happened_at,
    'withdrawal'::text AS type,
    'Withdrawal'::text AS source,
    pr.amount AS amount_bonk,
    NULL::numeric AS amount_fiat_est,
    pr.status,
    jsonb_build_object('wallet_address', pr.wallet_address) AS meta
  FROM payout_requests pr
),
giftcards AS (
  SELECT 
    gr.user_id,
    gr.created_at AS happened_at,
    'withdrawal'::text AS type,
    'Gift Card'::text AS source,
    gr.bonk_amount::numeric AS amount_bonk,
    NULL::numeric AS amount_fiat_est,
    gr.status::text AS status,
    jsonb_build_object('gift_card_id', gr.gift_card_id) AS meta
  FROM gift_card_redemptions gr
),
airdrops AS (
  SELECT 
    bpe.user_id,
    bpe.created_at AS happened_at,
    'earning'::text AS type,
    'Airdrop/Transfer'::text AS source,
    bpe.amount AS amount_bonk,
    NULL::numeric AS amount_fiat_est,
    'completed'::text AS status,
    jsonb_build_object(
      'transfer_id', bpe.transfer_id,
      'description', bpe.description,
      'source', bpe.source
    ) AS meta
  FROM bonk_payout_events bpe
)
SELECT * FROM cashback
UNION ALL SELECT * FROM referrals  
UNION ALL SELECT * FROM withdrawals
UNION ALL SELECT * FROM giftcards
UNION ALL SELECT * FROM airdrops;

-- Drop and recreate v_wallet_balances view as SECURITY INVOKER
DROP VIEW IF EXISTS public.v_wallet_balances;

CREATE VIEW public.v_wallet_balances 
WITH (security_invoker = true)
AS
SELECT 
  p.user_id,
  COALESCE(p.bonk_balance, 0) AS bonk_balance_total,
  COALESCE(locked.total_locked, 0) AS bonk_locked,
  GREATEST(
    COALESCE(p.bonk_balance, 0) - COALESCE(locked.total_locked, 0), 
    0
  ) AS bonk_available
FROM profiles p
LEFT JOIN (
  SELECT 
    user_id,
    SUM(amount_bonk) AS total_locked
  FROM bonk_locks
  WHERE (unlock_at IS NULL OR unlock_at > now())
  GROUP BY user_id
) locked ON p.user_id = locked.user_id
WHERE p.deleted_at IS NULL;