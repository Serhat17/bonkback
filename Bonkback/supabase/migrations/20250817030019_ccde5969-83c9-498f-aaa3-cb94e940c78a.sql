-- Fix 1: Migrate existing referral data to new referral_payouts system
INSERT INTO public.referral_payouts (
  referrer_id, 
  referred_user_id, 
  beneficiary_id, 
  amount, 
  status, 
  required_threshold,
  created_at,
  updated_at
)
SELECT 
  r.referrer_id,
  r.referred_id,
  r.referrer_id, -- referrer gets locked reward
  333333,
  'locked',
  15.00,
  r.created_at,
  r.updated_at
FROM public.referrals r
WHERE r.reward_claimed = true 
  AND NOT EXISTS (
    SELECT 1 FROM public.referral_payouts rp 
    WHERE rp.referrer_id = r.referrer_id 
      AND rp.referred_user_id = r.referred_id 
      AND rp.beneficiary_id = r.referrer_id
  )
ON CONFLICT (beneficiary_id, referred_user_id) DO NOTHING;

-- Insert referred user rewards (unlocked)
INSERT INTO public.referral_payouts (
  referrer_id, 
  referred_user_id, 
  beneficiary_id, 
  amount, 
  status, 
  required_threshold,
  created_at,
  updated_at
)
SELECT 
  r.referrer_id,
  r.referred_id,
  r.referred_id, -- referred user gets unlocked reward
  333333,
  'unlocked',
  0,
  r.created_at,
  r.updated_at
FROM public.referrals r
WHERE r.reward_claimed = true 
  AND NOT EXISTS (
    SELECT 1 FROM public.referral_payouts rp 
    WHERE rp.referrer_id = r.referrer_id 
      AND rp.referred_user_id = r.referred_id 
      AND rp.beneficiary_id = r.referred_id
  )
ON CONFLICT (beneficiary_id, referred_user_id) DO NOTHING;

-- Fix 2: Update handle_new_user trigger to ensure it works with new system
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
  _referral_result jsonb;
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
      AND p.deleted_at IS NULL
    LIMIT 1;
  END IF;

  -- Prevent self-referral
  IF _referrer_user_id = NEW.id THEN
    _referrer_user_id := NULL;
  END IF;

  -- 4) Create profile with referral code
  INSERT INTO public.profiles (user_id, email, full_name, referral_code, referred_by)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    _generated_code,
    _referrer_user_id
  )
  ON CONFLICT (user_id) DO UPDATE SET
    referral_code = COALESCE(public.profiles.referral_code, EXCLUDED.referral_code),
    referred_by = COALESCE(public.profiles.referred_by, EXCLUDED.referred_by);

  -- 5) Process referral reward if valid referrer
  IF _referrer_user_id IS NOT NULL THEN
    -- Create/update referral record
    INSERT INTO public.referrals (referrer_id, referred_id, referral_code)
    VALUES (_referrer_user_id, NEW.id, _referral_code_new)
    ON CONFLICT (referrer_id, referred_id) DO UPDATE
      SET referral_code = EXCLUDED.referral_code,
          updated_at = now();

    -- Process the referral reward using our new system
    SELECT public.process_referral_reward(NEW.id) INTO _referral_result;
    
    -- Log the referral processing result
    INSERT INTO public.security_audit_log (user_id, event_type, severity, source, metadata)
    VALUES (NEW.id, 'signup_referral_processed', 'info', 'handle_new_user',
            jsonb_build_object('referrer_id', _referrer_user_id, 'result', _referral_result));
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

-- Fix 3: Create a function to manually fix existing users' referral rewards
CREATE OR REPLACE FUNCTION public.fix_existing_referral_rewards()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  r RECORD;
  fixed_count INTEGER := 0;
  result jsonb;
BEGIN
  -- Process existing referrals that are marked as claimed but don't have payout records
  FOR r IN 
    SELECT rf.referrer_id, rf.referred_id, rf.referral_code
    FROM public.referrals rf
    WHERE rf.reward_claimed = true
      AND NOT EXISTS (
        SELECT 1 FROM public.referral_payouts rp 
        WHERE rp.referred_user_id = rf.referred_id
      )
  LOOP
    -- Process the referral reward
    SELECT public.process_referral_reward(r.referred_id) INTO result;
    
    IF (result->>'success')::boolean THEN
      fixed_count := fixed_count + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'fixed_count', fixed_count,
    'message', format('Fixed %s existing referral rewards', fixed_count)
  );
END;
$$;

-- Grant execution permissions
GRANT EXECUTE ON FUNCTION public.fix_existing_referral_rewards() TO authenticated;

-- Fix 4: Run the fix for current user's referral
SELECT public.fix_existing_referral_rewards();