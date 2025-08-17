-- Promote serhat.bilge@icloud.com to admin
UPDATE public.profiles 
SET role = 'admin'
WHERE email = 'serhat.bilge@icloud.com';

-- Insert admin profile if it doesn't exist (in case user hasn't signed up yet)
INSERT INTO public.profiles (user_id, email, full_name, role, referral_code)
SELECT 
  auth.users.id,
  'serhat.bilge@icloud.com',
  'Serhat Bilge',
  'admin'::user_role,
  public.generate_referral_code()
FROM auth.users 
WHERE auth.users.email = 'serhat.bilge@icloud.com'
AND NOT EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE email = 'serhat.bilge@icloud.com'
);