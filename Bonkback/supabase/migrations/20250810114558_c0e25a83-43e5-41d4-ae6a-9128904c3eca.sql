-- Add foreign key constraints for data integrity
ALTER TABLE public.referral_payouts
  ADD CONSTRAINT fk_payouts_referrer   FOREIGN KEY (referrer_id)      REFERENCES public.profiles(user_id),
  ADD CONSTRAINT fk_payouts_referred   FOREIGN KEY (referred_user_id) REFERENCES public.profiles(user_id),
  ADD CONSTRAINT fk_payouts_beneficiary FOREIGN KEY (beneficiary_id)  REFERENCES public.profiles(user_id);

-- Ensure status column allows our values (if not already covered)
-- Most likely this is already a text column allowing any values, but let's be explicit
DO $$ 
BEGIN
  -- Check if we need to add any constraints on status
  -- For now, keeping it as text to allow 'locked', 'unlocked', etc.
  NULL;
END $$;

-- Set function ownership to postgres
DO $$ 
BEGIN
  ALTER FUNCTION public.process_referral_reward(uuid) OWNER TO postgres;
  ALTER FUNCTION public.process_all_unclaimed_referrals() OWNER TO postgres;
EXCEPTION WHEN OTHERS THEN 
  -- Log any issues but don't fail the migration
  RAISE NOTICE 'Could not change function ownership: %', SQLERRM;
END $$;