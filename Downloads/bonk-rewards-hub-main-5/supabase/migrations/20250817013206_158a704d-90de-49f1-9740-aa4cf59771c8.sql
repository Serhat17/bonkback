-- Fix derivation_path column reference issue in solana_key_vault table
-- The error shows code is trying to access 'derivation_path' but the column is 'encrypted_derivation_path'

-- Drop function with CASCADE to remove all dependent triggers
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Recreate the handle_new_user function without solana_key_vault operations
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  _referral_code_new text;
  _referrer_user_id uuid;
  _generated_code text;
  _has_profile boolean;
BEGIN
  -- 0) Skip if profile already exists
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE user_id = NEW.id
  ) INTO _has_profile;

  IF _has_profile THEN
    RETURN NEW;
  END IF;

  -- 1) Generate unique referral code
  _generated_code := public.safe_generate_referral_code();

  -- 2) Normalize incoming referral code
  _referral_code_new := NULLIF(trim(NEW.raw_user_meta_data->>'referral_code'), '');

  -- 3) Resolve referrer (case-insensitive match if your codes vary in case)
  IF _referral_code_new IS NOT NULL THEN
    SELECT p.user_id
    INTO _referrer_user_id
    FROM public.profiles p
    WHERE upper(p.referral_code) = upper(_referral_code_new)
    LIMIT 1;
  END IF;

  -- Prevent self-referral
  IF _referrer_user_id = NEW.id THEN
    _referrer_user_id := NULL;
  END IF;

  -- 4) Create profile
  INSERT INTO public.profiles (user_id, email, full_name, referral_code, referred_by)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    _generated_code,
    _referrer_user_id
  )
  ON CONFLICT (user_id) DO NOTHING;

  -- 5) Create/Upsert referral audit row + process reward
  IF _referrer_user_id IS NOT NULL THEN
    INSERT INTO public.referrals (referral_code, referrer_id, referred_id)
    VALUES (_referral_code_new, _referrer_user_id, NEW.id)
    ON CONFLICT (referrer_id, referred_id) DO UPDATE
      SET referral_code = EXCLUDED.referral_code,
          updated_at = now();

    -- Use the working function (wrapper or direct)
    PERFORM public.safe_process_referral_reward(NEW.id);
  END IF;

  RETURN NEW;

EXCEPTION WHEN OTHERS THEN
  DECLARE v_detail text; v_hint text; v_context text; v_constraint text;
  BEGIN
    GET STACKED DIAGNOSTICS
      v_detail = PG_EXCEPTION_DETAIL,
      v_hint = PG_EXCEPTION_HINT,
      v_context = PG_EXCEPTION_CONTEXT,
      v_constraint = CONSTRAINT_NAME;

    INSERT INTO public.error_logs (id, user_id, error_message, severity, component, stack_trace, additional_data)
    VALUES (
      gen_random_uuid(),
      NEW.id,
      'handle_new_user failed: '||SQLERRM,
      'error',
      'handle_new_user',
      v_context,
      jsonb_build_object(
        'sqlstate', SQLSTATE,
        'detail', v_detail,
        'hint', v_hint,
        'constraint', v_constraint,
        'ref_code', _referral_code_new,
        'referrer', _referrer_user_id
      )
    );
    RETURN NEW; -- don't block signup
  END;
END;
$function$;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();