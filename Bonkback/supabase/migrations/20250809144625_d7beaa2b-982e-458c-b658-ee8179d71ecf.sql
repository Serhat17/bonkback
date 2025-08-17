-- Phase 2: RLS Policy Hardening
-- Remove complex nested policies and add explicit role guards

-- Drop the complex role protection policy that has nested queries
DROP POLICY IF EXISTS "Users can update their own profile (except role)" ON public.profiles;

-- Create simplified profile update policy (without role restrictions)
CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING ((auth.uid() = user_id) AND (deleted_at IS NULL))
WITH CHECK ((auth.uid() = user_id) AND (deleted_at IS NULL));

-- Create explicit role guard trigger to prevent self-role modification
CREATE OR REPLACE FUNCTION public.prevent_role_self_modification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Allow admin functions to change roles (when called via RPC)
  IF current_setting('application_name', true) = 'admin_role_change' THEN
    RETURN NEW;
  END IF;
  
  -- Check if role is being changed
  IF OLD.role IS DISTINCT FROM NEW.role THEN
    -- Only allow if current user is admin AND not changing their own role
    IF public.get_current_user_role() = 'admin' AND auth.uid() != NEW.user_id THEN
      RETURN NEW;
    ELSE
      RAISE EXCEPTION 'Role modification not allowed: Users cannot change their own role or non-admins cannot change roles';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for role protection
DROP TRIGGER IF EXISTS prevent_role_self_modification_trigger ON public.profiles;
CREATE TRIGGER prevent_role_self_modification_trigger
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_role_self_modification();

-- Update the admin_change_user_role function to set application_name
CREATE OR REPLACE FUNCTION public.admin_change_user_role(target_user_id uuid, new_role text, reason text DEFAULT 'Admin role change'::text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  current_role TEXT;
  admin_user_id UUID;
BEGIN
  -- Get current admin user ID
  admin_user_id := auth.uid();
  
  -- Check if current user is admin
  IF public.get_current_user_role() != 'admin' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Unauthorized: Admin role required'
    );
  END IF;
  
  -- Validate new role
  IF new_role NOT IN ('admin', 'user') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid role: must be admin or user'
    );
  END IF;
  
  -- Get current role of target user
  SELECT role::text INTO current_role
  FROM public.profiles
  WHERE user_id = target_user_id;
  
  IF current_role IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User not found'
    );
  END IF;
  
  -- Prevent self-role changes for extra safety
  IF target_user_id = admin_user_id THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Cannot change your own role'
    );
  END IF;
  
  -- Set application name to bypass trigger restrictions
  PERFORM set_config('application_name', 'admin_role_change', true);
  
  -- Update the user's role (cast text to user_role enum)
  UPDATE public.profiles
  SET role = new_role::public.user_role, updated_at = now()
  WHERE user_id = target_user_id;
  
  -- Reset application name
  PERFORM set_config('application_name', '', true);
  
  -- Log the role change
  INSERT INTO public.role_change_audit (
    user_id, old_role, new_role, changed_by, reason
  ) VALUES (
    target_user_id, current_role, new_role, admin_user_id, reason
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Role changed successfully',
    'old_role', current_role,
    'new_role', new_role
  );
  
EXCEPTION WHEN OTHERS THEN
  -- Reset application name on error
  PERFORM set_config('application_name', '', true);
  RETURN jsonb_build_object(
    'success', false,
    'error', 'Failed to change role: ' || SQLERRM
  );
END;
$$;