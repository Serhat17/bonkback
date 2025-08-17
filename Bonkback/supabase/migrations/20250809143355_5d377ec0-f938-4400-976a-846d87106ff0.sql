-- Create the missing user_role enum type
CREATE TYPE public.user_role AS ENUM ('user', 'admin');

-- Update the profiles table to use the enum type properly
ALTER TABLE public.profiles 
ALTER COLUMN role TYPE public.user_role USING role::text::public.user_role;