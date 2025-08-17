-- Make migration idempotent and apply patches safely
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1) Core tables
CREATE TABLE IF NOT EXISTS public.affiliate_networks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  network text NOT NULL UNIQUE,
  display_name text,
  tracking_url_template text NOT NULL,
  encoding_rules jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.system_config (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.offer_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NULL,
  offer_id uuid NOT NULL,
  click_id text UNIQUE DEFAULT replace(gen_random_uuid()::text, '-', ''),
  ip_address text,
  user_agent text,
  referrer text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2) Add missing columns to offers
ALTER TABLE public.cashback_offers
  ADD COLUMN IF NOT EXISTS affiliate_network text,
  ADD COLUMN IF NOT EXISTS tracking_template text,
  ADD COLUMN IF NOT EXISTS deeplink text,
  ADD COLUMN IF NOT EXISTS image_url text;

-- 3) Constraints (guarded)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_offers_network'
  ) THEN
    ALTER TABLE public.cashback_offers
      ADD CONSTRAINT fk_offers_network
      FOREIGN KEY (affiliate_network) REFERENCES public.affiliate_networks(network);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_clicks_offer'
  ) THEN
    ALTER TABLE public.offer_clicks
      ADD CONSTRAINT fk_clicks_offer
      FOREIGN KEY (offer_id) REFERENCES public.cashback_offers(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_clicks_user'
  ) THEN
    ALTER TABLE public.offer_clicks
      ADD CONSTRAINT fk_clicks_user
      FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE SET NULL;
  END IF;
END $$;

-- 4) Indexes
CREATE INDEX IF NOT EXISTS idx_clicks_offer ON public.offer_clicks(offer_id);
CREATE INDEX IF NOT EXISTS idx_clicks_user ON public.offer_clicks(user_id);
CREATE INDEX IF NOT EXISTS idx_clicks_created_at ON public.offer_clicks(created_at);
CREATE INDEX IF NOT EXISTS idx_offers_network ON public.cashback_offers(affiliate_network);
CREATE UNIQUE INDEX IF NOT EXISTS ux_offer_clicks_click_id ON public.offer_clicks(click_id);

-- 5) RLS enable
ALTER TABLE public.affiliate_networks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offer_clicks ENABLE ROW LEVEL SECURITY;

-- 6) Policies (drop then create to avoid duplicates)
DROP POLICY IF EXISTS "Users read their own clicks" ON public.offer_clicks;
DROP POLICY IF EXISTS "Admins manage all clicks" ON public.offer_clicks;

CREATE POLICY "Users read their own clicks"
ON public.offer_clicks
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins manage all clicks"
ON public.offer_clicks
FOR ALL
USING (get_current_user_role() = 'admin')
WITH CHECK (get_current_user_role() = 'admin');

DROP POLICY IF EXISTS "Admins manage networks" ON public.affiliate_networks;
CREATE POLICY "Admins manage networks"
ON public.affiliate_networks
FOR ALL
USING (get_current_user_role() = 'admin')
WITH CHECK (get_current_user_role() = 'admin');

DROP POLICY IF EXISTS "Admins manage system config" ON public.system_config;
CREATE POLICY "Admins manage system config"
ON public.system_config
FOR ALL
USING (get_current_user_role() = 'admin')
WITH CHECK (get_current_user_role() = 'admin');

-- 7) Updated_at triggers (drop if exists then create)
DROP TRIGGER IF EXISTS set_updated_at_affiliate_networks ON public.affiliate_networks;
CREATE TRIGGER set_updated_at_affiliate_networks
BEFORE UPDATE ON public.affiliate_networks
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS set_updated_at_system_config ON public.system_config;
CREATE TRIGGER set_updated_at_system_config
BEFORE UPDATE ON public.system_config
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 8) Seed defaults
INSERT INTO public.affiliate_networks(network, display_name, tracking_url_template, encoding_rules)
VALUES
 ('awin', 'AWIN', 'https://www.awin1.com/cread.php?awinmid={PROGRAM_ID}&awinaffid={AFFILIATE_ID}&clickref={USER_ID}-{CLICK_ID}-{OFFER_ID}&ued={DEEPLINK}', '{"deeplink":"url_encode"}'),
 ('cj', 'CJ', 'https://www.anrdoezrs.net/click-{AFFILIATE_ID}-{PROGRAM_ID}?sid={USER_ID}-{CLICK_ID}-{OFFER_ID}&url={DEEPLINK}', '{"deeplink":"url_encode"}'),
 ('direct', 'Direct', '{DEEPLINK}', '{"deeplink":"none"}')
ON CONFLICT (network) DO UPDATE SET
  tracking_url_template = EXCLUDED.tracking_url_template,
  encoding_rules = EXCLUDED.encoding_rules::jsonb,
  display_name = EXCLUDED.display_name,
  updated_at = now();

INSERT INTO public.system_config(key, value, description)
VALUES ('base_domain', to_jsonb('https://bonk-rewards-hub.lovable.app'::text), 'Base domain for redirects')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();

-- 9) URL encoder and helpers
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

CREATE OR REPLACE FUNCTION public.record_offer_click(
  p_user_id uuid,
  p_offer_id uuid,
  p_ip text,
  p_user_agent text,
  p_referrer text
) RETURNS TABLE(click_id text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.offer_clicks (user_id, offer_id, ip_address, user_agent, referrer)
  VALUES (p_user_id, p_offer_id, p_ip, p_user_agent, p_referrer)
  RETURNING offer_clicks.click_id INTO click_id;
  RETURN;
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_offer_click(uuid,uuid,text,text,text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.build_tracking_url(text,text,text,uuid,text,text,uuid) TO authenticated, service_role;

-- 10) Guard network names from accidental edits (already NOT NULL by DDL)
ALTER TABLE public.affiliate_networks
  ALTER COLUMN network SET NOT NULL;