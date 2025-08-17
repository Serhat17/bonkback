-- Create role change audit table first
CREATE TABLE IF NOT EXISTS public.role_change_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  old_role user_role,
  new_role user_role NOT NULL,
  changed_by UUID NOT NULL,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create admin function for role changes
CREATE OR REPLACE FUNCTION public.admin_change_user_role(
  target_user_id UUID,
  new_role user_role,
  reason TEXT DEFAULT 'Admin role change'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  current_role user_role;
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
  
  -- Get current role of target user
  SELECT role INTO current_role
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
  
  -- Update the user's role
  UPDATE public.profiles
  SET role = new_role, updated_at = now()
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

-- Now apply the security fixes
-- 1) FORCE RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;

ALTER TABLE public.role_change_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_change_audit FORCE ROW LEVEL SECURITY;

-- 2) Make policy helpers schema-qualified
DROP POLICY IF EXISTS "Users can update their own profile (except role)" ON public.profiles;
CREATE POLICY "Users can update their own profile (except role)"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = user_id AND deleted_at IS NULL)
  WITH CHECK (
    auth.uid() = user_id
    AND deleted_at IS NULL
    AND role = (SELECT p.role FROM public.profiles p WHERE p.user_id = auth.uid())
  );

-- Role audit table policy: schema-qualify helper
DROP POLICY IF EXISTS "Admins can manage role audit logs" ON public.role_change_audit;
CREATE POLICY "Admins can manage role audit logs"
  ON public.role_change_audit
  FOR ALL
  USING (public.get_current_user_role() = 'admin')
  WITH CHECK (public.get_current_user_role() = 'admin');

-- 3) Column-level belt-and-suspenders: non-admins cannot UPDATE role
REVOKE UPDATE (role) ON public.profiles FROM anon, authenticated;

-- 4) Trigger guard to block non-admin role changes at the DB layer
CREATE OR REPLACE FUNCTION public.enforce_role_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role
     AND public.get_current_user_role() <> 'admin' THEN
    RAISE EXCEPTION 'forbidden: role changes require admin';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_role_guard ON public.profiles;
CREATE TRIGGER trg_enforce_role_guard
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.enforce_role_guard();

-- 5) Lock down the admin function's execute privileges
REVOKE ALL ON FUNCTION public.admin_change_user_role(uuid, user_role, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_change_user_role(uuid, user_role, text) TO authenticated;

-- Ensure trusted owners
DO $$
BEGIN
  ALTER FUNCTION public.admin_change_user_role(uuid, user_role, text) OWNER TO postgres;
  ALTER FUNCTION public.enforce_role_guard() OWNER TO postgres;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;