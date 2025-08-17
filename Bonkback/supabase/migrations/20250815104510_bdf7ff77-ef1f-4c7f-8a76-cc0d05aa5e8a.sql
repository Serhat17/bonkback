-- Email Notifications System
CREATE TABLE public.email_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  subject_template text NOT NULL,
  html_template text NOT NULL,
  text_template text,
  variables jsonb DEFAULT '[]'::jsonb,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.email_notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  template_name text NOT NULL,
  recipient_email text NOT NULL,
  subject text NOT NULL,
  html_content text NOT NULL,
  text_content text,
  variables jsonb DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')),
  sent_at timestamp with time zone,
  error_message text,
  attempts integer DEFAULT 0,
  max_attempts integer DEFAULT 3,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Customer Support System
CREATE TABLE public.support_tickets (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  subject text NOT NULL,
  description text NOT NULL,
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  category text NOT NULL DEFAULT 'general' CHECK (category IN ('general', 'account', 'payment', 'technical', 'billing', 'security')),
  assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  resolution_notes text,
  customer_email text,
  customer_name text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  resolved_at timestamp with time zone
);

CREATE TABLE public.support_ticket_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  message text NOT NULL,
  is_internal boolean DEFAULT false,
  attachments jsonb DEFAULT '[]'::jsonb,
  created_at timestamp with time zone DEFAULT now()
);

-- Tax Reporting System (Germany-specific)
CREATE TABLE public.tax_reports (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tax_year integer NOT NULL,
  country_code text NOT NULL DEFAULT 'DE',
  report_type text NOT NULL DEFAULT 'annual' CHECK (report_type IN ('annual', 'quarterly', 'monthly')),
  total_cashback_eur numeric(12,2) DEFAULT 0,
  total_referral_eur numeric(12,2) DEFAULT 0,
  total_withdrawals_eur numeric(12,2) DEFAULT 0,
  taxable_amount_eur numeric(12,2) DEFAULT 0,
  report_data jsonb DEFAULT '{}'::jsonb,
  file_path text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'generated', 'downloaded', 'submitted')),
  generated_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, tax_year, report_type, country_code)
);

CREATE TABLE public.tax_transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  transaction_type text NOT NULL CHECK (transaction_type IN ('cashback', 'referral', 'withdrawal', 'gift_card')),
  transaction_date timestamp with time zone NOT NULL,
  amount_bonk numeric(20,8) NOT NULL,
  amount_eur numeric(12,2) NOT NULL,
  exchange_rate numeric(20,8) NOT NULL,
  source_transaction_id uuid,
  tax_year integer GENERATED ALWAYS AS (EXTRACT(YEAR FROM transaction_date)) STORED,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now()
);

-- GDPR Compliance Tools
CREATE TABLE public.data_export_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  request_type text NOT NULL DEFAULT 'full_export' CHECK (request_type IN ('full_export', 'partial_export', 'specific_data')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'expired')),
  data_categories text[] DEFAULT ARRAY['profile', 'transactions', 'referrals', 'support'],
  export_format text NOT NULL DEFAULT 'json' CHECK (export_format IN ('json', 'csv', 'pdf')),
  file_path text,
  file_size bigint,
  expires_at timestamp with time zone DEFAULT (now() + interval '30 days'),
  processed_at timestamp with time zone,
  downloaded_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.consent_records (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  consent_type text NOT NULL CHECK (consent_type IN ('cookies', 'marketing', 'analytics', 'data_processing', 'terms')),
  consent_given boolean NOT NULL,
  consent_version text NOT NULL,
  ip_address inet,
  user_agent text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_ticket_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tax_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tax_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_export_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consent_records ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Email System
CREATE POLICY "Admins can manage email templates" ON public.email_templates
  FOR ALL USING (get_current_user_role() = 'admin');

CREATE POLICY "Users can view their own email notifications" ON public.email_notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all email notifications" ON public.email_notifications
  FOR ALL USING (get_current_user_role() = 'admin');

-- RLS Policies for Support System
CREATE POLICY "Users can create and view their own support tickets" ON public.support_tickets
  FOR SELECT USING (auth.uid() = user_id OR get_current_user_role() = 'admin');

CREATE POLICY "Users can create their own support tickets" ON public.support_tickets
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tickets, admins can update all" ON public.support_tickets
  FOR UPDATE USING (auth.uid() = user_id OR get_current_user_role() = 'admin');

CREATE POLICY "Admins can manage all support tickets" ON public.support_tickets
  FOR ALL USING (get_current_user_role() = 'admin');

CREATE POLICY "Users can view messages for their tickets" ON public.support_ticket_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.support_tickets 
      WHERE id = ticket_id AND (user_id = auth.uid() OR get_current_user_role() = 'admin')
    )
  );

CREATE POLICY "Users can add messages to their tickets" ON public.support_ticket_messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.support_tickets 
      WHERE id = ticket_id AND (user_id = auth.uid() OR get_current_user_role() = 'admin')
    )
  );

-- RLS Policies for Tax System
CREATE POLICY "Users can manage their own tax reports" ON public.tax_reports
  FOR ALL USING (auth.uid() = user_id OR get_current_user_role() = 'admin');

CREATE POLICY "Users can view their own tax transactions" ON public.tax_transactions
  FOR SELECT USING (auth.uid() = user_id OR get_current_user_role() = 'admin');

CREATE POLICY "System can insert tax transactions" ON public.tax_transactions
  FOR INSERT WITH CHECK (true);

-- RLS Policies for GDPR System
CREATE POLICY "Users can manage their own data export requests" ON public.data_export_requests
  FOR ALL USING (auth.uid() = user_id OR get_current_user_role() = 'admin');

CREATE POLICY "Users can manage their own consent records" ON public.consent_records
  FOR ALL USING (auth.uid() = user_id OR get_current_user_role() = 'admin');

-- Insert default email templates
INSERT INTO public.email_templates (name, subject_template, html_template, text_template, variables) VALUES
('welcome', 'Welcome to BonkBack!', 
'<h1>Welcome {{name}}!</h1><p>Thank you for joining BonkBack. Start earning BONK tokens with every purchase!</p>',
'Welcome {{name}}! Thank you for joining BonkBack. Start earning BONK tokens with every purchase!',
'["name"]'::jsonb),

('cashback_earned', 'You earned {{amount}} BONK!', 
'<h1>Cashback Earned!</h1><p>Great news! You just earned {{amount}} BONK tokens from your purchase at {{merchant}}.</p>',
'Cashback Earned! You just earned {{amount}} BONK tokens from your purchase at {{merchant}}.',
'["amount", "merchant"]'::jsonb),

('payout_processed', 'Your withdrawal is complete', 
'<h1>Withdrawal Processed</h1><p>Your withdrawal of {{amount}} BONK has been successfully processed to {{wallet}}.</p>',
'Your withdrawal of {{amount}} BONK has been successfully processed to {{wallet}}.',
'["amount", "wallet"]'::jsonb),

('referral_bonus', 'Referral bonus earned!', 
'<h1>Referral Bonus!</h1><p>You earned {{amount}} BONK for referring {{referredUser}} to BonkBack!</p>',
'You earned {{amount}} BONK for referring {{referredUser}} to BonkBack!',
'["amount", "referredUser"]'::jsonb);

-- Functions for tax calculations
CREATE OR REPLACE FUNCTION calculate_german_tax_liability(user_id uuid, tax_year integer)
RETURNS numeric AS $$
DECLARE
  total_income_eur numeric := 0;
  tax_free_allowance numeric := 801; -- German tax-free allowance for capital gains 2024
BEGIN
  SELECT 
    COALESCE(SUM(amount_eur), 0)
  INTO total_income_eur
  FROM public.tax_transactions
  WHERE tax_transactions.user_id = calculate_german_tax_liability.user_id
    AND tax_transactions.tax_year = calculate_german_tax_liability.tax_year;
  
  -- Apply tax-free allowance
  IF total_income_eur <= tax_free_allowance THEN
    RETURN 0;
  ELSE
    RETURN total_income_eur - tax_free_allowance;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create tax transaction records
CREATE OR REPLACE FUNCTION record_tax_transaction(
  p_user_id uuid,
  p_type text,
  p_amount_bonk numeric,
  p_amount_eur numeric,
  p_exchange_rate numeric,
  p_source_id uuid DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  INSERT INTO public.tax_transactions (
    user_id, transaction_type, transaction_date, amount_bonk, 
    amount_eur, exchange_rate, source_transaction_id
  ) VALUES (
    p_user_id, p_type, now(), p_amount_bonk, 
    p_amount_eur, p_exchange_rate, p_source_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;