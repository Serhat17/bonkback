-- Fix critical security issue: Enable RLS and create policies for profiles_secure table
-- This table contains sensitive user data (emails, wallet addresses, balances) 
-- but currently has no RLS protection

-- First, enable Row Level Security on the profiles_secure table
ALTER TABLE public.profiles_secure ENABLE ROW LEVEL SECURITY;

-- Policy 1: Users can view only their own profile data
CREATE POLICY "Users can view their own secure profile" 
ON public.profiles_secure 
FOR SELECT 
USING (auth.uid() = user_id AND deleted_at IS NULL);

-- Policy 2: Users can update only their own profile data (excluding role changes)
CREATE POLICY "Users can update their own secure profile data" 
ON public.profiles_secure 
FOR UPDATE 
USING (auth.uid() = user_id AND deleted_at IS NULL)
WITH CHECK (auth.uid() = user_id AND deleted_at IS NULL);

-- Policy 3: Users can insert their own profile
CREATE POLICY "Users can insert their own secure profile" 
ON public.profiles_secure 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Policy 4: Admins can view all profiles (including soft-deleted ones)
CREATE POLICY "Admins can view all secure profiles" 
ON public.profiles_secure 
FOR SELECT 
USING (get_current_user_role() = 'admin');

-- Policy 5: Admins can manage all profiles
CREATE POLICY "Admins can manage all secure profiles" 
ON public.profiles_secure 
FOR ALL 
USING (get_current_user_role() = 'admin');

-- Policy 6: Prevent role escalation - only admins can modify roles
CREATE POLICY "Prevent unauthorized role changes in secure profiles" 
ON public.profiles_secure 
FOR UPDATE 
USING (
  CASE 
    WHEN get_current_user_role() = 'admin' THEN true
    WHEN auth.uid() = user_id AND OLD.role IS NOT DISTINCT FROM NEW.role THEN true
    ELSE false
  END
);

-- Add a trigger to prevent users from changing their own roles
CREATE OR REPLACE FUNCTION public.prevent_role_self_modification_secure()
RETURNS TRIGGER AS $$
BEGIN
  -- Allow admin functions to change roles (when called via RPC)
  IF current_setting('application_name', true) = 'admin_role_change' THEN
    RETURN NEW;
  END IF;
  
  -- Check if role is being changed
  IF OLD.role IS DISTINCT FROM NEW.role THEN
    -- Only allow if current user is admin AND not changing their own role
    IF get_current_user_role() = 'admin' AND auth.uid() != NEW.user_id THEN
      RETURN NEW;
    ELSE
      RAISE EXCEPTION 'Role modification not allowed: Users cannot change their own role or non-admins cannot change roles';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply the trigger to profiles_secure table
CREATE TRIGGER prevent_role_modification_secure
  BEFORE UPDATE ON public.profiles_secure
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_role_self_modification_secure();