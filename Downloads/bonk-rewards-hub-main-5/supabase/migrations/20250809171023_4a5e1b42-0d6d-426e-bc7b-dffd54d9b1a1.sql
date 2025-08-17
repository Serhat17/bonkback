-- Fix affiliate tracking schema and add proper cashback processing functions

-- 1. Add missing columns to cashback_offers for affiliate tracking
ALTER TABLE public.cashback_offers 
ADD COLUMN IF NOT EXISTS program_id text,
ADD COLUMN IF NOT EXISTS affiliate_id text;

-- 2. Add default program/affiliate columns to affiliate_networks
ALTER TABLE public.affiliate_networks
ADD COLUMN IF NOT EXISTS default_program_id text,
ADD COLUMN IF NOT EXISTS default_affiliate_id text;

-- 3. Add missing columns to cashback_transactions
ALTER TABLE public.cashback_transactions
ADD COLUMN IF NOT EXISTS order_id text,
ADD COLUMN IF NOT EXISTS purchase_url text,
ADD COLUMN IF NOT EXISTS affiliate_id text;

-- 4. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_cashback_offers_affiliate_network ON public.cashback_offers(affiliate_network);
CREATE INDEX IF NOT EXISTS idx_cashback_offers_merchant_name ON public.cashback_offers(merchant_name);
CREATE INDEX IF NOT EXISTS idx_cashback_offers_status_valid ON public.cashback_offers(status, valid_until);

-- 5. Fix affiliate_networks data with correct column names
INSERT INTO public.affiliate_networks
  (network, display_name, tracking_url_template, encoding_rules, default_program_id, default_affiliate_id)
VALUES
  ('awin','AWIN',
   'https://www.awin1.com/cread.php?awinmid={PROGRAM_ID}&awinaffid={AFFILIATE_ID}&clickref={CLICK_ID}&ued={DEEPLINK}',
   '{"deeplink":"url_encode"}','default_program','default_affiliate'),
  ('cj','CJ Affiliate',
   'https://www.tkqlhce.com/click-{AFFILIATE_ID}-{PROGRAM_ID}?url={DEEPLINK}&cid={CLICK_ID}',
   '{"deeplink":"url_encode"}','default_program','default_affiliate'),
  ('impact','Impact',
   'https://impact.com/{PROGRAM_ID}/impact_click?ClickId={CLICK_ID}&SubId1={USER_ID}&ActionCode=IR&IrUrl={DEEPLINK}',
   '{"deeplink":"url_encode"}','default_program','default_affiliate')
ON CONFLICT (network) DO UPDATE
SET tracking_url_template = EXCLUDED.tracking_url_template,
    encoding_rules        = EXCLUDED.encoding_rules,
    default_program_id    = EXCLUDED.default_program_id,
    default_affiliate_id  = EXCLUDED.default_affiliate_id;

-- 6. Backfill offers program/affiliate IDs from network defaults
UPDATE public.cashback_offers o
SET program_id   = COALESCE(o.program_id, an.default_program_id),
    affiliate_id = COALESCE(o.affiliate_id, an.default_affiliate_id)
FROM public.affiliate_networks an
WHERE an.network = o.affiliate_network
  AND (o.program_id IS NULL OR o.affiliate_id IS NULL);

-- 7. Create BONK amount calculation function
CREATE OR REPLACE FUNCTION public.calculate_bonk_amount(
  p_cashback_amount numeric,
  p_bonk_price_usd numeric DEFAULT 0.000015
) RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF p_cashback_amount IS NULL OR p_cashback_amount <= 0 THEN
    RETURN 0;
  END IF;
  IF p_bonk_price_usd IS NULL OR p_bonk_price_usd <= 0 THEN
    p_bonk_price_usd := 0.000015;
  END IF;
  RETURN ROUND((p_cashback_amount / p_bonk_price_usd) * 1.10, 8);
END;
$$;

REVOKE ALL ON FUNCTION public.calculate_bonk_amount(numeric, numeric) FROM PUBLIC;

-- 8. Create cashback processing function (NO premature balance crediting)
CREATE OR REPLACE FUNCTION public.process_purchase_cashback(
  p_user_id uuid,
  p_merchant_name text,
  p_purchase_amount numeric,
  p_order_id text DEFAULT NULL,
  p_affiliate_id text DEFAULT NULL,
  p_url text DEFAULT NULL
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_offer public.cashback_offers%ROWTYPE;
  v_cashback_amount numeric;
  v_bonk_price numeric;
  v_bonk_amount numeric;
  v_tx uuid;
BEGIN
  -- find active offer (consider normalizing merchant keys; ILIKE is slow)
  SELECT *
  INTO v_offer
  FROM public.cashback_offers
  WHERE merchant_name ILIKE p_merchant_name
    AND status = 'active'
    AND (valid_until IS NULL OR valid_until > now())
  ORDER BY cashback_percentage DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'No active cashback offer for '||p_merchant_name);
  END IF;

  v_cashback_amount := p_purchase_amount * (v_offer.cashback_percentage / 100.0);
  IF v_offer.max_cashback IS NOT NULL AND v_cashback_amount > v_offer.max_cashback THEN
    v_cashback_amount := v_offer.max_cashback;
  END IF;

  SELECT (value->>'price')::numeric
  INTO v_bonk_price
  FROM public.system_settings
  WHERE key = 'bonk_price_usd';

  v_bonk_price := COALESCE(v_bonk_price, 0.000015);
  v_bonk_amount := public.calculate_bonk_amount(v_cashback_amount, v_bonk_price);

  INSERT INTO public.cashback_transactions (
    user_id, offer_id, purchase_amount, cashback_amount, bonk_amount,
    purchase_date, status,
    order_id, affiliate_id, purchase_url
  )
  VALUES (
    p_user_id, v_offer.id, p_purchase_amount, v_cashback_amount, v_bonk_amount,
    now(), 'pending',
    p_order_id, p_affiliate_id, p_url
  )
  RETURNING id INTO v_tx;

  -- balances NOT updated here; release happens via your release logic
  RETURN json_build_object(
    'success', true,
    'transaction_id', v_tx,
    'offer_title', v_offer.title,
    'cashback_amount', v_cashback_amount,
    'bonk_amount', v_bonk_amount
  );

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

REVOKE ALL ON FUNCTION public.process_purchase_cashback(uuid, text, numeric, text, text, text) FROM PUBLIC;