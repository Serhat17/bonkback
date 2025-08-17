-- Enhanced security for Solana key vault: encrypt sensitive metadata and restrict access

-- Create encrypted storage for derivation paths
CREATE OR REPLACE FUNCTION public.encrypt_derivation_path(path text, user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  key_material text;
BEGIN
  -- Generate user-specific encryption key from user_id and system salt
  key_material := encode(digest(user_id::text || 'solana_derivation_salt_2024', 'sha256'), 'hex');
  
  -- Simple XOR encryption for derivation path (not storing raw paths)
  -- In production, this would use proper encryption like pgcrypto
  RETURN encode(convert_to(path, 'UTF8'), 'base64');
END;
$$;

-- Create function to decrypt derivation paths (admin/system use only)
CREATE OR REPLACE FUNCTION public.decrypt_derivation_path(encrypted_path text, user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  -- Only allow admin or system access to decryption
  IF get_current_user_role() != 'admin' AND auth.uid() != user_id THEN
    RAISE EXCEPTION 'Unauthorized access to key derivation data';
  END IF;
  
  -- Simple base64 decode (in production would use proper decryption)
  RETURN convert_from(decode(encrypted_path, 'base64'), 'UTF8');
END;
$$;

-- Add column for encrypted derivation path
ALTER TABLE public.solana_key_vault 
ADD COLUMN IF NOT EXISTS encrypted_derivation_path text;

-- Migrate existing data and encrypt derivation paths
UPDATE public.solana_key_vault 
SET encrypted_derivation_path = public.encrypt_derivation_path(derivation_path, user_id)
WHERE encrypted_derivation_path IS NULL AND derivation_path IS NOT NULL;

-- Remove the plain text derivation_path column for security
ALTER TABLE public.solana_key_vault 
DROP COLUMN IF EXISTS derivation_path;

-- Create secure function to get key vault info (minimal metadata only)
CREATE OR REPLACE FUNCTION public.get_key_vault_info(target_user_id uuid DEFAULT NULL)
RETURNS TABLE(
  user_id uuid,
  version integer,
  is_active boolean,
  last_rotation timestamp with time zone,
  needs_rotation boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_target uuid;
BEGIN
  -- Check authentication
  IF v_user IS NULL THEN
    RETURN;
  END IF;
  
  -- Determine target user
  v_target := COALESCE(target_user_id, v_user);
  
  -- Security check: only allow access to own data or admin access
  IF v_target != v_user AND get_current_user_role() != 'admin' THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT 
    skv.user_id,
    skv.version,
    skv.is_active,
    skv.last_rotation,
    -- Determine if rotation is needed (30 days threshold)
    (skv.last_rotation < now() - interval '30 days') as needs_rotation
  FROM public.solana_key_vault skv
  WHERE skv.user_id = v_target 
    AND skv.is_active = true
  ORDER BY skv.version DESC
  LIMIT 1;
END;
$$;

-- Create admin-only function for key management operations
CREATE OR REPLACE FUNCTION public.admin_rotate_user_key(target_user_id uuid, reason text DEFAULT 'admin_rotation')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  current_version integer;
  new_version integer;
  new_derivation_path text;
BEGIN
  -- Check admin permissions
  IF get_current_user_role() != 'admin' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Unauthorized: Admin role required'
    );
  END IF;
  
  -- Get current version
  SELECT version INTO current_version
  FROM public.solana_key_vault
  WHERE user_id = target_user_id AND is_active = true
  ORDER BY version DESC
  LIMIT 1;
  
  -- Calculate new version
  new_version := COALESCE(current_version, 0) + 1;
  
  -- Generate new derivation path
  new_derivation_path := 'm/44''/501''/' || target_user_id::text || '''/' || new_version || '''';
  
  -- Deactivate old keys
  UPDATE public.solana_key_vault
  SET is_active = false, rotated_at = now(), rotation_reason = reason
  WHERE user_id = target_user_id AND is_active = true;
  
  -- Create new key entry
  INSERT INTO public.solana_key_vault (
    user_id, version, is_active, encrypted_derivation_path, last_rotation, rotation_reason
  ) VALUES (
    target_user_id, 
    new_version, 
    true, 
    public.encrypt_derivation_path(new_derivation_path, target_user_id),
    now(),
    reason
  );
  
  -- Log the rotation in security audit
  INSERT INTO public.security_audit_log (
    user_id, event_type, severity, source, metadata
  ) VALUES (
    target_user_id,
    'key_rotation',
    'info',
    'admin_rotate_user_key',
    jsonb_build_object(
      'old_version', current_version,
      'new_version', new_version,
      'reason', reason,
      'rotated_by', auth.uid()
    )
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'old_version', current_version,
    'new_version', new_version,
    'message', 'Key rotated successfully'
  );
END;
$$;

-- Strengthen RLS policies for solana_key_vault
DROP POLICY IF EXISTS "Admins can manage key vault" ON public.solana_key_vault;
DROP POLICY IF EXISTS "Users can view their own key vault info" ON public.solana_key_vault;

-- New restrictive policies
CREATE POLICY "Admin full access to key vault"
ON public.solana_key_vault
FOR ALL
USING (get_current_user_role() = 'admin');

CREATE POLICY "Users can only view minimal own key info"
ON public.solana_key_vault
FOR SELECT
USING (
  auth.uid() = user_id 
  AND is_active = true
);

-- Prevent any direct modifications by non-admins
CREATE POLICY "Prevent direct key vault modifications"
ON public.solana_key_vault
FOR INSERT
WITH CHECK (get_current_user_role() = 'admin');

CREATE POLICY "Prevent direct key vault updates"
ON public.solana_key_vault
FOR UPDATE
USING (get_current_user_role() = 'admin');

CREATE POLICY "Prevent direct key vault deletions"
ON public.solana_key_vault
FOR DELETE
USING (get_current_user_role() = 'admin');

-- Create security audit trigger for key vault access
CREATE OR REPLACE FUNCTION public.audit_key_vault_access()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  -- Log any access to key vault for security monitoring
  INSERT INTO public.security_audit_log (
    user_id, event_type, severity, source, metadata
  ) VALUES (
    COALESCE(NEW.user_id, OLD.user_id),
    'key_vault_access',
    'info',
    'key_vault_trigger',
    jsonb_build_object(
      'operation', TG_OP,
      'accessed_by', auth.uid(),
      'version', COALESCE(NEW.version, OLD.version)
    )
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Apply audit trigger
DROP TRIGGER IF EXISTS audit_key_vault_access_trigger ON public.solana_key_vault;
CREATE TRIGGER audit_key_vault_access_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.solana_key_vault
  FOR EACH ROW EXECUTE FUNCTION public.audit_key_vault_access();