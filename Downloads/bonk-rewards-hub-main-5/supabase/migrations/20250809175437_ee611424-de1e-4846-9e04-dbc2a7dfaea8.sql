-- Enhanced Solana Key Security Infrastructure
-- Create tables for hardware security module simulation, key rotation, and multi-signature support

-- 1. Solana Key Vault table for key rotation and versioning
CREATE TABLE IF NOT EXISTS public.solana_key_vault (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  version integer NOT NULL DEFAULT 1,
  derivation_path text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  last_rotation timestamp with time zone DEFAULT now(),
  rotated_at timestamp with time zone,
  rotation_reason text,
  UNIQUE(user_id, version)
);

-- 2. Transfer Approvals table for multi-signature support
CREATE TABLE IF NOT EXISTS public.transfer_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  wallet_address text NOT NULL,
  approver_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  approver_role text NOT NULL,
  signature text NOT NULL,
  status text NOT NULL DEFAULT 'approved' CHECK (status IN ('approved', 'revoked')),
  created_at timestamp with time zone DEFAULT now(),
  expires_at timestamp with time zone DEFAULT (now() + interval '24 hours')
);

-- 3. Transfer Approval Requests table for pending approvals
CREATE TABLE IF NOT EXISTS public.transfer_approval_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  wallet_address text NOT NULL,
  required_signatures integer NOT NULL DEFAULT 1,
  current_signatures integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'expired')),
  created_at timestamp with time zone DEFAULT now(),
  expires_at timestamp with time zone DEFAULT (now() + interval '48 hours'),
  approved_at timestamp with time zone,
  rejected_at timestamp with time zone
);

-- 4. Security Audit Log table for all security events
CREATE TABLE IF NOT EXISTS public.security_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  metadata jsonb DEFAULT '{}',
  timestamp timestamp with time zone DEFAULT now(),
  source text NOT NULL,
  severity text DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'error', 'critical')),
  ip_address text,
  user_agent text
);

-- Enable RLS on all new tables
ALTER TABLE public.solana_key_vault ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transfer_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transfer_approval_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for solana_key_vault
CREATE POLICY "Users can view their own key vault info"
ON public.solana_key_vault
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage key vault"
ON public.solana_key_vault
FOR ALL
TO authenticated
USING (get_current_user_role() = 'admin');

-- RLS Policies for transfer_approvals
CREATE POLICY "Users can view their own transfer approvals"
ON public.transfer_approvals
FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR auth.uid() = approver_id);

CREATE POLICY "Admins and security officers can create approvals"
ON public.transfer_approvals
FOR INSERT
TO authenticated
WITH CHECK (get_current_user_role() IN ('admin', 'security_officer', 'compliance_officer'));

CREATE POLICY "Admins can view all transfer approvals"
ON public.transfer_approvals
FOR ALL
TO authenticated
USING (get_current_user_role() = 'admin');

-- RLS Policies for transfer_approval_requests
CREATE POLICY "Users can view their own approval requests"
ON public.transfer_approval_requests
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own approval requests"
ON public.transfer_approval_requests
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all approval requests"
ON public.transfer_approval_requests
FOR ALL
TO authenticated
USING (get_current_user_role() = 'admin');

-- RLS Policies for security_audit_log
CREATE POLICY "Users can view their own security events"
ON public.security_audit_log
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all security events"
ON public.security_audit_log
FOR ALL
TO authenticated
USING (get_current_user_role() = 'admin');

CREATE POLICY "System can insert security events"
ON public.security_audit_log
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_solana_key_vault_user_active ON public.solana_key_vault(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_transfer_approvals_user_amount ON public.transfer_approvals(user_id, amount, wallet_address);
CREATE INDEX IF NOT EXISTS idx_transfer_approvals_status_expires ON public.transfer_approvals(status, expires_at);
CREATE INDEX IF NOT EXISTS idx_approval_requests_user_status ON public.transfer_approval_requests(user_id, status);
CREATE INDEX IF NOT EXISTS idx_security_audit_log_user_timestamp ON public.security_audit_log(user_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_security_audit_log_event_type ON public.security_audit_log(event_type, timestamp);

-- Add security metadata column to existing bonk_transfers table
ALTER TABLE public.bonk_transfers 
ADD COLUMN IF NOT EXISTS security_metadata jsonb DEFAULT '{}';

-- Create triggers for automatic cleanup of expired approvals
CREATE OR REPLACE FUNCTION public.cleanup_expired_approvals()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  -- Mark expired transfer approvals as revoked
  UPDATE public.transfer_approvals 
  SET status = 'revoked' 
  WHERE expires_at < now() AND status = 'approved';
  
  -- Mark expired approval requests as expired
  UPDATE public.transfer_approval_requests 
  SET status = 'expired' 
  WHERE expires_at < now() AND status = 'pending';
  
  RETURN NULL;
END;
$$;

-- Create a function to initialize key vault for new users
CREATE OR REPLACE FUNCTION public.initialize_user_key_vault()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  -- Create initial key vault entry for new user
  INSERT INTO public.solana_key_vault (
    user_id, 
    version, 
    derivation_path, 
    is_active,
    created_at,
    last_rotation
  ) VALUES (
    NEW.id,
    1,
    'initial_' || extract(epoch from now())::text,
    true,
    now(),
    now()
  );
  
  RETURN NEW;
END;
$$;

-- Trigger to initialize key vault for new users
DROP TRIGGER IF EXISTS initialize_key_vault_on_user_creation ON auth.users;
CREATE TRIGGER initialize_key_vault_on_user_creation
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.initialize_user_key_vault();

-- Comments for documentation
COMMENT ON TABLE public.solana_key_vault IS 'Secure key vault for Solana private key rotation and versioning';
COMMENT ON TABLE public.transfer_approvals IS 'Multi-signature approvals for large transfers';
COMMENT ON TABLE public.transfer_approval_requests IS 'Pending approval requests for multi-signature transfers';
COMMENT ON TABLE public.security_audit_log IS 'Comprehensive audit log for all security-related events';

COMMENT ON COLUMN public.solana_key_vault.derivation_path IS 'Unique derivation path for secure key generation';
COMMENT ON COLUMN public.transfer_approvals.signature IS 'Cryptographic signature from approver';
COMMENT ON COLUMN public.security_audit_log.metadata IS 'Additional context and details for the security event';