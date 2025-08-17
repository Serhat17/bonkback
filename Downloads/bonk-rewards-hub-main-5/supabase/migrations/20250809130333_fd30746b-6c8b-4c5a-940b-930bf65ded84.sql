-- Add unique constraint for referral codes
ALTER TABLE public.profiles
  ADD CONSTRAINT uq_profiles_referral_code UNIQUE (referral_code);

-- Create safer referral code generation with collision handling
CREATE OR REPLACE FUNCTION public.safe_generate_referral_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  _code text;
  _tries int := 0;
BEGIN
  LOOP
    _tries := _tries + 1;
    _code := public.generate_referral_code();
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM public.profiles WHERE referral_code = _code
    ) OR _tries > 10;
  END LOOP;
  RETURN _code;
END;
$$;

-- Update handle_new_user to use safe generation
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
BEGIN
  -- 1) Generate unique referral code for the new user using safe method
  _generated_code := public.safe_generate_referral_code();

  -- 2) Normalize provided code from signup metadata
  _referral_code_new := NULLIF(trim((NEW.raw_user_meta_data->>'referral_code')), '');

  -- 3) Resolve referrer (if any)
  IF _referral_code_new IS NOT NULL THEN
    SELECT p.user_id
    INTO _referrer_user_id
    FROM public.profiles p
    WHERE p.referral_code = _referral_code_new
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
  );

  -- 5) Register referral event row for analytics/audit
  IF _referrer_user_id IS NOT NULL THEN
    INSERT INTO public.referrals (referral_code, referrer_id, referred_id)
    VALUES (_referral_code_new, _referrer_user_id, NEW.id);

    -- 6) Kick off reward processing
    PERFORM public.process_referral_reward(NEW.id);
  END IF;

  RETURN NEW;
END;
$$;

-- Create the trigger on auth.users to fire when new user is created
DROP TRIGGER IF EXISTS trg_handle_new_user ON auth.users;
CREATE TRIGGER trg_handle_new_user
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Lock down function privileges
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.safe_generate_referral_code() FROM PUBLIC;