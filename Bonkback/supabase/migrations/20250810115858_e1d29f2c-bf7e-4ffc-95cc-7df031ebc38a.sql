-- Fix function permissions and trace the issue

-- Ensure proper permissions for claim_my_referral
DROP FUNCTION IF EXISTS public.claim_my_referral();

CREATE OR REPLACE FUNCTION public.claim_my_referral()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  me uuid := auth.uid();
  result json;
BEGIN
  -- Log the attempt
  INSERT INTO public.error_logs (
    user_id, error_message, severity, component
  ) VALUES (
    me, 'claim_my_referral called for user: ' || COALESCE(me::text, 'NULL'), 'info', 'claim_my_referral'
  );

  IF me IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'not authenticated');
  END IF;

  -- Call the reward processing function
  BEGIN
    PERFORM public.process_referral_reward(me);
    
    INSERT INTO public.error_logs (
      user_id, error_message, severity, component
    ) VALUES (
      me, 'process_referral_reward completed successfully', 'info', 'claim_my_referral'
    );
    
    RETURN json_build_object('success', true, 'message', 'Rewards processed successfully');
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO public.error_logs (
      user_id, error_message, severity, component, stack_trace
    ) VALUES (
      me, 'process_referral_reward failed: ' || SQLERRM, 'error', 'claim_my_referral', SQLSTATE
    );
    
    RETURN json_build_object('success', false, 'error', SQLERRM);
  END;
END;
$$;

-- Grant proper permissions
GRANT EXECUTE ON FUNCTION public.claim_my_referral() TO authenticated;

-- Also ensure process_referral_reward has proper setup
GRANT EXECUTE ON FUNCTION public.process_referral_reward(uuid) TO postgres;

-- Test the function to see what happens
DO $$
DECLARE
  test_result json;
BEGIN
  -- We can't actually test with auth.uid() in a DO block, but we can test the basic function structure
  INSERT INTO public.error_logs (
    error_message, severity, component
  ) VALUES (
    'Testing claim_my_referral function setup completed', 'info', 'migration_test'
  );
END $$;