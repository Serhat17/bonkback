-- Create demo-specific referral testing functions for jury testing
-- These bypass normal restrictions to allow repeated testing

CREATE OR REPLACE FUNCTION public.test_referral_claim_demo(p_referral_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_referrer_id uuid;
  v_current_user_id uuid := auth.uid();
  v_referrer_profile RECORD;
  v_current_profile RECORD;
BEGIN
  -- Check if user is authenticated
  IF v_current_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Authentication required for demo testing'
    );
  END IF;

  -- Find the referrer by referral code
  SELECT user_id, full_name, email, bonk_balance, total_earned
  INTO v_referrer_profile
  FROM public.profiles
  WHERE referral_code = p_referral_code AND deleted_at IS NULL;

  IF v_referrer_profile.user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid referral code: ' || p_referral_code
    );
  END IF;

  -- Get current user profile
  SELECT user_id, full_name, email, bonk_balance, total_earned
  INTO v_current_profile
  FROM public.profiles
  WHERE user_id = v_current_user_id AND deleted_at IS NULL;

  -- Prevent self-referral
  IF v_referrer_profile.user_id = v_current_user_id THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Cannot use your own referral code'
    );
  END IF;

  -- For demo purposes, we'll simulate the referral process without permanent changes
  -- In a real scenario, this would create actual referral records and payouts

  -- Simulate the referral reward calculation
  DECLARE
    referrer_reward numeric := 333333;
    referred_reward numeric := 333333;
  BEGIN
    -- Log the demo test for audit purposes
    INSERT INTO public.security_audit_log (
      user_id, event_type, severity, source, metadata
    ) VALUES (
      v_current_user_id,
      'referral_demo_test',
      'info',
      'test_referral_claim_demo',
      jsonb_build_object(
        'referral_code', p_referral_code,
        'referrer_id', v_referrer_profile.user_id,
        'referrer_name', v_referrer_profile.full_name,
        'tester_name', v_current_profile.full_name,
        'simulated_rewards', jsonb_build_object(
          'referrer_reward', referrer_reward,
          'referred_reward', referred_reward
        )
      )
    );

    RETURN jsonb_build_object(
      'success', true,
      'message', 'Demo referral test successful! In production, this would create rewards.',
      'demo_data', jsonb_build_object(
        'referral_code', p_referral_code,
        'referrer', jsonb_build_object(
          'name', v_referrer_profile.full_name,
          'current_balance', v_referrer_profile.bonk_balance,
          'would_receive', referrer_reward
        ),
        'referred_user', jsonb_build_object(
          'name', v_current_profile.full_name,
          'current_balance', v_current_profile.bonk_balance,
          'would_receive', referred_reward
        ),
        'total_demo_value', referrer_reward + referred_reward,
        'usd_equivalent', (referrer_reward + referred_reward) * 0.000025
      )
    );
  END;

EXCEPTION WHEN OTHERS THEN
  -- Log the error
  INSERT INTO public.error_logs (
    user_id, error_message, stack_trace, component, severity
  ) VALUES (
    v_current_user_id,
    'test_referral_claim_demo failed: ' || SQLERRM,
    SQLSTATE,
    'test_referral_claim_demo',
    'error'
  );
  
  RETURN jsonb_build_object(
    'success', false,
    'error', 'Demo test completed with simulated results'
  );
END;
$$;

-- Create a function to simulate referral signup process for demos
CREATE OR REPLACE FUNCTION public.simulate_referral_signup_demo(p_referral_code text, p_scenario_name text DEFAULT 'Demo Scenario')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_referrer_id uuid;
  v_current_user_id uuid := auth.uid();
  v_referrer_profile RECORD;
  v_current_profile RECORD;
  v_referrer_reward numeric := 333333;
  v_new_user_reward numeric := 333333;
BEGIN
  -- Check if user is authenticated
  IF v_current_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Authentication required for demo'
    );
  END IF;

  -- Find the referrer by referral code
  SELECT user_id, full_name, email, bonk_balance, total_earned
  INTO v_referrer_profile
  FROM public.profiles
  WHERE referral_code = p_referral_code AND deleted_at IS NULL;

  IF v_referrer_profile.user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid referral code: ' || p_referral_code
    );
  END IF;

  -- Get current user profile
  SELECT user_id, full_name, email, bonk_balance, total_earned
  INTO v_current_profile
  FROM public.profiles
  WHERE user_id = v_current_user_id AND deleted_at IS NULL;

  -- Log the demo simulation
  INSERT INTO public.security_audit_log (
    user_id, event_type, severity, source, metadata
  ) VALUES (
    v_current_user_id,
    'referral_signup_demo',
    'info',
    'simulate_referral_signup_demo',
    jsonb_build_object(
      'scenario', p_scenario_name,
      'referral_code', p_referral_code,
      'referrer_id', v_referrer_profile.user_id,
      'simulation_rewards', jsonb_build_object(
        'referrer_reward', v_referrer_reward,
        'new_user_reward', v_new_user_reward
      )
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', format('Demo: %s completed successfully!', p_scenario_name),
    'simulation_results', jsonb_build_object(
      'scenario', p_scenario_name,
      'referral_code', p_referral_code,
      'referrer', jsonb_build_object(
        'name', v_referrer_profile.full_name,
        'current_balance', v_referrer_profile.bonk_balance,
        'simulated_reward', v_referrer_reward,
        'projected_balance', v_referrer_profile.bonk_balance + v_referrer_reward
      ),
      'new_user', jsonb_build_object(
        'welcome_reward', v_new_user_reward,
        'signup_bonus', 'First-time user bonus included'
      ),
      'total_ecosystem_reward', v_referrer_reward + v_new_user_reward,
      'usd_value', (v_referrer_reward + v_new_user_reward) * 0.000025
    )
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', 'Demo simulation completed: ' || SQLERRM
  );
END;
$$;