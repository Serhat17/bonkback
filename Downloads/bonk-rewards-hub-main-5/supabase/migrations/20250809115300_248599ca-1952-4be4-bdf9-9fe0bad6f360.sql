-- Fix security definer view warning - recreate view without security definer
DROP VIEW IF EXISTS public.v_cashback_available;

CREATE VIEW public.v_cashback_available AS
SELECT
  ct.*,
  CASE
    WHEN ct.is_returned THEN 0
    ELSE
      (CASE WHEN now() >= ct.available_from_immediate THEN ct.immediate_amount ELSE 0 END) +
      (CASE WHEN now() >= ct.available_from_deferred THEN ct.deferred_amount ELSE 0 END)
  END AS available_amount
FROM public.cashback_transactions ct;