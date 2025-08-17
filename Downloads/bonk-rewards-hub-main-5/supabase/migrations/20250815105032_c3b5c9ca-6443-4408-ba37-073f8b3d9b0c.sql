-- Fix security warnings for function search paths
DROP FUNCTION IF EXISTS calculate_german_tax_liability(uuid, integer);
DROP FUNCTION IF EXISTS record_tax_transaction(uuid, text, numeric, numeric, numeric, uuid);

-- Recreate functions with proper search_path
CREATE OR REPLACE FUNCTION calculate_german_tax_liability(user_id uuid, tax_year integer)
RETURNS numeric 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  total_income_eur numeric := 0;
  tax_free_allowance numeric := 801; -- German tax-free allowance for capital gains 2024
BEGIN
  SELECT 
    COALESCE(SUM(amount_eur), 0)
  INTO total_income_eur
  FROM public.tax_transactions
  WHERE tax_transactions.user_id = calculate_german_tax_liability.user_id
    AND tax_transactions.tax_year = calculate_german_tax_liability.tax_year;
  
  -- Apply tax-free allowance
  IF total_income_eur <= tax_free_allowance THEN
    RETURN 0;
  ELSE
    RETURN total_income_eur - tax_free_allowance;
  END IF;
END;
$$;

-- Function to create tax transaction records
CREATE OR REPLACE FUNCTION record_tax_transaction(
  p_user_id uuid,
  p_type text,
  p_amount_bonk numeric,
  p_amount_eur numeric,
  p_exchange_rate numeric,
  p_source_id uuid DEFAULT NULL
)
RETURNS void 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  INSERT INTO public.tax_transactions (
    user_id, transaction_type, transaction_date, amount_bonk, 
    amount_eur, exchange_rate, source_transaction_id, tax_year
  ) VALUES (
    p_user_id, p_type, now(), p_amount_bonk, 
    p_amount_eur, p_exchange_rate, p_source_id, EXTRACT(YEAR FROM now())::integer
  );
END;
$$;