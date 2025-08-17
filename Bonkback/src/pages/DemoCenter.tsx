import { Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuthStore } from '@/store/authStore';
import { useDemoMode } from '@/hooks/useDemoMode';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { EnhancedCashbackDebugPanel } from '@/components/EnhancedCashbackDebugPanel';
import { EnhancedReferralDebugPanel } from '@/components/EnhancedReferralDebugPanel';
import { Play, Presentation, Users, TrendingUp, Lock, Settings } from 'lucide-react';

export default function DemoCenter() {
  const { user, profile } = useAuthStore();
  const { demoModeEnabled, isLoading } = useDemoMode();

  // Redirect if not authenticated or not admin
  if (!user || profile?.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  // Show loading while checking demo mode status
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Show disabled message when demo mode is off
  if (!demoModeEnabled) {
    return (
      <div className="min-h-screen p-4 md:p-8 bg-gradient-to-br from-background via-background to-primary/5">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <Card className="border-2 border-dashed border-muted-foreground/30">
              <CardContent className="pt-16 pb-16">
                <div className="flex justify-center mb-6">
                  <div className="p-4 rounded-full bg-muted/50">
                    <Lock className="h-12 w-12 text-muted-foreground" />
                  </div>
                </div>
                <h1 className="text-3xl font-bold mb-4 text-muted-foreground">
                  Demo Center Disabled
                </h1>
                <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
                  The demo center has been disabled to provide a production-ready experience. 
                  Enable demo mode in the Admin Dashboard to access debugging and demo features.
                </p>
                <div className="flex gap-4 justify-center">
                  <Button 
                    onClick={() => window.location.href = '/admin'}
                    variant="outline"
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Go to Admin Dashboard
                  </Button>
                  <Button 
                    onClick={() => window.location.href = '/dashboard'}
                  >
                    Return to Dashboard
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8 bg-gradient-to-br from-background via-background to-primary/5">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 text-center"
        >
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-3 rounded-full bg-primary/10">
              <Presentation className="h-8 w-8 text-primary" />
            </div>
            <Badge variant="secondary" className="text-lg px-4 py-2">
              <Play className="h-4 w-4 mr-2" />
              JURY DEMO CENTER
            </Badge>
          </div>
          <h1 className="text-4xl font-bold mb-3 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            BonkBack Platform Demo
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Interactive demonstration of cashback earning and referral systems with real-time testing capabilities
          </p>
        </motion.div>

        {/* Demo Stats Overview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8"
        >
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/20 dark:to-blue-900/10 border-blue-200 dark:border-blue-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-blue-700 dark:text-blue-300">
                Demo Features
              </CardTitle>
              <Play className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">Live Testing</div>
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                Real-time cashback & referral simulations
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-950/20 dark:to-green-900/10 border-green-200 dark:border-green-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-green-700 dark:text-green-300">
                Business Logic
              </CardTitle>
              <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-900 dark:text-green-100">5.5% APY</div>
              <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                Average cashback rate demonstration
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-950/20 dark:to-purple-900/10 border-purple-200 dark:border-purple-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-purple-700 dark:text-purple-300">
                User Growth
              </CardTitle>
              <Users className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-900 dark:text-purple-100">333K BONK</div>
              <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                Referral reward per successful signup
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Demo Instructions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-8"
        >
          <Card className="border-2 border-dashed border-primary/30 bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Presentation className="h-5 w-5" />
                Demo Instructions for Jury
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <h4 className="font-semibold text-primary mb-2">💰 Cashback System Testing</h4>
                  <ul className="space-y-1 text-muted-foreground">
                    <li>• Click "Run Demo" buttons in the One-Click scenarios</li>
                    <li>• Test purchase flows (Amazon, eBay, Target)</li>
                    <li>• See immediate BONK rewards calculation</li>
                    <li>• Observe withdrawal eligibility checks</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-primary mb-2">👥 Referral System Testing</h4>
                  <ul className="space-y-1 text-muted-foreground">
                    <li>• Click "Run Demo" buttons in referral scenarios</li>
                    <li>• Test friend signup simulations</li>
                    <li>• Try manual code testing with: B8D57D3B, 1DB6AB82, 0EBCD3EA</li>
                    <li>• Observe real-time reward calculations</li>
                    <li>• Validate referral tracking systems</li>
                  </ul>
                </div>
              </div>
              <Separator />
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Badge variant="outline" className="text-xs">Note</Badge>
                All demonstrations use real backend systems with test data that doesn't affect production users.
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Enhanced Demo Panels */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Tabs defaultValue="cashback" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2 h-12">
              <TabsTrigger value="cashback" className="text-base">
                💰 Cashback System Demo
              </TabsTrigger>
              <TabsTrigger value="referral" className="text-base">
                👥 Referral System Demo
              </TabsTrigger>
            </TabsList>

            <TabsContent value="cashback" className="space-y-6">
              <EnhancedCashbackDebugPanel />
            </TabsContent>

            <TabsContent value="referral" className="space-y-6">
              <EnhancedReferralDebugPanel />
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </div>
  );
}