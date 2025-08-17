import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Switch } from '@/components/ui/switch';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/integrations/supabase/client';
import { OfferManagementModal } from '@/components/admin/OfferManagementModal';
import { GiftCardManagementModal } from '@/components/admin/GiftCardManagementModal';
import { OffersManagementTable } from '@/components/admin/OffersManagementTable';
import { GiftCardsManagementTable } from '@/components/admin/GiftCardsManagementTable';
import { UsersManagementTable } from '@/components/admin/UsersManagementTable';
import { ReferralsManagementTable } from '@/components/admin/ReferralsManagementTable';
import { SystemSettingsPanel } from '@/components/admin/SystemSettingsPanel';
import { BlogManagementTable } from '@/components/admin/BlogManagementTable';
import { DeletionRequestsTable } from '@/components/admin/DeletionRequestsTable';
import { DeletedUsersLog } from '@/components/admin/DeletedUsersLog';
import { AffiliateNetworksTable } from '@/components/admin/AffiliateNetworksTable';
import { SecurityDashboard } from '@/components/admin/SecurityDashboard';
import { SystemConfigTable } from '@/components/admin/SystemConfigTable';
import { CashbackPolicySettings } from '@/components/admin/CashbackPolicySettings';
import { CategoriesManagement } from '@/components/admin/CategoriesManagement';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useToast } from '@/hooks/use-toast';
import { 
  Users, 
  DollarSign, 
  TrendingUp, 
  Gift,
  Settings,
  Plus,
  Eye,
  Edit,
  Trash2,
  AlertTriangle,
  Shield,
  Play,
  Code
} from 'lucide-react';
import { formatNumber } from '@/lib/utils';

interface AdminStats {
  totalUsers: number;
  totalBonkDistributed: number;
  totalTransactions: number;
  activeOffers: number;
  pendingTransactions: number;
  totalReferrals: number;
  referralRewards: number;
}

export default function AdminDashboard() {
  const { user, profile } = useAuthStore();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    totalBonkDistributed: 0,
    totalTransactions: 0,
    activeOffers: 0,
    pendingTransactions: 0,
    totalReferrals: 0,
    referralRewards: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [showGiftCardModal, setShowGiftCardModal] = useState(false);
  const [demoModeEnabled, setDemoModeEnabled] = useState(true);
  const [isUpdatingDemoMode, setIsUpdatingDemoMode] = useState(false);

  // Redirect if not authenticated or not admin
  if (!user || profile?.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  // FIXED: Optimized admin stats with batched queries and error handling
  const fetchAdminStats = async () => {
    try {
      // Use Promise.allSettled to prevent one failed query from blocking others
      const results = await Promise.allSettled([
        // Optimized: Count-only query for users
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        
        // Optimized: Limited query for transactions with aggregation
        supabase.from('cashback_transactions')
          .select('bonk_amount, status')
          .limit(1000), // Limit for performance
          
        // Optimized: Status filter queries for offers
        supabase.from('cashback_offers').select('status', { count: 'exact' }),
          
        // Optimized: Reward filter queries for referrals  
        supabase.from('referrals').select('reward_claimed', { count: 'exact' })
      ]);

      // Process results with error handling
      const [usersResult, transactionsResult, offersResult, referralsResult] = results;

      // Safe user count extraction
      let totalUsers = 0;
      if (usersResult.status === 'fulfilled') {
        totalUsers = usersResult.value.count || 0;
      }

      // Safe transaction processing
      let totalBonkDistributed = 0;
      let totalTransactions = 0;
      let pendingTransactions = 0;
      if (transactionsResult.status === 'fulfilled' && transactionsResult.value.data) {
        const transactions = transactionsResult.value.data;
        totalBonkDistributed = transactions.reduce((sum, t) => sum + Number(t.bonk_amount || 0), 0);
        totalTransactions = transactions.length;
        pendingTransactions = transactions.filter(t => t.status === 'pending').length;
      }

      // Safe offers processing
      let activeOffers = 0;
      if (offersResult.status === 'fulfilled' && offersResult.value.data) {
        activeOffers = offersResult.value.data.filter(o => o.status === 'active').length;
      }

      // Safe referrals processing
      let totalReferrals = 0;
      let referralRewards = 0;
      if (referralsResult.status === 'fulfilled') {
        totalReferrals = referralsResult.value.count || 0;
        if (referralsResult.value.data) {
          const claimedCount = referralsResult.value.data.filter(r => r.reward_claimed).length;
          referralRewards = claimedCount * 333333;
        }
      }

      setStats({
        totalUsers,
        totalBonkDistributed,
        totalTransactions,
        activeOffers,
        pendingTransactions,
        totalReferrals,
        referralRewards
      });
    } catch (error) {
      console.error('Error fetching admin stats:', error);
      // Set default values on error to prevent UI breaking
      setStats({
        totalUsers: 0,
        totalBonkDistributed: 0,
        totalTransactions: 0,
        activeOffers: 0,
        pendingTransactions: 0,
        totalReferrals: 0,
        referralRewards: 0
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch current demo mode status
  const fetchDemoModeStatus = async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'demo_mode_enabled')
        .single();
      
      if (error) throw error;
      setDemoModeEnabled(data?.value === true);
    } catch (error) {
      console.error('Error fetching demo mode status:', error);
      setDemoModeEnabled(true); // Default to enabled if fetch fails
    }
  };

  // Toggle demo mode
  const toggleDemoMode = async () => {
    setIsUpdatingDemoMode(true);
    try {
      const { error } = await supabase
        .from('system_settings')
        .update({ 
          value: !demoModeEnabled,
          updated_at: new Date().toISOString(),
          updated_by: user.id
        })
        .eq('key', 'demo_mode_enabled');
      
      if (error) throw error;
      
      setDemoModeEnabled(!demoModeEnabled);
      toast({
        title: demoModeEnabled ? "Demo Mode Disabled" : "Demo Mode Enabled",
        description: demoModeEnabled 
          ? "Debug panels and demo features are now hidden for a production-ready experience."
          : "Debug panels and demo features are now visible for testing purposes.",
      });
    } catch (error) {
      console.error('Error toggling demo mode:', error);
      toast({
        title: "Error",
        description: "Failed to update demo mode setting",
        variant: "destructive"
      });
    } finally {
      setIsUpdatingDemoMode(false);
    }
  };

  useEffect(() => {
    fetchAdminStats();
    fetchDemoModeStatus();
  }, []);

  const statCards = [
    {
      title: 'Total Users',
      value: formatNumber(stats.totalUsers),
      actualValue: stats.totalUsers,
      icon: Users,
      color: 'text-blue-500'
    },
    {
      title: 'BONK Distributed',
      value: formatNumber(stats.totalBonkDistributed),
      actualValue: stats.totalBonkDistributed,
      icon: DollarSign,
      color: 'text-primary'
    },
    {
      title: 'Total Transactions',
      value: formatNumber(stats.totalTransactions),
      actualValue: stats.totalTransactions,
      icon: TrendingUp,
      color: 'text-green-500'
    },
    {
      title: 'Active Offers',
      value: formatNumber(stats.activeOffers),
      actualValue: stats.activeOffers,
      icon: Gift,
      color: 'text-purple-500'
    },
    {
      title: 'Pending Reviews',
      value: formatNumber(stats.pendingTransactions),
      actualValue: stats.pendingTransactions,
      icon: Settings,
      color: 'text-orange-500'
    },
    {
      title: 'Total Referrals',
      value: formatNumber(stats.totalReferrals),
      actualValue: stats.totalReferrals,
      icon: Users,
      color: 'text-pink-500'
    },
    {
      title: 'Referral Rewards',
      value: formatNumber(stats.referralRewards),
      actualValue: stats.referralRewards,
      icon: Gift,
      color: 'text-indigo-500'
    }
  ];

  return (
    <TooltipProvider>
      <div className="min-h-screen p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
                <p className="text-muted-foreground">
                  Manage your BonkBack platform and monitor key metrics
                </p>
              </div>
              <div className="flex gap-3 items-center">
                {/* Demo Mode Toggle */}
                <Card className="border-2 border-dashed border-primary/30">
                   <CardContent className="flex items-center gap-2 px-3 py-2">
                     <Code className="h-4 w-4 text-primary flex-shrink-0" />
                     <div className="flex flex-col min-w-0">
                       <span className="text-xs font-medium leading-tight">Demo Mode</span>
                       <span className="text-[10px] text-muted-foreground leading-tight">
                         {demoModeEnabled ? 'Debug features visible' : 'Production ready'}
                       </span>
                     </div>
                    <Switch
                      checked={demoModeEnabled}
                      onCheckedChange={toggleDemoMode}
                      disabled={isUpdatingDemoMode}
                    />
                  </CardContent>
                </Card>
                
                {demoModeEnabled && (
                  <Button 
                    onClick={() => navigate('/demo')}
                    variant="outline"
                    className="border-primary/40 text-primary hover:bg-primary/10"
                  >
                    <Play className="h-4 w-4 mr-2" />
                    🎯 Jury Demo Center
                  </Button>
                )}
              </div>
            </div>
          </motion.div>

          {/* Stats Cards */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-6 mb-8"
          >
            {statCards.map((stat, index) => {
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
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="text-2xl font-bold font-mono text-right min-w-0 tabular-nums cursor-help">
                          {isLoading ? '...' : stat.value}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{isLoading ? 'Loading...' : stat.actualValue.toLocaleString()}</p>
                      </TooltipContent>
                    </Tooltip>
                  </CardContent>
                </Card>
              );
            })}
          </motion.div>

        {/* Admin Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Tabs defaultValue="offers" className="space-y-6">
            <TabsList className="grid w-full grid-cols-12">
              <TabsTrigger value="offers">Offers</TabsTrigger>
              <TabsTrigger value="categories">Categories</TabsTrigger>
              <TabsTrigger value="networks">Networks</TabsTrigger>
              <TabsTrigger value="blog">Blog</TabsTrigger>
              <TabsTrigger value="transactions">Transactions</TabsTrigger>
              <TabsTrigger value="giftcards">Gift Cards</TabsTrigger>
              <TabsTrigger value="users">Users</TabsTrigger>
              <TabsTrigger value="referrals">Referrals</TabsTrigger>
              <TabsTrigger value="security">Security</TabsTrigger>
              <TabsTrigger value="gdpr">GDPR</TabsTrigger>
              <TabsTrigger value="config">Config</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>

            {/* Offers Management */}
            <TabsContent value="offers">
              <OffersManagementTable />
            </TabsContent>

            {/* Categories Management */}
            <TabsContent value="categories">
              <CategoriesManagement />
            </TabsContent>

            {/* Affiliate Networks Management */}
            <TabsContent value="networks">
              <AffiliateNetworksTable />
            </TabsContent>

            {/* Blog Management */}
            <TabsContent value="blog">
              <BlogManagementTable />
            </TabsContent>

            {/* Transactions Management */}
            <TabsContent value="transactions">
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle>Transaction Management</CardTitle>
                  <CardDescription>
                    Review and approve cashback transactions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <TrendingUp className="mx-auto h-16 w-16 text-muted-foreground/50 mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Transaction Review</h3>
                    <p className="text-muted-foreground mb-4">
                      {stats.pendingTransactions} transactions pending review
                    </p>
                    <Button className="btn-primary" onClick={() => window.open('/transactions', '_blank')}>
                      Review Pending
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Gift Cards Management */}
            <TabsContent value="giftcards">
              <GiftCardsManagementTable />
            </TabsContent>

            {/* Users Management */}
            <TabsContent value="users">
              <UsersManagementTable />
            </TabsContent>

            {/* Referrals Management */}
            <TabsContent value="referrals">
              <div className="space-y-6">
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Card className="glass-card">
                    <CardHeader>
                      <CardTitle className="text-lg">Total Referrals</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <p className="text-2xl font-bold text-primary font-mono tabular-nums cursor-help">{formatNumber(stats.totalReferrals)}</p>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{stats.totalReferrals.toLocaleString()}</p>
                        </TooltipContent>
                      </Tooltip>
                      <p className="text-sm text-muted-foreground">Successful referrals</p>
                    </CardContent>
                  </Card>
                  
                  <Card className="glass-card">
                    <CardHeader>
                      <CardTitle className="text-lg">BONK Distributed</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <p className="text-2xl font-bold text-primary font-mono tabular-nums cursor-help">{formatNumber(stats.referralRewards)}</p>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{stats.referralRewards.toLocaleString()}</p>
                        </TooltipContent>
                      </Tooltip>
                      <p className="text-sm text-muted-foreground">Via referral program</p>
                    </CardContent>
                  </Card>
                  
                  <Card className="glass-card">
                    <CardHeader>
                      <CardTitle className="text-lg">Conversion Rate</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold text-green-500 font-mono tabular-nums">
                        {stats.totalUsers > 0 ? ((stats.totalReferrals / stats.totalUsers) * 100).toFixed(1) : 0}%
                      </p>
                      <p className="text-sm text-muted-foreground">Referral to signup</p>
                    </CardContent>
                  </Card>
                </div>
                
                {/* Referrals Table */}
                <ReferralsManagementTable />
              </div>
            </TabsContent>

            {/* Security Dashboard */}
            <TabsContent value="security">
              <SecurityDashboard />
            </TabsContent>

            {/* GDPR Management */}
            <TabsContent value="gdpr">
              <ErrorBoundary 
                fallback={
                  <Card className="glass-card">
                    <CardContent className="p-6">
                      <div className="text-center text-muted-foreground">
                        <AlertTriangle className="mx-auto h-8 w-8 mb-2" />
                        <p>Unable to load GDPR management tools.</p>
                        <p className="text-sm mt-1">Please refresh the page or check your admin permissions.</p>
                      </div>
                    </CardContent>
                  </Card>
                }
              >
                <div className="space-y-6">
                  <DeletionRequestsTable />
                  <DeletedUsersLog />
                </div>
              </ErrorBoundary>
            </TabsContent>

            {/* System Config Management */}
            <TabsContent value="config">
              <SystemConfigTable />
            </TabsContent>

            {/* System Settings */}
            <TabsContent value="settings">
              <div className="space-y-6">
                <CashbackPolicySettings />
                <SystemSettingsPanel />
              </div>
            </TabsContent>
          </Tabs>
        </motion.div>

        <OfferManagementModal 
          open={showOfferModal} 
          onOpenChange={setShowOfferModal}
          onOfferAdded={() => {
            // Refresh stats after adding offer
            fetchAdminStats();
          }}
        />
        
        <GiftCardManagementModal 
          open={showGiftCardModal} 
          onOpenChange={setShowGiftCardModal}
          onGiftCardAdded={() => {
            // Could refresh gift card stats if needed
          }}
        />
        </div>
      </div>
    </TooltipProvider>
  );
}