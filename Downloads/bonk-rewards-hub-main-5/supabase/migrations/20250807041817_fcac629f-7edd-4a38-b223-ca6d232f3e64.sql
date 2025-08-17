-- First add the deleted_at column to profiles
ALTER TABLE public.profiles ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE;

-- Update delete_user_account function to use soft delete for profiles
CREATE OR REPLACE FUNCTION public.delete_user_account(target_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  deletion_count INTEGER := 0;
BEGIN
  -- Secure permission check
  IF get_current_user_role() IS DISTINCT FROM 'admin' AND auth.uid() != target_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized request: Not admin or owner');
  END IF;

  -- Log user into deleted_users_log before soft deletion
  INSERT INTO public.deleted_users_log (id, email, full_name, reason)
  SELECT user_id, email, full_name, 'GDPR deletion request'
  FROM public.profiles
  WHERE user_id = target_user_id AND deleted_at IS NULL;

  -- Hard delete from all related tables
  DELETE FROM public.referral_payouts WHERE referrer_id = target_user_id OR referred_user_id = target_user_id;
  DELETE FROM public.referrals WHERE referrer_id = target_user_id OR referred_id = target_user_id;
  DELETE FROM public.cashback_transactions WHERE user_id = target_user_id;
  DELETE FROM public.gift_card_redemptions WHERE user_id = target_user_id;
  DELETE FROM public.payout_requests WHERE user_id = target_user_id;
  DELETE FROM public.bonk_transfers WHERE user_id = target_user_id;
  DELETE FROM public.bonk_payout_events WHERE user_id = target_user_id;
  DELETE FROM public.payout_rate_limits WHERE user_id = target_user_id;
  DELETE FROM public.account_deletion_requests WHERE user_id = target_user_id;
  
  -- Soft delete profile instead of hard delete
  UPDATE public.profiles 
  SET deleted_at = now(), updated_at = now()
  WHERE user_id = target_user_id AND deleted_at IS NULL;
  
  -- Hard delete from auth.users (this triggers cascade cleanup)
  DELETE FROM auth.users WHERE id = target_user_id;

  RETURN jsonb_build_object('success', true, 'message', 'Account successfully deleted');
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Add policy for admins to view soft-deleted profiles
CREATE POLICY "Admins can view soft-deleted profiles"
ON public.profiles
FOR SELECT
USING (get_current_user_role() = 'admin');

-- Update existing profile policies to exclude soft-deleted users for regular users
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = user_id AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
USING (auth.uid() = user_id AND deleted_at IS NULL);

-- Enable RLS on deleted_users_log with proper security
ALTER TABLE public.deleted_users_log ENABLE ROW LEVEL SECURITY;

-- Only admins can access deleted_users_log
CREATE POLICY "Only admins can access deleted users log"
ON public.deleted_users_log
FOR ALL
USING (get_current_user_role() = 'admin');

-- Add updated_at column and trigger to deleted_users_log
ALTER TABLE public.deleted_users_log ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();

CREATE TRIGGER update_deleted_users_log_updated_at
  BEFORE UPDATE ON public.deleted_users_log
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();