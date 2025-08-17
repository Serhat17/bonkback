-- Check if user already exists before inserting
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
  _existing_profile_count int;
BEGIN
  -- Check if profile already exists (prevent duplicate inserts)
  SELECT COUNT(*) INTO _existing_profile_count
  FROM public.profiles 
  WHERE user_id = NEW.id;
  
  -- If profile already exists, skip creation
  IF _existing_profile_count > 0 THEN
    RETURN NEW;
  END IF;

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

  -- 4) Create profile with conflict handling
  INSERT INTO public.profiles (user_id, email, full_name, referral_code, referred_by)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    _generated_code,
    _referrer_user_id
  )
  ON CONFLICT (user_id) DO NOTHING;

  -- 5) Register referral event row for analytics/audit (only if referrer exists)
  IF _referrer_user_id IS NOT NULL THEN
    INSERT INTO public.referrals (referral_code, referrer_id, referred_id)
    VALUES (_referral_code_new, _referrer_user_id, NEW.id)
    ON CONFLICT (referrer_id, referred_id) DO NOTHING;

    -- 6) Kick off reward processing
    PERFORM public.process_referral_reward(NEW.id);
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log error but don't fail user creation
  INSERT INTO public.error_logs (
    user_id, error_message, stack_trace, component, severity
  ) VALUES (
    NEW.id, 
    'Profile creation failed: ' || SQLERRM,
    SQLSTATE,
    'handle_new_user',
    'error'
  );
  
  RETURN NEW;
END;
$$;