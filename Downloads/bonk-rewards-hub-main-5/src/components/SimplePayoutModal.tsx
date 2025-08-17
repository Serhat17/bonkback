import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/store/authStore';
import { SolanaAddressInput } from '@/components/SolanaAddressInput';
import { validatePayoutRequest, createPayoutRequest } from '@/lib/data-access/payout-validation';
import { getTotalAvailableBalance } from '@/lib/data-access/available-cashback';
import { usePayoutEligibility } from '@/hooks/usePayoutEligibility';
import { Wallet, AlertTriangle, CheckCircle, Clock, X, Info } from 'lucide-react';

interface SimplePayoutModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SimplePayoutModal({ open, onOpenChange }: SimplePayoutModalProps) {
  const [amount, setAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [availableBalance, setAvailableBalance] = useState(0);
  const [recentTransfers, setRecentTransfers] = useState<any[]>([]);
  const [referralPayouts, setReferralPayouts] = useState<any[]>([]);
  const [balanceDetails, setBalanceDetails] = useState<any>(null);
  
  const { user, profile } = useAuthStore();
  const { toast } = useToast();
  const { eligibility, isLoading: eligibilityLoading } = usePayoutEligibility(parseFloat(amount) || undefined);

  useEffect(() => {
    if (open && user) {
      loadAvailableBalance();
      fetchRecentTransfers();
      fetchReferralPayouts();
    }
  }, [open, user]);

  const loadAvailableBalance = async () => {
    if (!user) return;
    
    try {
      // Get detailed balance info
      const { data: balanceData, error } = await supabase.rpc("get_my_wallet_balances_new");
      if (error) throw error;
      
      const balance = balanceData?.[0];
      if (balance) {
        setAvailableBalance(balance.bonk_available || 0);
        setBalanceDetails({
          total: balance.bonk_balance_total || 0,
          locked: balance.bonk_locked || 0,
          available: balance.bonk_available || 0
        });
      }
    } catch (error) {
      console.error('Error loading available balance:', error);
      setAvailableBalance(0);
    }
  };

  const validateAmount = async () => {
    // Validation is now handled by the usePayoutEligibility hook
    return;
  };

  const fetchRecentTransfers = async () => {
    if (!user) return;
    
    try {
      const { data } = await supabase
        .from('bonk_transfers')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);
      
      setRecentTransfers(data || []);
    } catch (error) {
      console.error('Error fetching transfers:', error);
    }
  };

  const fetchReferralPayouts = async () => {
    if (!user) return;
    
    try {
      const { data } = await supabase
        .from('referral_payouts')
        .select('*')
        .eq('referrer_id', user.id)
        .order('created_at', { ascending: false });
      
      setReferralPayouts(data || []);
    } catch (error) {
      console.error('Error fetching referral payouts:', error);
    }
  };

  useEffect(() => {
    validateAmount();
  }, [amount, user]);

  const handlePayoutRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !profile?.wallet_address) {
      toast({
        title: "Wallet Required",
        description: "Please set up a Solana wallet address first.",
        variant: "destructive"
      });
      return;
    }

    if (!eligibility?.eligible) {
      toast({
        title: "Payout Not Eligible",
        description: eligibility?.message || "Payout request cannot be processed at this time.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      await createPayoutRequest(
        user.id,
        parseFloat(amount),
        profile.wallet_address
      );

      toast({
        title: "Payout Request Submitted",
        description: "Your payout request has been submitted for processing.",
      });

      setAmount('');
      onOpenChange(false);
      fetchRecentTransfers();
    } catch (error: any) {
      console.error('Error submitting payout request:', error);
      toast({
        title: "Submission Failed",
        description: error?.message || "Failed to submit payout request. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'failed':
        return <X className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500/20 text-green-400';
      case 'pending':
        return 'bg-yellow-500/20 text-yellow-400';
      case 'failed':
        return 'bg-red-500/20 text-red-400';
      default:
        return 'bg-gray-500/20 text-gray-400';
    }
  };

  const lockedReferrals = referralPayouts.filter(p => p.status === 'locked');
  const unlockedReferrals = referralPayouts.filter(p => p.status === 'unlocked');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="w-5 h-5" />
            BONK Payout Request
          </DialogTitle>
          <DialogDescription>
            Request a BONK token payout to your Solana wallet address.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Balance Details */}
          <div className="bg-muted/50 p-4 rounded-lg space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Available for Payout</span>
              <span className="font-mono font-semibold text-green-400">
                {availableBalance.toLocaleString()} BONK
              </span>
            </div>
            {balanceDetails && (
              <>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Total Balance</span>
                  <span className="font-mono">{balanceDetails.total.toLocaleString()} BONK</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Locked Balance</span>
                  <span className="font-mono text-yellow-400">{balanceDetails.locked.toLocaleString()} BONK</span>
                </div>
              </>
            )}
            <div className="flex justify-between items-center mt-2 pt-2 border-t border-muted">
              <span className="text-sm text-muted-foreground">≈ EUR Value</span>
              <span className="text-sm font-mono">
                {(availableBalance * 0.000015).toFixed(2)}
              </span>
            </div>
          </div>

          {/* Eligibility Status */}
          {eligibility && (
            <div className={`p-4 rounded-lg border ${
              eligibility.eligible 
                ? 'bg-green-500/10 border-green-500/20' 
                : 'bg-red-500/10 border-red-500/20'
            }`}>
              <div className="flex items-start gap-2">
                {eligibility.eligible ? (
                  <CheckCircle className="w-4 h-4 text-green-400 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5" />
                )}
                <div className="space-y-1">
                  <p className="text-sm font-medium">
                    {eligibility.eligible ? 'Payout Eligible' : 'Payout Blocked'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {eligibility.message}
                  </p>
                  {eligibility.reason === 'anti_abuse_referral_ratio' && (
                    <div className="text-xs space-y-1 mt-2">
                      <p>• Normal cashback: {eligibility.normal_cashback_bonk?.toLocaleString()} BONK</p>
                      <p>• Referral rewards: {eligibility.referral_rewards_bonk?.toLocaleString()} BONK</p>
                      <p>• Required normal cashback: {eligibility.required_normal_cashback_bonk?.toLocaleString()} BONK</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Referral Status */}
          {(lockedReferrals.length > 0 || unlockedReferrals.length > 0) && (
            <div className="p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
              <h3 className="font-medium text-sm mb-2">Referral Earnings</h3>
              {unlockedReferrals.length > 0 && (
                <p className="text-sm text-green-400">
                  ✓ {unlockedReferrals.length} referral bonus{unlockedReferrals.length > 1 ? 'es' : ''} unlocked
                </p>
              )}
              {lockedReferrals.length > 0 && (
                <p className="text-sm text-yellow-400">
                  🔒 {lockedReferrals.length} referral bonus{lockedReferrals.length > 1 ? 'es' : ''} locked - earn more to unlock
                </p>
              )}
            </div>
          )}

          {/* Payout Form */}
          <form onSubmit={handlePayoutRequest} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount (BONK)</Label>
              <Input
                id="amount"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter amount in BONK"
                className={eligibility && !eligibility.eligible ? "border-destructive" : ""}
                disabled={isSubmitting}
              />
              {eligibility && !eligibility.eligible && (
                <p className="text-sm text-destructive mt-1">{eligibility.message}</p>
              )}
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              disabled={isSubmitting || !amount || !eligibility?.eligible || !profile?.wallet_address}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Payout Request'}
            </Button>
          </form>

          {/* Recent Transfers */}
          {recentTransfers.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-medium text-sm">Recent Payout Requests</h3>
              <div className="space-y-2">
                {recentTransfers.map((transfer) => (
                  <div key={transfer.id} className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(transfer.status)}
                      <div>
                        <p className="font-medium text-sm">
                          {transfer.amount.toLocaleString()} BONK
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(transfer.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <Badge className={getStatusColor(transfer.status)}>
                      {transfer.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}