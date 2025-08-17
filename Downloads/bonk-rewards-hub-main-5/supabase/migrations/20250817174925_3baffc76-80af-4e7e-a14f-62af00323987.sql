-- Create test profiles with demo referral codes for jury testing
-- These will allow the referral demo to work properly

-- First, create test user entries in profiles table with demo referral codes
INSERT INTO public.profiles (
  user_id,
  email,
  full_name,
  referral_code,
  bonk_balance,
  total_earned,
  role,
  created_at,
  updated_at
) VALUES 
  -- Demo referral code user
  (
    '00000000-0000-0000-0000-000000000001'::uuid,
    'demo@bonkback.io',
    'Demo User',
    'DEMO2024',
    500000,
    750000,
    'user',
    now(),
    now()
  ),
  -- Test code user
  (
    '00000000-0000-0000-0000-000000000002'::uuid,
    'test@bonkback.io', 
    'Test User',
    'TESTCODE',
    333333,
    500000,
    'user',
    now(),
    now()
  ),
  -- Bulk referral user
  (
    '00000000-0000-0000-0000-000000000003'::uuid,
    'bulk@bonkback.io',
    'Bulk Test User',
    'BULK2024',
    1000000,
    1500000,
    'user',
    now(),
    now()
  ),
  -- Jury test codes
  (
    '00000000-0000-0000-0000-000000000004'::uuid,
    'jury1@bonkback.io',
    'Jury Test 1',
    'JURY001',
    250000,
    300000,
    'user',
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000005'::uuid,
    'jury2@bonkback.io',
    'Jury Test 2', 
    'JURY002',
    180000,
    220000,
    'user',
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000006'::uuid,
    'jury3@bonkback.io',
    'Jury Test 3',
    'JURY003',
    420000,
    500000,
    'user',
    now(),
    now()
  )
ON CONFLICT (user_id) DO UPDATE SET
  referral_code = EXCLUDED.referral_code,
  bonk_balance = EXCLUDED.bonk_balance,
  total_earned = EXCLUDED.total_earned,
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  updated_at = now();

-- Create some test referral relationships for more realistic testing
INSERT INTO public.referrals (
  referrer_id,
  referred_id,
  referral_code,
  reward_claimed,
  referred_user_claimed,
  created_at,
  updated_at
) VALUES
  -- DEMO2024 user has referred some people
  (
    '00000000-0000-0000-0000-000000000001'::uuid, -- DEMO2024 user
    '00000000-0000-0000-0000-000000000002'::uuid, -- TESTCODE user
    'DEMO2024',
    true,
    true,
    now() - interval '7 days',
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000003'::uuid, -- BULK2024 user  
    '00000000-0000-0000-0000-000000000004'::uuid, -- JURY001 user
    'BULK2024',
    true,
    true,
    now() - interval '3 days',
    now()
  )
ON CONFLICT (referrer_id, referred_id) DO UPDATE SET
  referral_code = EXCLUDED.referral_code,
  reward_claimed = EXCLUDED.reward_claimed,
  referred_user_claimed = EXCLUDED.referred_user_claimed,
  updated_at = now();

-- Create some referral payouts to show the system working
INSERT INTO public.referral_payouts (
  referrer_id,
  referred_user_id,
  beneficiary_id,
  amount,
  status,
  required_threshold,
  unlocked_at,
  created_at,
  updated_at
) VALUES
  -- Referral payout for DEMO2024 user
  (
    '00000000-0000-0000-0000-000000000001'::uuid, -- referrer (DEMO2024)
    '00000000-0000-0000-0000-000000000002'::uuid, -- referred (TESTCODE)
    '00000000-0000-0000-0000-000000000001'::uuid, -- beneficiary (DEMO2024)
    333333,
    'completed',
    0,
    now() - interval '6 days',
    now() - interval '7 days',
    now()
  ),
  -- Referral payout for referred user (TESTCODE gets welcome bonus)
  (
    '00000000-0000-0000-0000-000000000001'::uuid, -- referrer (DEMO2024)
    '00000000-0000-0000-0000-000000000002'::uuid, -- referred (TESTCODE)
    '00000000-0000-0000-0000-000000000002'::uuid, -- beneficiary (TESTCODE)
    333333,
    'completed',
    0,
    now() - interval '6 days',
    now() - interval '7 days',
    now()
  ),
  -- Referral payout for BULK2024 user
  (
    '00000000-0000-0000-0000-000000000003'::uuid, -- referrer (BULK2024)
    '00000000-0000-0000-0000-000000000004'::uuid, -- referred (JURY001)
    '00000000-0000-0000-0000-000000000003'::uuid, -- beneficiary (BULK2024)
    333333,
    'completed',
    0,
    now() - interval '2 days',
    now() - interval '3 days',
    now()
  ),
  -- Welcome bonus for JURY001
  (
    '00000000-0000-0000-0000-000000000003'::uuid, -- referrer (BULK2024)
    '00000000-0000-0000-0000-000000000004'::uuid, -- referred (JURY001)
    '00000000-0000-0000-0000-000000000004'::uuid, -- beneficiary (JURY001)
    333333,
    'completed',
    0,
    now() - interval '2 days',
    now() - interval '3 days',
    now()
  )
ON CONFLICT (referrer_id, referred_user_id, beneficiary_id) DO UPDATE SET
  amount = EXCLUDED.amount,
  status = EXCLUDED.status,
  unlocked_at = EXCLUDED.unlocked_at,
  updated_at = now();