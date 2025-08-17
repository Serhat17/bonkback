-- Fix Security Definer View Issue (Corrected Version)
-- The v_cashback_available view was owned by postgres and had no RLS policies
-- This created a potential security bypass for the underlying cashback_transactions table

-- Drop the existing view
DROP VIEW IF EXISTS public.v_cashback_available;

-- Create a SECURITY INVOKER function that respects RLS policies
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
SECURITY INVOKER  -- This is crucial - uses caller's permissions, respects RLS
STABLE
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

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_available_cashback(uuid) TO authenticated;

-- Create a helper function for users to get their own available cashback
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
AS $$
  SELECT * FROM public.get_available_cashback(auth.uid());
$$;

-- Grant execute permission for the user function
GRANT EXECUTE ON FUNCTION public.get_my_available_cashback() TO authenticated;

-- Add comments explaining the security fix
COMMENT ON FUNCTION public.get_available_cashback(uuid) IS 'Security invoker function to calculate available cashback while respecting caller RLS permissions. Replaces insecure postgres-owned view.';
COMMENT ON FUNCTION public.get_my_available_cashback() IS 'Helper function for users to get their own available cashback securely.';