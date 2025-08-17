-- Create a test function for referral claims that bypasses normal validation for testing
CREATE OR REPLACE FUNCTION public.test_referral_claim(p_referral_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_current_user_id uuid := auth.uid();
  v_referrer_id uuid;
  v_referrer_profile RECORD;
  v_current_profile RECORD;
  v_existing_referral RECORD;
  v_result jsonb;
BEGIN
  -- Check authentication
  IF v_current_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Authentication required'
    );
  END IF;

  -- Get current user profile
  SELECT user_id, referral_code, referred_by, total_earned
  INTO v_current_profile
  FROM public.profiles
  WHERE user_id = v_current_user_id AND deleted_at IS NULL;

  -- Find referrer by code
  SELECT user_id, referral_code, full_name
  INTO v_referrer_id, v_referrer_profile
  FROM public.profiles
  WHERE referral_code = upper(trim(p_referral_code))
    AND deleted_at IS NULL;

  -- Validation checks
  IF v_referrer_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid referral code: ' || p_referral_code
    );
  END IF;

  IF v_referrer_id = v_current_user_id THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Self-referrals are not allowed'
    );
  END IF;

  -- Check if user is already referred
  IF v_current_profile.referred_by IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User is already referred by someone else',
      'current_referrer', v_current_profile.referred_by
    );
  END IF;

  -- Check if referral relationship already exists
  SELECT referrer_id, referred_id, reward_claimed
  INTO v_existing_referral
  FROM public.referrals
  WHERE referrer_id = v_referrer_id AND referred_id = v_current_user_id;

  IF v_existing_referral.referrer_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Referral relationship already exists',
      'reward_claimed', v_existing_referral.reward_claimed
    );
  END IF;

  -- TEST MODE: Create the referral relationship
  -- Update user's referred_by
  UPDATE public.profiles
  SET referred_by = v_referrer_id, updated_at = now()
  WHERE user_id = v_current_user_id;

  -- Create referral record
  INSERT INTO public.referrals (referrer_id, referred_id, referral_code)
  VALUES (v_referrer_id, v_current_user_id, p_referral_code)
  ON CONFLICT (referrer_id, referred_id) DO UPDATE SET
    referral_code = EXCLUDED.referral_code,
    updated_at = now();

  -- Process referral rewards using existing function
  SELECT public.process_referral_reward(v_current_user_id) INTO v_result;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Test referral claim successful',
    'referrer_id', v_referrer_id,
    'referrer_profile', row_to_json(v_referrer_profile),
    'reward_processing_result', v_result
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', 'Test failed: ' || SQLERRM,
    'sqlstate', SQLSTATE
  );
END;
$$;

-- Create a function to reset test referrals for testing purposes
CREATE OR REPLACE FUNCTION public.reset_test_referral()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_current_user_id uuid := auth.uid();
BEGIN
  -- Check authentication
  IF v_current_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Authentication required'
    );
  END IF;

  -- Only allow in test/development mode
  IF get_current_user_role() != 'admin' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Admin role required for test reset'
    );
  END IF;

  -- Remove referral payouts for current user
  DELETE FROM public.referral_payouts 
  WHERE referred_user_id = v_current_user_id OR referrer_id = v_current_user_id;

  -- Remove referral records for current user
  DELETE FROM public.referrals 
  WHERE referred_id = v_current_user_id;

  -- Reset referred_by in profile
  UPDATE public.profiles 
  SET referred_by = NULL, updated_at = now()
  WHERE user_id = v_current_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Test referral data reset successfully'
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', 'Reset failed: ' || SQLERRM
  );
END;
$$;