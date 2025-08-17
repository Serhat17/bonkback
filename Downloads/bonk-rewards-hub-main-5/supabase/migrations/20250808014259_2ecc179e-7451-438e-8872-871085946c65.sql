-- Create account_deletion_requests table and production improvements

-- 1) Create the table first
CREATE TABLE public.account_deletion_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  processed_at TIMESTAMP WITH TIME ZONE NULL,
  admin_notes TEXT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.account_deletion_requests ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies
CREATE POLICY "Users can view their own deletion requests"
ON public.account_deletion_requests
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own deletion requests"
ON public.account_deletion_requests
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all deletion requests"
ON public.account_deletion_requests
FOR ALL
USING (get_current_user_role() = 'admin');

-- 2) Validate status values
ALTER TABLE public.account_deletion_requests
  ADD CONSTRAINT account_deletion_requests_status_chk
  CHECK (status IN ('pending','processing','completed','cancelled'));

-- 3) One pending request per user (prevents duplicates)
CREATE UNIQUE INDEX IF NOT EXISTS ux_delreq_user_pending
ON public.account_deletion_requests (user_id)
WHERE status = 'pending';

-- 4) Helpful indexes
CREATE INDEX IF NOT EXISTS idx_delreq_user ON public.account_deletion_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_delreq_status ON public.account_deletion_requests(status);
CREATE INDEX IF NOT EXISTS idx_delreq_processed_at ON public.account_deletion_requests(processed_at);

-- 5) Additional RLS: let users update/cancel ONLY their own *pending* request
CREATE POLICY "Users can update their own pending deletion request"
ON public.account_deletion_requests
FOR UPDATE
USING (auth.uid() = user_id AND status = 'pending')
WITH CHECK (auth.uid() = user_id AND status IN ('pending','cancelled'));

CREATE POLICY "Users can cancel their own pending deletion request"
ON public.account_deletion_requests
FOR DELETE
USING (auth.uid() = user_id AND status = 'pending');

-- 6) Helper function for requesting account deletion
CREATE OR REPLACE FUNCTION public.request_account_deletion()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  user_profile RECORD;
BEGIN
  -- Check if user is authenticated
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User not authenticated'
    );
  END IF;

  -- Get user profile
  SELECT user_id, email, full_name, deleted_at
  INTO user_profile
  FROM public.profiles
  WHERE user_id = auth.uid();

  -- Check if profile exists and is not deleted
  IF user_profile IS NULL OR user_profile.deleted_at IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User profile not found or already deleted'
    );
  END IF;

  -- Insert deletion request (unique constraint will prevent duplicates)
  INSERT INTO public.account_deletion_requests (user_id, status, requested_at)
  VALUES (auth.uid(), 'pending', now());

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Account deletion request submitted successfully'
  );

EXCEPTION 
  WHEN unique_violation THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'You already have a pending deletion request'
    );
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Failed to submit deletion request: ' || SQLERRM
    );
END;
$$;

-- 7) Helper function for cancelling account deletion
CREATE OR REPLACE FUNCTION public.cancel_account_deletion()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  -- Check if user is authenticated
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User not authenticated'
    );
  END IF;

  -- Update the pending request to cancelled
  UPDATE public.account_deletion_requests
  SET status = 'cancelled', updated_at = now()
  WHERE user_id = auth.uid() AND status = 'pending';

  -- Check if any row was updated
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'No pending deletion request found'
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Account deletion request cancelled successfully'
  );
END;
$$;

-- 8) Trigger for automatic timestamp updates
CREATE TRIGGER update_account_deletion_requests_updated_at
BEFORE UPDATE ON public.account_deletion_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();