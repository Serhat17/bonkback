import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/store/authStore';

export interface PayoutEligibilityData {
  eligible: boolean;
  reason?: string;
  message?: string;
  available?: number;
  balance_total?: number;
  locked_total?: number;
  normal_cashback_bonk?: number;
  referral_rewards_bonk?: number;
  required_normal_cashback_bonk?: number;
}

export function usePayoutEligibility(amount?: number) {
  const [eligibility, setEligibility] = useState<PayoutEligibilityData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuthStore();

  const checkEligibility = async (checkAmount?: number) => {
    if (!user || !checkAmount || checkAmount <= 0) {
      setEligibility(null);
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc('check_payout_eligibility', {
        _user_id: user.id,
        _amount: checkAmount
      });

      if (error) throw error;
      setEligibility(data ? data as unknown as PayoutEligibilityData : null);
    } catch (error) {
      console.error('Error checking payout eligibility:', error);
      setEligibility({
        eligible: false,
        message: 'Failed to check eligibility'
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (amount) {
      checkEligibility(amount);
    }
  }, [amount, user]);

  return {
    eligibility,
    isLoading,
    checkEligibility
  };
}