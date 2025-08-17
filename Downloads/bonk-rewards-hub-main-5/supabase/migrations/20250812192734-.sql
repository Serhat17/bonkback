-- 1) Update check_payout_eligibility to enforce 2x rule and locks, and improve messages
CREATE OR REPLACE FUNCTION public.check_payout_eligibility(_user_id uuid, _amount numeric)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_total_balance numeric := 0;
  v_locked_from_locks numeric := 0;
  v_locked_referrals_pending numeric := 0;
  v_locked_total numeric := 0;
  v_available numeric := 0;
  v_normal_cashback numeric := 0;
  v_referral_rewards numeric := 0;
  v_last_payout timestamptz;
  v_min_threshold numeric := 15.00;
  v_rate_limit_ok boolean := false;
BEGIN
  -- Current total BONK balance
  SELECT COALESCE(p.bonk_balance, 0)
  INTO v_total_balance
  FROM public.profiles p
  WHERE p.user_id = _user_id AND p.deleted_at IS NULL;

  -- Active explicit locks
  SELECT COALESCE(SUM(bl.amount_bonk), 0)
  INTO v_locked_from_locks
  FROM public.bonk_locks bl
  WHERE bl.user_id = _user_id
    AND (bl.unlock_at IS NULL OR bl.unlock_at > now());

  -- Locked referral payouts (optional include as lock): include those not yet completed
  SELECT COALESCE(SUM(rp.amount), 0)
  INTO v_locked_referrals_pending
  FROM public.referral_payouts rp
  WHERE rp.beneficiary_id = _user_id
    AND rp.status IN ('locked');

  v_locked_total := COALESCE(v_locked_from_locks,0) + COALESCE(v_locked_referrals_pending,0);
  v_available := GREATEST(COALESCE(v_total_balance,0) - COALESCE(v_locked_total,0), 0);

  -- Normal cashback: approved or paid cashback tx, not returned
  SELECT COALESCE(SUM(ct.bonk_amount), 0)
  INTO v_normal_cashback
  FROM public.cashback_transactions ct
  WHERE ct.user_id = _user_id
    AND ct.is_returned = false
    AND ct.status IN ('approved','paid');

  -- Referral rewards: amounts credited to user as beneficiary and unlocked or completed
  SELECT COALESCE(SUM(rp.amount), 0)
  INTO v_referral_rewards
  FROM public.referral_payouts rp
  WHERE rp.beneficiary_id = _user_id
    AND rp.status IN ('unlocked','completed');

  -- Minimum balance (EUR equivalent) check retained from previous logic by caller
  IF v_available < _amount THEN
    RETURN jsonb_build_object(
      'eligible', false,
      'reason', 'insufficient_available',
      'message', 'Insufficient available balance after locks',
      'available', v_available,
      'locked', v_locked_total,
      'requested', _amount
    );
  END IF;

  -- 15 EUR minimum threshold preserved (value validated by caller UI as well)
  -- If you want to enforce here regardless of price, keep the numeric check
  IF _amount < v_min_threshold THEN
    RETURN jsonb_build_object(
      'eligible', false,
      'reason', 'below_minimum',
      'message', 'Minimum payout amount is 15 EUR',
      'requested', _amount,
      'minimum', v_min_threshold
    );
  END IF;

  -- Anti-abuse: normal cashback must be >= 2x referral rewards
  IF v_normal_cashback < (2 * v_referral_rewards) THEN
    RETURN jsonb_build_object(
      'eligible', false,
      'reason', 'anti_abuse_referral_ratio',
      'message', 'Payout blocked: normal cashback must be at least 2x your referral rewards before withdrawing.',
      'normal_cashback_bonk', v_normal_cashback,
      'referral_rewards_bonk', v_referral_rewards,
      'required_normal_cashback_bonk', 2 * v_referral_rewards
    );
  END IF;

  -- Rate limiting: at most 1 payout in 10 minutes (existing logic)
  SELECT last_payout_at INTO v_last_payout
  FROM public.payout_rate_limits
  WHERE user_id = _user_id;

  IF v_last_payout IS NULL OR v_last_payout < (now() - INTERVAL '10 minutes') THEN
    v_rate_limit_ok := TRUE;
  END IF;

  IF NOT v_rate_limit_ok THEN
    RETURN jsonb_build_object(
      'eligible', false,
      'reason', 'rate_limited',
      'message', 'Please wait 10 minutes between payouts',
      'last_payout', v_last_payout
    );
  END IF;

  RETURN jsonb_build_object(
    'eligible', true,
    'message', 'Payout eligible',
    'amount', _amount,
    'balance_total', v_total_balance,
    'locked_total', v_locked_total,
    'available', v_available
  );
END;
$function$;

-- 2) Create bonk_locks table (idempotent)
CREATE TABLE IF NOT EXISTS public.bonk_locks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  amount_bonk numeric(20,8) NOT NULL CHECK (amount_bonk > 0),
  reason text,
  locked_at timestamptz NOT NULL DEFAULT now(),
  unlock_at timestamptz NULL,
  unlocked_by uuid NULL
);

ALTER TABLE public.bonk_locks ENABLE ROW LEVEL SECURITY;

-- RLS: users can view their own locks; admins manage all
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'bonk_locks' AND policyname = 'Admins manage locks'
  ) THEN
    CREATE POLICY "Admins manage locks"
    ON public.bonk_locks
    AS RESTRICTIVE
    FOR ALL
    USING (public.get_current_user_role() = 'admin')
    WITH CHECK (public.get_current_user_role() = 'admin');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'bonk_locks' AND policyname = 'Users can view their own locks'
  ) THEN
    CREATE POLICY "Users can view their own locks"
    ON public.bonk_locks
    FOR SELECT
    USING (auth.uid() = user_id);
  END IF;
END $$;

-- 3) v_wallet_balances view aggregates total/locked/available (idempotent replace)
CREATE OR REPLACE VIEW public.v_wallet_balances AS
  SELECT 
    p.user_id,
    COALESCE(p.bonk_balance,0)::numeric AS bonk_balance_total,
    (COALESCE(locks.sum_locked,0) + COALESCE(locked_refs.sum_locked_refs,0))::numeric AS bonk_locked,
    GREATEST(COALESCE(p.bonk_balance,0) - (COALESCE(locks.sum_locked,0) + COALESCE(locked_refs.sum_locked_refs,0)), 0)::numeric AS bonk_available
  FROM public.profiles p
  LEFT JOIN (
    SELECT user_id, SUM(amount_bonk) AS sum_locked
    FROM public.bonk_locks
    WHERE unlock_at IS NULL OR unlock_at > now()
    GROUP BY user_id
  ) locks ON locks.user_id = p.user_id
  LEFT JOIN (
    SELECT beneficiary_id AS user_id, SUM(amount) AS sum_locked_refs
    FROM public.referral_payouts
    WHERE status = 'locked'
    GROUP BY beneficiary_id
  ) locked_refs ON locked_refs.user_id = p.user_id;

-- 4) v_wallet_activity unified activity feed
CREATE OR REPLACE VIEW public.v_wallet_activity AS
  WITH cashback AS (
    SELECT 
      ct.user_id,
      ct.created_at AS happened_at,
      'earning'::text AS type,
      'Cashback'::text AS source,
      ct.bonk_amount::numeric AS amount_bonk,
      ct.cashback_amount::numeric AS amount_fiat_est,
      ct.status::text AS status,
      jsonb_build_object('offer_id', ct.offer_id, 'purchase_amount', ct.purchase_amount, 'order_id', ct.order_id) AS meta
    FROM public.cashback_transactions ct
    WHERE ct.status IN ('approved','paid') AND ct.is_returned = false
  ),
  referrals AS (
    SELECT 
      rp.beneficiary_id AS user_id,
      rp.created_at AS happened_at,
      'earning'::text AS type,
      'Referral'::text AS source,
      rp.amount::numeric AS amount_bonk,
      NULL::numeric AS amount_fiat_est,
      rp.status::text AS status,
      jsonb_build_object('referrer_id', rp.referrer_id, 'referred_user_id', rp.referred_user_id) AS meta
    FROM public.referral_payouts rp
    WHERE rp.status IN ('unlocked','completed')
  ),
  withdrawals AS (
    SELECT 
      pr.user_id,
      pr.requested_at AS happened_at,
      'withdrawal'::text AS type,
      'Withdrawal'::text AS source,
      pr.amount::numeric AS amount_bonk,
      NULL::numeric AS amount_fiat_est,
      pr.status::text AS status,
      jsonb_build_object('wallet_address', pr.wallet_address) AS meta
    FROM public.payout_requests pr
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
    FROM public.gift_card_redemptions gr
  ),
  airdrops AS (
    SELECT 
      bpe.user_id,
      bpe.created_at AS happened_at,
      'earning'::text AS type,
      'Airdrop/Transfer'::text AS source,
      bpe.amount::numeric AS amount_bonk,
      NULL::numeric AS amount_fiat_est,
      'completed'::text AS status,
      jsonb_build_object('transfer_id', bpe.transfer_id, 'description', bpe.description, 'source', bpe.source) AS meta
    FROM public.bonk_payout_events bpe
  )
  SELECT * FROM cashback
  UNION ALL
  SELECT * FROM referrals
  UNION ALL
  SELECT * FROM withdrawals
  UNION ALL
  SELECT * FROM giftcards
  UNION ALL
  SELECT * FROM airdrops;

-- 5) RLS helpers: create a SECURITY DEFINER function to read v_wallet_activity safely per-user
CREATE OR REPLACE FUNCTION public.get_my_wallet_activity()
RETURNS SETOF public.v_wallet_activity
LANGUAGE sql
SECURITY DEFINER
SET search_path TO ''
AS $fn$
  SELECT * FROM public.v_wallet_activity WHERE user_id = auth.uid() ORDER BY happened_at DESC;
$fn$;

-- 6) Optional: simple logging function to record blocked payout attempts
CREATE OR REPLACE FUNCTION public.log_blocked_payout(_user_id uuid, _reason text, _details jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  INSERT INTO public.error_logs (user_id, error_message, severity, component, additional_data)
  VALUES (_user_id, 'Payout blocked: '||_reason, 'warning', 'check_payout_eligibility', _details)
  ON CONFLICT DO NOTHING;
END;
$function$;