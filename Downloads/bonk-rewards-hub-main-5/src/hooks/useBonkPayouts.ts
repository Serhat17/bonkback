import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/store/authStore';
import { useToast } from '@/hooks/use-toast';

interface BonkTransfer {
  id: string;
  amount: number;
  wallet_address: string;
  status: string;
  tx_hash: string | null;
  error_message: string | null;
  retry_count: number;
  source_type: string;
  created_at: string;
  updated_at: string;
}

interface ReferralPayout {
  id: string;
  referrer_id: string;
  referred_user_id: string;
  status: string;
  amount: number;
  required_threshold: number;
  unlocked_at: string | null;
  created_at: string;
}

export const useBonkPayouts = () => {
  const [transfers, setTransfers] = useState<BonkTransfer[]>([]);
  const [referralPayouts, setReferralPayouts] = useState<ReferralPayout[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuthStore();
  const { toast } = useToast();

  const fetchTransfers = async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('bonk_transfers')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTransfers(data || []);
    } catch (error) {
      console.error('Error fetching transfers:', error);
      toast({
        title: "Error",
        description: "Failed to fetch transfer history",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchReferralPayouts = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('referral_payouts')
        .select('*')
        .eq('referrer_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReferralPayouts(data || []);
    } catch (error) {
      console.error('Error fetching referral payouts:', error);
    }
  };

  const retryFailedTransfer = async (transferId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      // Find the failed transfer
      const transfer = transfers.find(t => t.id === transferId);
      if (!transfer || transfer.status !== 'failed') {
        throw new Error('Transfer not found or not in failed state');
      }

      const response = await supabase.functions.invoke('bonk-transfer', {
        body: {
          amount: transfer.amount,
          walletAddress: transfer.wallet_address,
          sourceType: transfer.source_type,
          retry: true, // Indicate this is a retry attempt
          originalTransferId: transferId
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (response.error) {
        throw new Error(response.error.message || 'Retry failed');
      }

      toast({
        title: "Transfer Retried",
        description: "Transfer has been retried successfully",
      });

      // Refresh transfers
      await fetchTransfers();
      
      return response.data;
    } catch (error: any) {
      console.error('Error retrying transfer:', error);
      toast({
        title: "Retry Failed",
        description: error?.message || "Failed to retry transfer. Please contact support if this persists.",
        variant: "destructive"
      });
      throw error;
    }
  };

  const checkPayoutEligibility = async (amount: number) => {
    if (!user) return null;
    
    try {
      const { data } = await supabase
        .rpc('check_payout_eligibility', {
          _user_id: user.id,
          _amount: amount
        });
      
      return data;
    } catch (error) {
      console.error('Error checking eligibility:', error);
      return null;
    }
  };

  const getPayoutSummary = () => {
    const totalTransferred = transfers
      .filter(t => t.status === 'completed')
      .reduce((sum, t) => sum + t.amount, 0);
      
    const pendingTransfers = transfers.filter(t => t.status === 'pending').length;
    const failedTransfers = transfers.filter(t => t.status === 'failed').length;
    
    const lockedReferrals = referralPayouts.filter(p => p.status === 'locked');
    const unlockedReferrals = referralPayouts.filter(p => p.status === 'unlocked');
    
    const totalLockedReferralAmount = lockedReferrals.reduce((sum, r) => sum + r.amount, 0);
    const totalUnlockedReferralAmount = unlockedReferrals.reduce((sum, r) => sum + r.amount, 0);

    return {
      totalTransferred,
      pendingTransfers,
      failedTransfers,
      lockedReferrals: lockedReferrals.length,
      unlockedReferrals: unlockedReferrals.length,
      totalLockedReferralAmount,
      totalUnlockedReferralAmount
    };
  };

  useEffect(() => {
    if (user) {
      fetchTransfers();
      fetchReferralPayouts();
    }
  }, [user]);

  return {
    transfers,
    referralPayouts,
    isLoading,
    fetchTransfers,
    fetchReferralPayouts,
    retryFailedTransfer,
    checkPayoutEligibility,
    getPayoutSummary
  };
};