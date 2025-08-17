import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/store/authStore';
import { useToast } from '@/hooks/use-toast';
import { buildReferralUrl } from '@/lib/domain';

export const useReferral = () => {
  const [searchParams] = useSearchParams();
  const { user, profile, fetchProfile } = useAuthStore();
  const { toast } = useToast();
  const [referralStats, setReferralStats] = useState({
    totalReferrals: 0,
    totalRewards: 0,
    pendingRewards: 0
  });
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    // Handle referral code from URL or localStorage
    const referralCode = searchParams.get('ref') || localStorage.getItem('referral_code');
    if (referralCode && user && !profile?.referred_by) {
      handleReferralSignup(referralCode);
      // Clear from localStorage after processing
      localStorage.removeItem('referral_code');
    }
  }, [searchParams, user, profile]);

  useEffect(() => {
    if (user) {
      fetchReferralStats();
    }
  }, [user]);

  const handleReferralSignup = async (referralCode: string) => {
    // Prevent self-referral client-side
    if (profile?.referral_code === referralCode) {
      console.warn('Self-referral detected; ignoring.');
      return;
    }

    try {
      setIsProcessing(true);
      const { data: claimResult } = await supabase.rpc('claim_my_referral', { p_referral_code: referralCode });
      
      type ReferralResult = {
        success: boolean;
        error?: string;
        referrer_id?: string;
        credited?: {
          referrer: number;
          referred: number;
        };
        payout_ids?: {
          referrer: string;
          referred: string;
        };
      };

      const result = claimResult as ReferralResult | null;

      if (result?.success && result.payout_ids?.referred) {
        // Only show success if we have confirmed payout IDs
        const creditedAmount = result.credited?.referred || 333333;
        toast({
          title: "Referral Bonus Credited!",
          description: `You've received ${creditedAmount.toLocaleString()} BONK as a welcome bonus!`,
        });
        
        // Refresh profile and stats to show new balance
        await fetchProfile();
        await fetchReferralStats();
      } else {
        if (result?.error === 'Self-referrals are not allowed') {
          console.warn('Self-referral detected; ignoring.');
        } else if (result?.error === 'Referral reward already processed') {
          console.info('Referral already processed');
        } else if (result?.error) {
          console.error('Failed to claim referral reward:', result.error);
        } else {
          console.error('Failed to claim referral reward: No payout confirmation');
        }
      }
    } catch (error) {
      console.error('Error handling referral signup:', error);
      toast({
        title: "Referral Processing Failed",
        description: "There was an error processing your referral. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const fetchReferralStats = async () => {
    if (!user) return;

    try {
      const { data: referrals, error } = await supabase
        .from('referrals')
        .select('*')
        .eq('referrer_id', user.id);

      if (!error && referrals) {
        const totalReferrals = referrals.length;
        const totalRewards = referrals.filter(r => r.reward_claimed).length * 333333;
        const pendingRewards = referrals.filter(r => !r.reward_claimed).length * 333333;

        setReferralStats({
          totalReferrals,
          totalRewards,
          pendingRewards
        });
      }
    } catch (error) {
      console.error('Error fetching referral stats:', error);
    }
  };

  const generateReferralLink = async () => {
    if (!profile?.referral_code) return '';
    return await buildReferralUrl(profile.referral_code);
  };

  const copyReferralLink = async () => {
    const link = await generateReferralLink();
    if (!link) return;

    try {
      await navigator.clipboard.writeText(link);
      toast({
        title: "Link Copied!",
        description: "Referral link has been copied to clipboard.",
      });
    } catch (error) {
      console.error('Failed to copy link:', error);
      toast({
        title: "Copy Failed",
        description: "Failed to copy link. Please try again.",
        variant: "destructive"
      });
    }
  };

  const claimReferralReward = async () => {
    try {
      setIsProcessing(true);
      const { data: res } = await supabase.rpc('process_my_unclaimed_referrals');
      
      type BatchResult = {
        success: boolean;
        error?: string;
        processed?: number;
        total_credited?: number;
        message?: string;
      };

      const result = res as BatchResult | null;

      if (result?.success && (result.processed || 0) > 0) {
        toast({
          title: "Rewards Credited!",
          description: result.message || `${result.processed || 0} referral(s) processed for ${(result.total_credited || 0).toLocaleString()} BONK total.`,
        });
        
        // Refresh profile and stats to show new balance
        await fetchProfile();
        await fetchReferralStats();
      } else if (result?.success && (result.processed || 0) === 0) {
        toast({
          title: "No Rewards to Process",
          description: "All your referral rewards have already been processed.",
        });
      } else {
        toast({
          title: "Claim Failed",
          description: result?.error || "Failed to claim rewards",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error claiming referral reward:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred while claiming rewards",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    referralStats,
    generateReferralLink,
    copyReferralLink,
    fetchReferralStats,
    claimReferralReward,
    isProcessing
  };
};