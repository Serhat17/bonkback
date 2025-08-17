import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ReferralCard } from '@/components/ReferralCard';
import { useAuthStore } from '@/store/authStore';
import { useAppStore } from '@/store/appStore';
import { supabase } from '@/integrations/supabase/client';
import { useDemoMode } from '@/hooks/useDemoMode';
import { 
  Coins, 
  TrendingUp, 
  History, 
  ShoppingBag,
  Calendar,
  ExternalLink,
  Wallet,
  CreditCard
} from 'lucide-react';
import { SimplePayoutModal } from '@/components/SimplePayoutModal';
import { SolanaAddressInput } from '@/components/SolanaAddressInput';
import { ReferralDebugPanel } from '@/components/ReferralDebugPanel';
import { CashbackDebugPanel } from '@/components/CashbackDebugPanel';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';

interface WalletActivity {
  user_id: string;
  happened_at: string;
  type: 'cashback' | 'referral' | 'withdrawal' | 'gift_card' | 'airdrop' | string;
  status: string;
  amount_bonk: number;
  amount_fiat_est: number | null;
  source: string;
  meta: any;
}


export default function Dashboard() {
  const navigate = useNavigate();
  const { user, profile } = useAuthStore();
  const { offers, systemSettings } = useAppStore();
  const { demoModeEnabled } = useDemoMode();
  const [transactions, setTransactions] = useState<WalletActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showPayoutModal, setShowPayoutModal] = useState(false);

  // Live BONK price (USD)
  const { data: bonkPriceUsd, isLoading: loadingPrice } = useQuery({
    queryKey: ["bonk-price-usd"],
    queryFn: async () => {
      const res = await fetch(
        "https://api.coingecko.com/api/v3/simple/price?ids=bonk&vs_currencies=usd"
      );
      const json = await res.json();
      return json?.bonk?.usd as number;
    },
    refetchInterval: 60_000,
  });

  useEffect(() => {
    const fetchTransactions = async () => {
      if (!user) return;
      setIsLoading(true);
      try {
        const { data, error } = await supabase.rpc('get_my_wallet_activity_unified');
        if (error) throw error;
        const list = (data || []) as WalletActivity[];
        const cashbacks = list
          .filter((r) => r.type === 'cashback')
          .sort((a, b) => new Date(b.happened_at).getTime() - new Date(a.happened_at).getTime())
          .slice(0, 10);
        setTransactions(cashbacks);
      } catch (error) {
        console.error('Error fetching recent cashback:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTransactions();
  }, [user]);

  // Redirect if not authenticated - MOVED AFTER ALL HOOKS
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const stats = [
    {
      title: 'BONK Balance',
      value: profile?.bonk_balance?.toLocaleString() || '0',
      suffix: 'BONK',
      icon: Coins,
      color: 'text-primary'
    },
    {
      title: 'Total Earned',
      value: profile?.total_earned?.toLocaleString() || '0',
      suffix: 'BONK',
      icon: TrendingUp,
      color: 'text-green-500'
    },
    {
      title: 'USD Value',
      value: bonkPriceUsd 
        ? `$${((profile?.bonk_balance || 0) * bonkPriceUsd).toFixed(2)}`
        : loadingPrice ? 'Loading...' : '$0.00',
      suffix: '',
      icon: Wallet,
      color: 'text-blue-500'
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
      case 'paid':
        return 'bg-green-500/20 text-green-400';
      case 'pending':
        return 'bg-yellow-500/20 text-yellow-400';
      default:
        return 'bg-gray-500/20 text-gray-400';
    }
  };

  return (
    <div className="min-h-screen p-4 md:p-8 pb-24 md:pb-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">
                Welcome back, {profile?.full_name || 'User'}!
              </h1>
              <p className="text-muted-foreground">
                Track your BONK earnings and manage your cashback rewards
              </p>
            </div>
            {profile?.role === 'admin' && (
              <div className="flex gap-2">
                <Button 
                  onClick={() => navigate('/admin')}
                  variant="outline"
                  className="border-primary/40 text-primary hover:bg-primary/10"
                >
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Admin Dashboard
                </Button>
                {demoModeEnabled && (
                  <Badge variant="secondary" className="px-2 py-1 text-xs">
                    Demo Mode Active
                  </Badge>
                )}
              </div>
            )}
          </div>
        </motion.div>

        {/* Stats Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8"
        >
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Card key={index} className="glass-card">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {stat.title}
                  </CardTitle>
                  <Icon className={`h-5 w-5 ${stat.color}`} />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {stat.value} <span className="text-sm font-normal">{stat.suffix}</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </motion.div>

        {/* Mobile: Stack vertically, Desktop: Side-by-side with 65/35 split */}
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Available Offers - First on mobile, 65% on desktop */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="w-full lg:w-[65%] space-y-6"
          >
            {/* Available Offers */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-lg">Available Offers</CardTitle>
                <CardDescription>
                  {offers.length} active cashback offers
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {offers.slice(0, 6).map((offer) => (
                    <div
                      key={offer.id}
                      className="flex items-center justify-between p-4 border border-border/20 rounded-lg hover:bg-muted/20 transition-all duration-200 hover:scale-[1.02]"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{offer.merchant_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {offer.cashback_percentage}% cashback
                        </p>
                      </div>
                      <Button size="sm" variant="outline" className="ml-2 flex-shrink-0">
                        <ExternalLink className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
                <Button className="w-full mt-6" variant="outline" onClick={() => navigate('/offers')}>
                  View All Offers
                </Button>
              </CardContent>
            </Card>

            {/* Quick Actions - Hidden on mobile to save space */}
            <Card className="glass-card hidden lg:block">
              <CardHeader>
                <CardTitle className="text-lg">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-3">
                <Button className="btn-primary" onClick={() => navigate('/gift-cards')}>
                  <Coins className="mr-2 h-4 w-4" />
                  Gift Cards
                </Button>
                <Button variant="outline" onClick={() => navigate('/transactions')}>
                  <Calendar className="mr-2 h-4 w-4" />
                  Transactions
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setShowPayoutModal(true)}
                  disabled={!profile?.wallet_address}
                  className="col-span-2"
                >
                  <CreditCard className="mr-2 h-4 w-4" />
                  Request Payout
                </Button>
              </CardContent>
            </Card>
            
            {/* Debug Panels for testing - Only show when demo mode is enabled */}
            {profile?.role === 'admin' && demoModeEnabled && (
              <div className="space-y-6">
                <ReferralDebugPanel />
                <CashbackDebugPanel />
              </div>
            )}
          </motion.div>

          {/* Recent Cashback - Second on mobile, 35% on desktop */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="w-full lg:w-[35%] space-y-6"
          >
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <History className="mr-2 h-5 w-5" />
                  Recent Cashback
                </CardTitle>
                <CardDescription>
                  Your latest BONK cashback transactions
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="flex items-center space-x-3 p-4">
                        <Skeleton className="w-10 h-10 rounded-lg" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-3 w-24" />
                        </div>
                        <div className="text-right space-y-2">
                          <Skeleton className="h-4 w-20" />
                          <Skeleton className="h-6 w-16 rounded-full" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : transactions.length > 0 ? (
                  <div className="space-y-4">
                    {transactions.slice(0, 5).map((transaction, idx) => (
                      <motion.div
                        key={`${transaction.type}-${transaction.happened_at}-${idx}`}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center justify-between p-3 border border-border/20 rounded-lg hover:bg-muted/20 transition-all duration-200"
                      >
                        <div className="flex items-center space-x-3 min-w-0 flex-1">
                          <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center flex-shrink-0">
                            <ShoppingBag className="w-4 h-4 text-primary" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-sm truncate">{transaction.source || 'Cashback'}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(transaction.happened_at).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0 ml-2">
                          <p className="font-medium text-primary text-sm">
                            +{(transaction.amount_bonk || 0).toLocaleString()} BONK
                          </p>
                          <Badge className={`${getStatusColor(transaction.status)} text-xs`}>
                            {transaction.status}
                          </Badge>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    icon={ShoppingBag}
                    title="No transactions yet"
                    description="Start shopping with our partners to earn BONK rewards!"
                    action={{
                      label: "Browse Offers",
                      onClick: () => navigate('/offers')
                    }}
                  />
                )}
              </CardContent>
            </Card>
            
            {/* Referral Card */}
            <ReferralCard />
            
            {/* Mobile Quick Actions */}
            <Card className="glass-card lg:hidden">
              <CardHeader>
                <CardTitle className="text-lg">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button className="w-full btn-primary" onClick={() => navigate('/gift-cards')}>
                  <Coins className="mr-2 h-4 w-4" />
                  Convert to Gift Cards
                </Button>
                
                {/* Solana Address Input */}
                <div className="p-4 bg-muted/20 rounded-lg">
                  <h4 className="font-medium text-sm mb-3">Wallet Setup</h4>
                  <SolanaAddressInput className="space-y-2" />
                </div>
                
                <Button className="w-full" variant="outline" onClick={() => navigate('/transactions')}>
                  <Calendar className="mr-2 h-4 w-4" />
                  View All Transactions
                </Button>
                <Button 
                  className="w-full" 
                  variant="outline" 
                  onClick={() => setShowPayoutModal(true)}
                  disabled={!profile?.wallet_address}
                >
                  <CreditCard className="mr-2 h-4 w-4" />
                  Request Payout
                </Button>
                {!profile?.wallet_address && (
                  <p className="text-xs text-muted-foreground text-center">
                    Add your Solana address above to request payouts
                  </p>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        <SimplePayoutModal 
          open={showPayoutModal} 
          onOpenChange={setShowPayoutModal} 
        />
      </div>
    </div>
  );
}