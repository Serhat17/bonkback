-- Finalize Configurable Cashback System: schema hardening, RLS, trigger, indexes, backfill

-- 1) Core tables (create if missing)
CREATE TABLE IF NOT EXISTS public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  return_window_days integer NOT NULL DEFAULT 30,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Admin-only full management with USING & WITH CHECK, schema-qualified helper
DROP POLICY IF EXISTS "Admins can manage categories" ON public.categories;
CREATE POLICY "Admins can manage categories"
  ON public.categories
  FOR ALL
  USING (public.get_current_user_role() = 'admin')
  WITH CHECK (public.get_current_user_role() = 'admin');

-- Optional: allow everyone to read categories (comment out if not desired)
-- DROP POLICY IF EXISTS "Everyone can view categories" ON public.categories;
-- CREATE POLICY "Everyone can view categories"
--   ON public.categories
--   FOR SELECT
--   USING (true);

-- Global cashback policy singleton
CREATE TABLE IF NOT EXISTS public.cashback_policy (
  id boolean PRIMARY KEY DEFAULT true,
  immediate_release_percent integer NOT NULL DEFAULT 0 CHECK (immediate_release_percent BETWEEN 0 AND 100),
  deferred_release_delay_days integer NOT NULL DEFAULT 30,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.cashback_policy ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage cashback policy" ON public.cashback_policy;
CREATE POLICY "Admins can manage cashback policy"
  ON public.cashback_policy
  FOR ALL
  USING (public.get_current_user_role() = 'admin')
  WITH CHECK (public.get_current_user_role() = 'admin');

-- Seed singleton policy if missing
INSERT INTO public.cashback_policy (id, immediate_release_percent, deferred_release_delay_days)
VALUES (true, 0, 30)
ON CONFLICT (id) DO NOTHING;

-- Seed common categories if not present (case-insensitive compare)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.categories WHERE lower(name) = 'electronics') THEN
    INSERT INTO public.categories (name, return_window_days) VALUES ('Electronics', 30);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.categories WHERE lower(name) = 'fashion') THEN
    INSERT INTO public.categories (name, return_window_days) VALUES ('Fashion', 60);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.categories WHERE lower(name) = 'travel') THEN
    INSERT INTO public.categories (name, return_window_days) VALUES ('Travel', 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.categories WHERE lower(name) = 'food delivery') THEN
    INSERT INTO public.categories (name, return_window_days) VALUES ('Food Delivery', 14);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.categories WHERE lower(name) = 'streaming') THEN
    INSERT INTO public.categories (name, return_window_days) VALUES ('Streaming', 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.categories WHERE lower(name) = 'gaming') THEN
    INSERT INTO public.categories (name, return_window_days) VALUES ('Gaming', 30);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.categories WHERE lower(name) = 'other') THEN
    INSERT INTO public.categories (name, return_window_days) VALUES ('Other', 30);
  END IF;
END $$;

-- Enforce case-insensitive uniqueness
CREATE UNIQUE INDEX IF NOT EXISTS uq_categories_name_lower ON public.categories ((lower(name)));

-- 2) Link offers to categories (covers mapping used by the trigger)
ALTER TABLE IF EXISTS public.cashback_offers
  ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES public.categories(id);

-- Map existing textual categories to category ids (covers seeded types incl. Food Delivery & Streaming)
UPDATE public.cashback_offers co
SET category_id = c.id
FROM public.categories c
WHERE co.category_id IS NULL
  AND lower(c.name) = CASE
    WHEN lower(co.category) IN ('fashion') THEN 'fashion'
    WHEN lower(co.category) IN ('electronics') THEN 'electronics'
    WHEN lower(co.category) IN ('travel') THEN 'travel'
    WHEN lower(co.category) IN ('gaming') THEN 'gaming'
    WHEN lower(co.category) IN ('food delivery','food-delivery','food_delivery') THEN 'food delivery'
    WHEN lower(co.category) IN ('streaming') THEN 'streaming'
    ELSE 'other'
  END;

-- 3) Extend cashback_transactions with required columns (idempotent)
ALTER TABLE IF EXISTS public.cashback_transactions
  ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES public.categories(id),
  ADD COLUMN IF NOT EXISTS purchase_date timestamptz,
  ADD COLUMN IF NOT EXISTS return_window_ends_at timestamptz,
  ADD COLUMN IF NOT EXISTS available_from_immediate timestamptz,
  ADD COLUMN IF NOT EXISTS available_from_deferred timestamptz,
  ADD COLUMN IF NOT EXISTS immediate_amount numeric(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS deferred_amount numeric(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_returned boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS total_cashback numeric(12,2);

-- 4) Backfill total_cashback from cashback_amount when missing
UPDATE public.cashback_transactions
SET total_cashback = COALESCE(total_cashback, cashback_amount)
WHERE total_cashback IS NULL;

-- 5) Trigger function: apply_cashback_release_logic (secure, schema-qualified)
CREATE OR REPLACE FUNCTION public.apply_cashback_release_logic()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  cat_id uuid;
  rw_days integer := 30;
  policy_percent integer := 0;
  policy_delay integer := 30;
  base_ts timestamptz;
  total numeric(12,2);
BEGIN
  -- Determine category
  IF NEW.category_id IS NULL THEN
    SELECT co.category_id
    INTO cat_id
    FROM public.cashback_offers co
    WHERE co.id = NEW.offer_id;
  ELSE
    cat_id := NEW.category_id;
  END IF;

  -- Get return window days
  IF cat_id IS NOT NULL THEN
    SELECT c.return_window_days
    INTO rw_days
    FROM public.categories c
    WHERE c.id = cat_id;
  END IF;

  -- Load cashback policy (keep defaults if no row)
  SELECT COALESCE(cp.immediate_release_percent, policy_percent),
         COALESCE(cp.deferred_release_delay_days, policy_delay)
  INTO policy_percent, policy_delay
  FROM public.cashback_policy cp
  WHERE cp.id = true;

  -- Ensure purchase_date
  IF NEW.purchase_date IS NULL THEN
    NEW.purchase_date := now();
  END IF;

  -- Calculate release timestamps
  base_ts := NEW.purchase_date + make_interval(days := rw_days);
  NEW.return_window_ends_at := base_ts;
  NEW.available_from_immediate := base_ts;
  NEW.available_from_deferred := base_ts + make_interval(days := policy_delay);

  -- Calculate amounts
  total := COALESCE(NEW.total_cashback, NEW.cashback_amount, 0);
  NEW.total_cashback := total;
  NEW.immediate_amount := round(total * (policy_percent::numeric / 100), 2);
  NEW.deferred_amount := round(total - NEW.immediate_amount, 2);

  -- Persist chosen category
  IF cat_id IS NOT NULL THEN
    NEW.category_id := cat_id;
  END IF;

  RETURN NEW;
END;
$$;

-- Harden function permissions
REVOKE ALL ON FUNCTION public.apply_cashback_release_logic() FROM PUBLIC;
-- Do not grant to service_role (not needed for triggers)
-- Attempt to assign ownership to postgres (may be a no-op depending on environment)
DO $$ BEGIN
  ALTER FUNCTION public.apply_cashback_release_logic() OWNER TO postgres;
EXCEPTION WHEN OTHERS THEN
  -- ignore if not permitted
END $$;

-- 6) Recreate trigger to use the function
DROP TRIGGER IF EXISTS trg_apply_cashback_release_logic ON public.cashback_transactions;
CREATE TRIGGER trg_apply_cashback_release_logic
BEFORE INSERT OR UPDATE OF total_cashback, purchase_date, offer_id, category_id
ON public.cashback_transactions
FOR EACH ROW
EXECUTE FUNCTION public.apply_cashback_release_logic();

-- 7) Performance indexes for release & payout queries
CREATE INDEX IF NOT EXISTS idx_ct_available_immediate ON public.cashback_transactions(available_from_immediate);
CREATE INDEX IF NOT EXISTS idx_ct_available_deferred  ON public.cashback_transactions(available_from_deferred);
CREATE INDEX IF NOT EXISTS idx_ct_user_immediate ON public.cashback_transactions(user_id, available_from_immediate);
CREATE INDEX IF NOT EXISTS idx_ct_user_deferred  ON public.cashback_transactions(user_id, available_from_deferred);

-- 8) Backfill: trigger recalculation on existing rows
UPDATE public.cashback_transactions
SET category_id = category_id;