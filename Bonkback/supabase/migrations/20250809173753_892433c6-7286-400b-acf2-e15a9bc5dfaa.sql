-- Fix Security Definer View Issue
-- The v_cashback_available view is owned by postgres and has no RLS policies
-- This creates a potential security bypass for the underlying cashback_transactions table

-- Drop the existing view
DROP VIEW IF EXISTS public.v_cashback_available;

-- Create a SECURITY INVOKER function instead of a view
-- This ensures RLS policies from the underlying table are respected
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
SECURITY INVOKER  -- This is crucial - uses caller's permissions
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

-- Create a new secure view that respects RLS
CREATE VIEW public.v_cashback_available
WITH (security_barrier = true, security_invoker = true)
AS SELECT * FROM public.get_available_cashback();

-- Enable RLS on the new view
ALTER VIEW public.v_cashback_available SET (security_barrier = true);

-- Grant appropriate permissions
GRANT SELECT ON public.v_cashback_available TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_available_cashback(uuid) TO authenticated;

-- Add RLS policies to the view to ensure proper access control
ALTER VIEW public.v_cashback_available ENABLE ROW LEVEL SECURITY;

-- Users can only see their own cashback transactions through the view
CREATE POLICY "Users can view their own available cashback"
ON public.v_cashback_available
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Admins can see all available cashback
CREATE POLICY "Admins can view all available cashback"
ON public.v_cashback_available
FOR SELECT
TO authenticated
USING (get_current_user_role() = 'admin');

-- Comment explaining the security fix
COMMENT ON VIEW public.v_cashback_available IS 'Secure view for available cashback that respects RLS policies from underlying cashback_transactions table';
COMMENT ON FUNCTION public.get_available_cashback(uuid) IS 'Security invoker function to calculate available cashback while respecting caller permissions';