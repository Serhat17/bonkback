-- Grant admin access to serhat.bilge@icloud.com
UPDATE public.profiles 
SET role = 'admin' 
WHERE email = 'serhat.bilge@icloud.com';