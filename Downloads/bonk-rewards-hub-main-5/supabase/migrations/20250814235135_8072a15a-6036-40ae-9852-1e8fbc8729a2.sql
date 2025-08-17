-- Fix wallet activity security by recreating the view with built-in security filtering
-- This ensures users can only see their own wallet activity data

-- Drop dependent function first
DROP FUNCTION IF EXISTS public.get_my_wallet_activity();

-- Drop and recreate v_wallet_activity view with security filtering built-in
DROP VIEW IF EXISTS public.v_wallet_activity CASCADE;

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
    AND (auth.uid() = ct.user_id OR get_current_user_role() = 'admin')
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
    AND (auth.uid() = rp.beneficiary_id OR get_current_user_role() = 'admin')
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
  WHERE (auth.uid() = pr.user_id OR get_current_user_role() = 'admin')
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
  WHERE (auth.uid() = gr.user_id OR get_current_user_role() = 'admin')
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
  WHERE (auth.uid() = bpe.user_id OR get_current_user_role() = 'admin')
)
SELECT * FROM cashback
UNION ALL SELECT * FROM referrals  
UNION ALL SELECT * FROM withdrawals
UNION ALL SELECT * FROM giftcards
UNION ALL SELECT * FROM airdrops;

-- Recreate the get_my_wallet_activity function to work with the secured view
CREATE OR REPLACE FUNCTION public.get_my_wallet_activity()
RETURNS SETOF v_wallet_activity
LANGUAGE sql
SECURITY DEFINER
SET search_path TO ''
AS $$
  SELECT * FROM public.v_wallet_activity WHERE user_id = auth.uid() ORDER BY happened_at DESC;
$$;