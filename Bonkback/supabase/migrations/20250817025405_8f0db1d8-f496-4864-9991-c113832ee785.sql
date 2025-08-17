-- 7) Create trigger to update referral payout status based on user earnings
CREATE OR REPLACE FUNCTION public.unlock_referral_payouts_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- When a user's total_earned increases, unlock their referral payouts
  -- whose required_threshold is met (or 0).
  IF NEW.total_earned IS DISTINCT FROM OLD.total_earned THEN
    UPDATE public.referral_payouts
    SET status = 'unlocked',
        unlocked_at = now(),
        updated_at = now()
    WHERE beneficiary_id = NEW.user_id
      AND status = 'locked'
      AND COALESCE(required_threshold, 0) <= COALESCE(NEW.total_earned, 0);
  END IF;

  RETURN NEW;
END;
$$;

-- Recreate trigger on profiles to auto-unlock when total_earned changes
DROP TRIGGER IF EXISTS trg_unlock_referrals_on_profile_update ON public.profiles;
CREATE TRIGGER trg_unlock_referrals_on_profile_update
AFTER UPDATE OF total_earned ON public.profiles
FOR EACH ROW
WHEN (NEW.total_earned IS DISTINCT FROM OLD.total_earned)
EXECUTE FUNCTION public.unlock_referral_payouts_trigger();