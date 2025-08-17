-- Fix security warnings introduced by the previous migration

-- Fix the search_path for the new functions to prevent security issues
CREATE OR REPLACE FUNCTION public.get_available_cashback(target_user_id uuid DEFAULT NULL)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  offer_id uuid,
  purchase_amount numeric,
  cashback_amount numeric,
  bonk_amount numeric,
  status cashback_status,
  transaction_hash text,
  purchase_date timestamp with time zone,
  approved_date timestamp with time zone,
  paid_date timestamp with time zone,
  metadata jsonb,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  category_id uuid,
  return_window_ends_at timestamp with time zone,
  available_from_immediate timestamp with time zone,
  available_from_deferred timestamp with time zone,
  immediate_amount numeric,
  deferred_amount numeric,
  is_returned boolean,
  total_cashback numeric,
  available_amount numeric
)
LANGUAGE sql
SECURITY INVOKER
STABLE
SET search_path TO ''  -- Fix search_path security warning
AS $$
  SELECT 
    ct.id,
    ct.user_id,
    ct.offer_id,
    ct.purchase_amount,
    ct.cashback_amount,
    ct.bonk_amount,
    ct.status,
    ct.transaction_hash,
    ct.purchase_date,
    ct.approved_date,
    ct.paid_date,
    ct.metadata,
    ct.created_at,
    ct.updated_at,
    ct.category_id,
    ct.return_window_ends_at,
    ct.available_from_immediate,
    ct.available_from_deferred,
    ct.immediate_amount,
    ct.deferred_amount,
    ct.is_returned,
    ct.total_cashback,
    CASE
      WHEN ct.is_returned THEN 0::numeric
      ELSE (
        CASE
          WHEN (now() >= ct.available_from_immediate) THEN ct.immediate_amount
          ELSE 0::numeric
        END +
        CASE
          WHEN (now() >= ct.available_from_deferred) THEN ct.deferred_amount
          ELSE 0::numeric
        END
      )
    END AS available_amount
  FROM public.cashback_transactions ct
  WHERE (target_user_id IS NULL OR ct.user_id = target_user_id);
$$;

-- Fix the helper function search_path as well
CREATE OR REPLACE FUNCTION public.get_my_available_cashback()
RETURNS TABLE (
  id uuid,
  user_id uuid,
  offer_id uuid,
  purchase_amount numeric,
  cashback_amount numeric,
  bonk_amount numeric,
  status cashback_status,
  transaction_hash text,
  purchase_date timestamp with time zone,
  approved_date timestamp with time zone,
  paid_date timestamp with time zone,
  metadata jsonb,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  category_id uuid,
  return_window_ends_at timestamp with time zone,
  available_from_immediate timestamp with time zone,
  available_from_deferred timestamp with time zone,
  immediate_amount numeric,
  deferred_amount numeric,
  is_returned boolean,
  total_cashback numeric,
  available_amount numeric
)
LANGUAGE sql
SECURITY INVOKER
STABLE
SET search_path TO ''  -- Fix search_path security warning
AS $$
  SELECT * FROM public.get_available_cashback(auth.uid());
$$;