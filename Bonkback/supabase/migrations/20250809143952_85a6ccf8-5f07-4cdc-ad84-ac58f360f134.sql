-- Fix the admin_change_user_role function to properly handle the user_role enum
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
  
  -- Update the user's role (cast text to user_role enum)
  UPDATE public.profiles
  SET role = new_role::public.user_role, updated_at = now()
  WHERE user_id = target_user_id;
  
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
  RETURN jsonb_build_object(
    'success', false,
    'error', 'Failed to change role: ' || SQLERRM
  );
END;
$$;