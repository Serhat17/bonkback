-- Create referral tables and functionality
CREATE TABLE public.referrals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referral_code TEXT NOT NULL UNIQUE,
  reward_claimed BOOLEAN DEFAULT FALSE,
  referred_user_claimed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(referrer_id, referred_id)
);

-- Enable RLS
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for referrals
CREATE POLICY "Users can view their own referrals" 
ON public.referrals 
FOR SELECT 
USING (auth.uid() = referrer_id OR auth.uid() = referred_id);

CREATE POLICY "Users can insert referrals" 
ON public.referrals 
FOR INSERT 
WITH CHECK (auth.uid() = referrer_id);

CREATE POLICY "Users can update their own referrals" 
ON public.referrals 
FOR UPDATE 
USING (auth.uid() = referrer_id OR auth.uid() = referred_id);

CREATE POLICY "Admins can manage all referrals" 
ON public.referrals 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.user_id = auth.uid() 
  AND profiles.role = 'admin'::user_role
));

-- Add referral_code to profiles table
ALTER TABLE public.profiles 
ADD COLUMN referral_code TEXT UNIQUE,
ADD COLUMN referred_by UUID REFERENCES auth.users(id);

-- Create function to generate unique referral code
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS TEXT AS $$
DECLARE
  code TEXT;
  exists_check INTEGER;
BEGIN
  LOOP
    -- Generate 8 character alphanumeric code
    code := upper(substr(md5(random()::text), 1, 8));
    
    -- Check if code already exists
    SELECT COUNT(*) INTO exists_check 
    FROM profiles 
    WHERE referral_code = code;
    
    EXIT WHEN exists_check = 0;
  END LOOP;
  
  RETURN code;
END;
$$ LANGUAGE plpgsql;

-- Create function to handle referral rewards (€5 = 333,333 BONK at $0.000015)
CREATE OR REPLACE FUNCTION public.process_referral_reward(referred_user_id UUID)
RETURNS VOID AS $$
DECLARE
  referrer_id UUID;
  reward_amount NUMERIC := 333333; -- €5 worth of BONK at $0.000015
BEGIN
  -- Get referrer
  SELECT referred_by INTO referrer_id 
  FROM profiles 
  WHERE user_id = referred_user_id 
  AND referred_by IS NOT NULL;
  
  IF referrer_id IS NOT NULL THEN
    -- Update referrer's balance
    UPDATE profiles 
    SET bonk_balance = bonk_balance + reward_amount,
        total_earned = total_earned + reward_amount
    WHERE user_id = referrer_id;
    
    -- Update referred user's balance
    UPDATE profiles 
    SET bonk_balance = bonk_balance + reward_amount,
        total_earned = total_earned + reward_amount
    WHERE user_id = referred_user_id;
    
    -- Create or update referral record
    INSERT INTO referrals (referrer_id, referred_id, referral_code, reward_claimed, referred_user_claimed)
    SELECT 
      referrer_id,
      referred_user_id,
      (SELECT referral_code FROM profiles WHERE user_id = referrer_id),
      TRUE,
      TRUE
    ON CONFLICT (referrer_id, referred_id) 
    DO UPDATE SET 
      reward_claimed = TRUE,
      referred_user_claimed = TRUE,
      updated_at = now();
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Update the handle_new_user function to include referral code generation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  referral_code_param TEXT;
BEGIN
  -- Generate unique referral code
  referral_code_param := public.generate_referral_code();
  
  INSERT INTO public.profiles (user_id, email, full_name, referral_code)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    referral_code_param
  );
  RETURN NEW;
END;
$function$;

-- Create trigger for automatic timestamp updates on referrals
CREATE TRIGGER update_referrals_updated_at
BEFORE UPDATE ON public.referrals
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add system setting for referral reward amount
INSERT INTO public.system_settings (key, value, description) 
VALUES ('referral_reward_bonk', '333333', 'BONK reward amount for successful referrals (€5 equivalent)')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;