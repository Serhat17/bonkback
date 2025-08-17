-- Harden masking helpers: lock search_path to prevent hijacking
CREATE OR REPLACE FUNCTION public.mask_email(p_email text)
RETURNS text
LANGUAGE sql
STABLE
SET search_path TO ''
AS $$
  SELECT CASE 
    WHEN p_email IS NULL OR length(p_email) = 0 THEN NULL
    ELSE (regexp_replace(split_part(p_email,'@',1), '(.{0,2}).*', '\1') || '***@***')
  END
$$;

CREATE OR REPLACE FUNCTION public.mask_wallet(p_wallet text)
RETURNS text
LANGUAGE sql
STABLE
SET search_path TO ''
AS $$
  SELECT CASE 
    WHEN p_wallet IS NULL OR length(p_wallet) = 0 THEN NULL
    WHEN length(p_wallet) <= 8 THEN '****'
    ELSE left(p_wallet, 4) || '****' || right(p_wallet, 4)
  END
$$;