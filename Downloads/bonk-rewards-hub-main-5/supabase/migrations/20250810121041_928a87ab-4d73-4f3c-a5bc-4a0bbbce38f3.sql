-- A) Create safe wrapper function
CREATE OR REPLACE FUNCTION public.safe_process_referral_reward(_referred uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  PERFORM public.process_referral_reward(_referred);
END;
$$;

REVOKE ALL ON FUNCTION public.safe_process_referral_reward(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.safe_process_referral_reward(uuid) TO service_role;

-- B) Hardened handle_new_user trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
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
$$;

-- Recreate trigger on auth.users (if needed)
DROP TRIGGER IF EXISTS trg_handle_new_user ON auth.users;
CREATE TRIGGER trg_handle_new_user
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

-- C) Backfill profiles for all users missing one (no hardcoded IDs)
INSERT INTO public.profiles (user_id, email, full_name, referral_code)
SELECT u.id, u.email, COALESCE(u.raw_user_meta_data->>'full_name', u.email), public.safe_generate_referral_code()
FROM auth.users u
LEFT JOIN public.profiles p ON p.user_id = u.id
WHERE p.user_id IS NULL;