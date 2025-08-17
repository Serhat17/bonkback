-- Create unified wallet activity RPC and balances RPC
-- SECURITY: SECURITY DEFINER, search_path '', explicit grants to authenticated

-- 1) Unified wallet activity
CREATE OR REPLACE FUNCTION public.get_my_wallet_activity_unified()
RETURNS TABLE (
  user_id uuid,
  happened_at timestamptz,
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
  IF v_user IS NULL THEN
    RETURN;
  END IF;

  -- Cashback earnings (exclude returns)
  RETURN QUERY
  SELECT 
    ct.user_id,
    ct.purchase_date AS happened_at,
    'cashback'::text AS type,
    ct.status::text AS status,
    COALESCE(ct.bonk_amount, 0) AS amount_bonk,
    NULL::numeric AS amount_fiat_est,
    COALESCE(co.merchant_name, 'cashback') AS source,
    jsonb_build_object(
      'offer_id', ct.offer_id,
      'return_window_ends_at', ct.return_window_ends_at,
      'available_from_immediate', ct.available_from_immediate,
      'available_from_deferred', ct.available_from_deferred,
      'immediate_amount', ct.immediate_amount,
      'deferred_amount', ct.deferred_amount,
      'is_returned', ct.is_returned
    ) AS meta
  FROM public.cashback_transactions ct
  LEFT JOIN public.cashback_offers co ON co.id = ct.offer_id
  WHERE ct.user_id = v_user
    AND COALESCE(ct.is_returned, false) = false
    AND ct.status IN ('pending','approved','paid');

  -- Referral rewards (incoming)
  RETURN QUERY
  SELECT 
    rp.beneficiary_id AS user_id,
    COALESCE(rp.unlocked_at, rp.created_at) AS happened_at,
    'referral'::text AS type,
    rp.status::text AS status,
    COALESCE(rp.amount, 0) AS amount_bonk,
    NULL::numeric AS amount_fiat_est,
    'referral'::text AS source,
    jsonb_build_object(
      'referrer_id', rp.referrer_id,
      'referred_user_id', rp.referred_user_id,
      'required_threshold', rp.required_threshold
    ) AS meta
  FROM public.referral_payouts rp
  WHERE rp.beneficiary_id = v_user
    AND rp.status IN ('locked','unlocked','completed');

  -- Payout requests (outgoing)
  RETURN QUERY
  SELECT 
    pr.user_id,
    COALESCE(pr.requested_at, pr.created_at) AS happened_at,
    'withdrawal'::text AS type,
    pr.status::text AS status,
    -COALESCE(pr.amount, 0) AS amount_bonk,
    NULL::numeric AS amount_fiat_est,
    'payout_request'::text AS source,
    jsonb_build_object(
      'wallet_address', pr.wallet_address,
      'processed_at', pr.processed_at
    ) AS meta
  FROM public.payout_requests pr
  WHERE pr.user_id = v_user;

  -- Gift card redemptions (outgoing)
  RETURN QUERY
  SELECT 
    gr.user_id,
    COALESCE(gr.redeemed_at, gr.created_at) AS happened_at,
    'gift_card'::text AS type,
    gr.status::text AS status,
    -COALESCE(gr.bonk_amount, 0) AS amount_bonk,
    NULL::numeric AS amount_fiat_est,
    'gift_card'::text AS source,
    jsonb_build_object(
      'gift_card_id', gr.gift_card_id,
      'redemption_code', gr.redemption_code
    ) AS meta
  FROM public.gift_card_redemptions gr
  WHERE gr.user_id = v_user;

  -- On-chain BONK transfers (outgoing)
  RETURN QUERY
  SELECT 
    bt.user_id,
    bt.created_at AS happened_at,
    'withdrawal'::text AS type,
    bt.status::text AS status,
    -COALESCE(bt.amount, 0) AS amount_bonk,
    NULL::numeric AS amount_fiat_est,
    'onchain'::text AS source,
    jsonb_build_object(
      'tx_hash', bt.tx_hash,
      'wallet_address', bt.wallet_address,
      'source_type', bt.source_type,
      'source_id', bt.source_id
    ) AS meta
  FROM public.bonk_transfers bt
  WHERE bt.user_id = v_user;

  RETURN;
EXCEPTION WHEN OTHERS THEN
  INSERT INTO public.error_logs (id, user_id, error_message, severity, component, stack_trace, additional_data)
  VALUES (
    gen_random_uuid(),
    v_user,
    'get_my_wallet_activity_unified failed: ' || SQLERRM,
    'error',
    'get_my_wallet_activity_unified',
    SQLSTATE,
    jsonb_build_object('function', 'get_my_wallet_activity_unified')
  );
  RETURN;
END;
$$;

REVOKE ALL ON FUNCTION public.get_my_wallet_activity_unified() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_wallet_activity_unified() TO authenticated;

-- 2) Wallet balances
CREATE OR REPLACE FUNCTION public.get_my_wallet_balances()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_total numeric := 0;
  v_locked numeric := 0;
  v_available numeric := 0;
  v_pending numeric := 0;
BEGIN
  IF v_user IS NULL THEN
    RETURN jsonb_build_object('total_bonk', 0, 'locked_bonk', 0, 'available_bonk', 0, 'pending_bonk', 0);
  END IF;

  -- Pull from view if available for consistency
  SELECT COALESCE(bonk_balance_total,0), COALESCE(bonk_locked,0), COALESCE(bonk_available,0)
  INTO v_total, v_locked, v_available
  FROM public.v_wallet_balances
  WHERE user_id = v_user
  LIMIT 1;

  -- Pending = unreleased cashback portions (immediate/deferred not yet available)
  SELECT COALESCE(SUM(
    COALESCE(ct.total_cashback, COALESCE(ct.cashback_amount,0), 0)
    -
    CASE WHEN COALESCE(ct.is_returned,false) THEN 0
         ELSE (
           CASE WHEN now() >= COALESCE(ct.available_from_immediate, now() + interval '100 years') THEN COALESCE(ct.immediate_amount,0) ELSE 0 END
           +
           CASE WHEN now() >= COALESCE(ct.available_from_deferred, now() + interval '100 years') THEN COALESCE(ct.deferred_amount,0) ELSE 0 END
         )
    END
  ),0)
  INTO v_pending
  FROM public.cashback_transactions ct
  WHERE ct.user_id = v_user
    AND COALESCE(ct.is_returned,false) = false
    AND ct.status IN ('pending','approved','paid');

  RETURN jsonb_build_object(
    'total_bonk', v_total,
    'locked_bonk', v_locked,
    'available_bonk', v_available,
    'pending_bonk', GREATEST(v_pending, 0)
  );
EXCEPTION WHEN OTHERS THEN
  INSERT INTO public.error_logs (id, user_id, error_message, severity, component, stack_trace)
  VALUES (
    gen_random_uuid(),
    v_user,
    'get_my_wallet_balances failed: ' || SQLERRM,
    'error',
    'get_my_wallet_balances',
    SQLSTATE
  );
  RETURN jsonb_build_object('total_bonk', 0, 'locked_bonk', 0, 'available_bonk', 0, 'pending_bonk', 0);
END;
$$;

REVOKE ALL ON FUNCTION public.get_my_wallet_balances() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_wallet_balances() TO authenticated;