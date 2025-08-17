-- Fix security issues by implementing proper access controls

-- 1) Keep batch function server-only
REVOKE EXECUTE ON FUNCTION public.process_all_unclaimed_referrals() FROM PUBLIC, authenticated;
GRANT EXECUTE ON FUNCTION public.process_all_unclaimed_referrals() TO service_role;

-- 2) Keep the raw reward function non-public (server-only)
REVOKE EXECUTE ON FUNCTION public.process_referral_reward(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.process_referral_reward(uuid) TO service_role;

-- 3) Create a safe wrapper for clients that only processes their own referral
CREATE OR REPLACE FUNCTION public.claim_my_referral()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  me uuid := auth.uid();
BEGIN
  IF me IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'not authenticated');
  END IF;

  -- process only for the caller
  PERFORM public.process_referral_reward(me);

  RETURN json_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Grant safe access to the wrapper function
REVOKE ALL ON FUNCTION public.claim_my_referral() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_my_referral() TO authenticated;