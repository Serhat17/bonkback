-- Fix function search path security warnings
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS TEXT 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  code TEXT;
  exists_check INTEGER;
BEGIN
  LOOP
    -- Generate 8 character alphanumeric code
    code := upper(substr(md5(random()::text), 1, 8));
    
    -- Check if code already exists
    SELECT COUNT(*) INTO exists_check 
    FROM public.profiles 
    WHERE referral_code = code;
    
    EXIT WHEN exists_check = 0;
  END LOOP;
  
  RETURN code;
END;
$$;

CREATE OR REPLACE FUNCTION public.process_referral_reward(referred_user_id UUID)
RETURNS VOID 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  referrer_id UUID;
  reward_amount NUMERIC := 333333; -- €5 worth of BONK at $0.000015
BEGIN
  -- Get referrer
  SELECT referred_by INTO referrer_id 
  FROM public.profiles 
  WHERE user_id = referred_user_id 
  AND referred_by IS NOT NULL;
  
  IF referrer_id IS NOT NULL THEN
    -- Update referrer's balance
    UPDATE public.profiles 
    SET bonk_balance = bonk_balance + reward_amount,
        total_earned = total_earned + reward_amount
    WHERE user_id = referrer_id;
    
    -- Update referred user's balance
    UPDATE public.profiles 
    SET bonk_balance = bonk_balance + reward_amount,
        total_earned = total_earned + reward_amount
    WHERE user_id = referred_user_id;
    
    -- Create or update referral record
    INSERT INTO public.referrals (referrer_id, referred_id, referral_code, reward_claimed, referred_user_claimed)
    SELECT 
      referrer_id,
      referred_user_id,
      (SELECT referral_code FROM public.profiles WHERE user_id = referrer_id),
      TRUE,
      TRUE
    ON CONFLICT (referrer_id, referred_id) 
    DO UPDATE SET 
      reward_claimed = TRUE,
      referred_user_claimed = TRUE,
      updated_at = now();
  END IF;
END;
$$;