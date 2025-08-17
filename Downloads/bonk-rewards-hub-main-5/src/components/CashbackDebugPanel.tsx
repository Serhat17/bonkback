import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/store/authStore';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DollarSign, ShoppingBag, RefreshCw, Settings, Award } from 'lucide-react';

export const CashbackDebugPanel = () => {
  const { user, profile, fetchProfile } = useAuthStore();
  const { toast } = useToast();
  const [availableCashback, setAvailableCashback] = useState<any[]>([]);
  const [cashbackOffers, setCashbackOffers] = useState<any[]>([]);
  const [selectedOfferId, setSelectedOfferId] = useState<string>('');
  const [testAmount, setTestAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [testMerchant, setTestMerchant] = useState('');
  const [testPercentage, setTestPercentage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const fetchAvailableCashback = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_my_available_cashback');
      if (error) throw error;
      setAvailableCashback(data || []);
    } catch (error) {
      console.error('Failed to fetch available cashback:', error);
      toast({
        title: "Fetch Failed",
        description: "Could not fetch available cashback data",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCashbackOffers = async () => {
    try {
      const { data: offers, error } = await supabase
        .from('cashback_offers')
        .select('id, title, merchant_name, cashback_percentage')
        .eq('status', 'active')
        .order('merchant_name');
      
      if (error) throw error;
      setCashbackOffers(offers || []);
      
      // Auto-select first offer if none selected
      if (offers && offers.length > 0 && !selectedOfferId) {
        setSelectedOfferId(offers[0].id);
        const firstOffer = offers[0];
        setTestMerchant(firstOffer.merchant_name);
        setTestPercentage(firstOffer.cashback_percentage.toString());
      }
    } catch (error) {
      console.error('Failed to fetch cashback offers:', error);
      toast({
        title: "Failed to load offers",
        description: "Could not fetch available cashback offers",
        variant: "destructive"
      });
    }
  };

  React.useEffect(() => {
    if (user) {
      fetchCashbackOffers();
    }
  }, [user]);

  const checkPayoutEligibility = async () => {
    if (!withdrawAmount || !user) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc('check_payout_eligibility', {
        _user_id: user.id,
        _amount: parseFloat(withdrawAmount)
      });
      if (error) throw error;
      
      const result = data as any;
      toast({
        title: result?.eligible ? "Eligible for Payout" : "Not Eligible",
        description: result?.message || 'Eligibility check completed',
        variant: result?.eligible ? "default" : "destructive"
      });
    } catch (error) {
      console.error('Eligibility check failed:', error);
      toast({
        title: "Check Failed",
        description: "Could not check payout eligibility",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const simulateCashbackTransaction = async () => {
    if (!testAmount || !testMerchant || !testPercentage || !user || !selectedOfferId) return;
    
    setIsLoading(true);
    try {

      const purchaseAmount = parseFloat(testAmount);
      const cashbackPercent = parseFloat(testPercentage);
      const cashbackAmount = (purchaseAmount * cashbackPercent) / 100;
      
      // Simulate BONK conversion (assuming 1 USD = 1000 BONK for testing)
      const bonkAmount = cashbackAmount * 1000;

      // Create transaction with PENDING status first (realistic flow)
      const { data: transaction, error } = await supabase
        .from('cashback_transactions')
        .insert({
          user_id: user.id,
          offer_id: selectedOfferId,
          purchase_amount: purchaseAmount,
          cashback_amount: cashbackAmount,
          bonk_amount: bonkAmount,
          status: 'pending', // Start with pending like real purchases
          order_id: `TEST_${Date.now()}`,
          purchase_date: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Realistic Purchase Simulated!",
        description: `Purchase: $${purchaseAmount} at ${testMerchant}. Cashback: ${bonkAmount} BONK (PENDING approval)`,
      });

      // Simulate the approval process after 2 seconds
      setTimeout(async () => {
        try {
          const { error: approveError } = await supabase
            .from('cashback_transactions')
            .update({ 
              status: 'approved',
              approved_date: new Date().toISOString()
            })
            .eq('id', transaction.id);

          if (approveError) throw approveError;

          toast({
            title: "Cashback Approved!",
            description: `${bonkAmount} BONK approved! Available after return window (${transaction.return_window_ends_at ? new Date(transaction.return_window_ends_at).toLocaleDateString() : '30 days'})`,
          });

          await fetchAvailableCashback();
        } catch (error) {
          console.error('Approval simulation failed:', error);
        }
      }, 2000);

      await fetchProfile();
      await fetchAvailableCashback();
    } catch (error) {
      console.error('Simulation failed:', error);
      toast({
        title: "Simulation Failed",
        description: "Could not create test transaction",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const simulateInstantApproval = async () => {
    if (!testAmount || !testMerchant || !testPercentage || !user || !selectedOfferId) return;
    
    setIsLoading(true);
    try {
      const purchaseAmount = parseFloat(testAmount);
      const cashbackPercent = parseFloat(testPercentage);
      const cashbackAmount = (purchaseAmount * cashbackPercent) / 100;
      const bonkAmount = cashbackAmount * 1000;

      // Create approved transaction with past return window (immediately available)
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 31); // 31 days ago

      const { data: transaction, error } = await supabase
        .from('cashback_transactions')
        .insert({
          user_id: user.id,
          offer_id: selectedOfferId,
          purchase_amount: purchaseAmount,
          cashback_amount: cashbackAmount,
          bonk_amount: bonkAmount,
          status: 'approved',
          order_id: `INSTANT_${Date.now()}`,
          purchase_date: pastDate.toISOString(), // Past date to bypass return window
          approved_date: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      // Credit the BONK immediately to simulate available cashback
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          bonk_balance: (profile?.bonk_balance || 0) + bonkAmount,
          total_earned: (profile?.total_earned || 0) + bonkAmount,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      toast({
        title: "Instant Available Cashback!",
        description: `${bonkAmount} BONK immediately available! (Simulated past return window)`,
      });

      await fetchProfile();
      await fetchAvailableCashback();
    } catch (error) {
      console.error('Instant simulation failed:', error);
      toast({
        title: "Simulation Failed",
        description: "Could not create instant transaction",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const refreshCashbackPolicy = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('cashback_policy')
        .select('*')
        .eq('id', true)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      toast({
        title: "Policy Refreshed",
        description: data 
          ? `Immediate: ${data.immediate_release_percent}%, Deferred: ${data.deferred_release_delay_days} days`
          : "Using default policy settings",
      });
    } catch (error) {
      console.error('Policy refresh failed:', error);
      toast({
        title: "Refresh Failed",
        description: "Could not refresh cashback policy",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) return null;

  const totalAvailable = availableCashback.reduce((sum, item) => sum + (item.available_amount || 0), 0);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Cashback Earning System Debug Panel
        </CardTitle>
        <CardDescription>
          Debug and test the cashback earning system
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Cashback Info */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-sm text-muted-foreground">Available Cashback</div>
            <div className="font-mono">{totalAvailable.toFixed(2)} BONK</div>
          </div>
          <div className="text-center">
            <div className="text-sm text-muted-foreground">Total Earned</div>
            <div className="font-mono">{profile?.total_earned?.toLocaleString() || 0}</div>
          </div>
          <div className="text-center">
            <div className="text-sm text-muted-foreground">BONK Balance</div>
            <div className="font-mono">{profile?.bonk_balance?.toLocaleString() || 0}</div>
          </div>
          <div className="text-center">
            <div className="text-sm text-muted-foreground">Transactions</div>
            <Badge variant="outline">{availableCashback.length}</Badge>
          </div>
        </div>

        <Separator />

        {/* Debug Actions */}
        <div className="flex flex-wrap gap-3">
          <Button onClick={fetchAvailableCashback} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Fetch Cashback Data
          </Button>
          <Button onClick={refreshCashbackPolicy} disabled={isLoading} variant="secondary">
            <Settings className="h-4 w-4 mr-2" />
            Refresh Policy
          </Button>
        </div>

        {/* Simulate Cashback Transaction - Main Feature */}
        <div className="space-y-3 border-2 border-primary/20 rounded-lg p-4 bg-primary/5">
          <div className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-primary" />
            <h4 className="font-medium text-lg">💰 Test Cashback Earning</h4>
          </div>
          <p className="text-sm text-muted-foreground">
            Enter a purchase amount in dollars to simulate earning cashback. Example: Spend $100 at Amazon, get 5.5% back as BONK tokens.
          </p>
          <div className="space-y-3">
            <Select value={selectedOfferId} onValueChange={(value) => {
              setSelectedOfferId(value);
              const selectedOffer = cashbackOffers.find(offer => offer.id === value);
              if (selectedOffer) {
                setTestMerchant(selectedOffer.merchant_name);
                setTestPercentage(selectedOffer.cashback_percentage.toString());
              }
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Select a shop/offer to simulate" />
              </SelectTrigger>
              <SelectContent>
                {cashbackOffers.map((offer) => (
                  <SelectItem key={offer.id} value={offer.id}>
                    {offer.merchant_name} - {offer.cashback_percentage}% ({offer.title})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Input
                placeholder="Purchase Amount ($)"
                value={testAmount}
                onChange={(e) => setTestAmount(e.target.value)}
                type="number"
              />
              <Input
                placeholder="Merchant Name"
                value={testMerchant}
                onChange={(e) => setTestMerchant(e.target.value)}
                disabled
              />
              <Input
                placeholder="Cashback %"
                value={testPercentage}
                onChange={(e) => setTestPercentage(e.target.value)}
                type="number"
                step="0.1"
                disabled
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Button 
              onClick={simulateCashbackTransaction} 
              disabled={!testAmount || !selectedOfferId || isLoading}
              variant="default"
            >
              <ShoppingBag className="h-4 w-4 mr-2" />
              Realistic Flow
            </Button>
            <Button 
              onClick={simulateInstantApproval} 
              disabled={!testAmount || !selectedOfferId || isLoading}
              variant="secondary"
            >
              <Award className="h-4 w-4 mr-2" />
              Instant Mode
            </Button>
          </div>
          <div className="text-sm text-muted-foreground space-y-1">
            <div><strong>Realistic Flow:</strong> Creates pending transaction → Auto-approves after 2s → Shows time-locked cashback</div>
            <div><strong>Instant Mode:</strong> Bypasses return window, immediately credits BONK to your balance</div>
          </div>
        </div>

        {/* Test Withdrawal Eligibility - Secondary Feature */}
        <div className="space-y-3 border border-muted rounded-lg p-4 bg-muted/20">
          <div className="flex items-center gap-2">
            <Award className="h-4 w-4 text-muted-foreground" />
            <h4 className="font-medium">🏦 Test Withdrawal Eligibility</h4>
          </div>
          <p className="text-sm text-muted-foreground">
            Check if you can withdraw a specific amount of BONK tokens you've already earned. Enter BONK amount (not purchase amount).
          </p>
          <div className="flex gap-3">
            <Input
              placeholder="Withdrawal Amount (BONK tokens)"
              value={withdrawAmount}
              onChange={(e) => setWithdrawAmount(e.target.value)}
              type="number"
              className="flex-1"
            />
            <Button onClick={checkPayoutEligibility} disabled={!withdrawAmount || isLoading} variant="outline">
              <Award className="h-4 w-4 mr-2" />
              Check Eligibility
            </Button>
          </div>
          <div className="text-xs text-muted-foreground">
            💡 This tests withdrawal limits, not cashback earning. Use the section above to simulate purchases.
          </div>
        </div>

        {/* Available Cashback List */}
        {availableCashback.length > 0 && (
          <div className="space-y-4">
            <Separator />
            <div>
              <h4 className="font-medium mb-2">Available Cashback Transactions:</h4>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {availableCashback.map((item, index) => (
                  <div key={index} className="flex justify-between items-center p-3 bg-muted rounded-lg text-sm">
                    <div>
                      <div className="font-medium">
                        {item.purchase_amount} USD → {item.available_amount} BONK
                      </div>
                      <div className="text-muted-foreground text-xs">
                        Status: {item.status} | Date: {new Date(item.purchase_date).toLocaleDateString()}
                      </div>
                    </div>
                    <Badge variant="outline">
                      {item.is_returned ? 'Returned' : 'Active'}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};