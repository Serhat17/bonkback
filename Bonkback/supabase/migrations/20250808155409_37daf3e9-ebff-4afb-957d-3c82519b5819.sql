-- 1) Make offer_clicks.user_id nullable (FK uses ON DELETE SET NULL)
ALTER TABLE public.offer_clicks
  ALTER COLUMN user_id DROP NOT NULL;

-- 2) Ensure admin policy on offer_clicks exists
CREATE POLICY "Admins manage all clicks"
ON public.offer_clicks
FOR ALL
USING (get_current_user_role() = 'admin')
WITH CHECK (get_current_user_role() = 'admin');

-- 3) Proper URL encoding function
CREATE OR REPLACE FUNCTION public.url_encode(in_text text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
STRICT
SET search_path = ''
AS $$
DECLARE
  b bytea := convert_to(in_text, 'UTF8');
  r text := '';
  i int;
  v int;
BEGIN
  FOR i IN 1..length(b) LOOP
    v := get_byte(b, i-1);
    -- unreserved: A-Z a-z 0-9 - _ . ~
    IF (v BETWEEN 48 AND 57) OR (v BETWEEN 65 AND 90) OR (v BETWEEN 97 AND 122) OR v IN (45,95,46,126) THEN
      r := r || chr(v);
    ELSE
      r := r || '%' || upper(to_hex(v));
    END IF;
  END LOOP;
  RETURN r;
END;
$$;

-- 4) Update build_tracking_url to use proper URL encoding
CREATE OR REPLACE FUNCTION public.build_tracking_url(
  p_network text,
  p_program_id text,
  p_affiliate_id text,
  p_user_id uuid,
  p_click_id text,
  p_deeplink text,
  p_offer_id uuid
) RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  tpl text;
  rules jsonb;
  deeplink_encoded text;
  out_url text;
BEGIN
  SELECT tracking_url_template, encoding_rules
  INTO tpl, rules
  FROM public.affiliate_networks
  WHERE network = p_network;

  IF tpl IS NULL THEN
    RAISE EXCEPTION 'Unknown network: %', p_network;
  END IF;

  deeplink_encoded := CASE
    WHEN rules->>'deeplink' = 'url_encode' THEN public.url_encode(p_deeplink)
    ELSE p_deeplink
  END;

  out_url := replace(replace(replace(replace(replace(replace(tpl,
    '{PROGRAM_ID}', coalesce(p_program_id,'')),
    '{AFFILIATE_ID}', coalesce(p_affiliate_id,'')),
    '{USER_ID}', coalesce(p_user_id::text,'')),
    '{CLICK_ID}', coalesce(p_click_id,'')),
    '{DEEPLINK}', deeplink_encoded),
    '{OFFER_ID}', coalesce(p_offer_id::text,''));

  RETURN out_url;
END;
$$;

-- 5) Prerequisites and optimizations
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE INDEX IF NOT EXISTS idx_offers_network ON public.cashback_offers(affiliate_network);

-- 6) Guard network names from accidental edits
ALTER TABLE public.affiliate_networks
  ALTER COLUMN network SET NOT NULL;