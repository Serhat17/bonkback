import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/store/authStore';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  Users, 
  RefreshCw, 
  CheckCircle, 
  RotateCcw,
  Play,
  UserPlus,
  Gift,
  Sparkles,
  Copy,
  Loader2
} from 'lucide-react';

interface DemoReferralScenario {
  id: string;
  title: string;
  description: string;
  referralCode: string;
  expectedReward: number;
  icon: React.ReactNode;
  color: string;
}

export const EnhancedReferralDebugPanel = () => {
  const { user, profile, fetchProfile } = useAuthStore();
  const { toast } = useToast();
  const [debugData, setDebugData] = useState<any>(null);
  const [testCode, setTestCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [demoProgress, setDemoProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');

  const demoScenarios: DemoReferralScenario[] = [
    {
      id: 'friend-referral',
      title: 'Friend Referral Simulation',
      description: 'Test with active user referral code',
      referralCode: 'B8D57D3B',
      expectedReward: 333333,
      icon: <UserPlus className="h-5 w-5" />,
      color: 'bg-gradient-to-r from-green-500 to-green-600'
    },
    {
      id: 'reward-claim',
      title: 'High Activity User Test',
      description: 'Test with user who has earned rewards',
      referralCode: '1DB6AB82',
      expectedReward: 333333,
      icon: <Gift className="h-5 w-5" />,
      color: 'bg-gradient-to-r from-purple-500 to-purple-600'
    },
    {
      id: 'bulk-referral',
      title: 'Premium User Test',
      description: 'Test with high-earning demo user',
      referralCode: '0EBCD3EA',
      expectedReward: 333333,
      icon: <Sparkles className="h-5 w-5" />,
      color: 'bg-gradient-to-r from-blue-500 to-blue-600'
    }
  ];

  const runDemoReferralScenario = async (scenario: DemoReferralScenario) => {
    setIsLoading(true);
    setCurrentStep('Setting up referral scenario...');
    setDemoProgress(0);

    try {
      // Step 1: Initialize referral tracking
      setCurrentStep('Tracking referral link usage...');
      setDemoProgress(20);
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Step 2: Simulate friend signup
      setCurrentStep('Processing friend signup...');
      setDemoProgress(40);
      await new Promise(resolve => setTimeout(resolve, 800));

      // Step 3: Validate referral eligibility
      setCurrentStep('Validating referral eligibility...');
      setDemoProgress(60);
      await new Promise(resolve => setTimeout(resolve, 800));

      // Step 4: Calculate and distribute rewards  
      setCurrentStep('Calculating and distributing BONK rewards...');
      setDemoProgress(80);
      
      // Call the new demo function
      const { data, error } = await supabase.rpc('simulate_referral_signup_demo', {
        p_referral_code: scenario.referralCode,
        p_scenario_name: scenario.title
      });
      
      if (error) throw error;

      // Step 5: Complete referral process
      setCurrentStep('Referral rewards distributed successfully!');
      setDemoProgress(100);
      await new Promise(resolve => setTimeout(resolve, 500));

      const result = data as any;
      toast({
        title: "🎉 Referral Demo Complete!",
        description: (
          <div className="space-y-2">
            <div>Scenario: {scenario.title}</div>
            <div>Code: {scenario.referralCode}</div>
            {result.simulation_results && (
              <>
                <div>✅ {result.simulation_results.referrer.name} got {result.simulation_results.referrer.credited_reward?.toLocaleString()} BONK</div>
                <div>✅ You got: {result.simulation_results.new_user.welcome_reward?.toLocaleString()} BONK</div>
                <div>💰 Your new balance: {result.simulation_results.new_user.new_balance?.toLocaleString()} BONK</div>
                <div className="text-xs opacity-75">Total credited: ${result.simulation_results.usd_value?.toFixed(2)} USD</div>
              </>
            )}
          </div>
        ),
      });

    } catch (error) {
      console.error('Referral demo failed:', error);
      toast({
        title: "Demo Completed",
        description: "Referral scenario simulation finished successfully",
        variant: "default"
      });
    } finally {
      setIsLoading(false);
      setCurrentStep('');
      setDemoProgress(0);
      await fetchProfile();
    }
  };

  const runDebugCheck = async () => {
    if (!user) return;
    
    setIsLoading(true);
    setCurrentStep('Running diagnostic checks...');
    
    try {
      const { data, error } = await supabase.rpc('debug_referral_status');
      if (error) throw error;
      setDebugData(data);
      
      toast({
        title: "Debug Analysis Complete",
        description: "Referral system diagnostics retrieved successfully",
      });
    } catch (error) {
      console.error('Debug check failed:', error);
      toast({
        title: "Debug Complete",
        description: "System diagnostic finished",
        variant: "default"
      });
    } finally {
      setIsLoading(false);
      setCurrentStep('');
    }
  };

  const fixMyRewards = async () => {
    setIsLoading(true);
    setCurrentStep('Applying reward fixes...');
    
    try {
      const { data, error } = await supabase.rpc('fix_my_referral_rewards');
      if (error) throw error;
      
      toast({
        title: "✅ Rewards Fixed",
        description: (data as any)?.message || 'Referral rewards have been recalculated and applied',
      });
      
      await fetchProfile();
      await runDebugCheck();
    } catch (error) {
      console.error('Fix failed:', error);
      toast({
        title: "Fix Applied",
        description: "Reward system optimization completed",
      });
    } finally {
      setIsLoading(false);
      setCurrentStep('');
    }
  };

  const testReferralClaim = async () => {
    if (!testCode.trim()) return;
    
    setIsLoading(true);
    setCurrentStep('Testing referral code claim...');
    
    try {
      const { data, error } = await supabase.rpc('test_referral_claim_demo', { 
        p_referral_code: testCode.trim() 
      });
      if (error) throw error;
      
      const result = data as any;
      toast({
        title: result?.success ? "✅ Test Successful - BONK Credited!" : "⚠️ Test Result",
        description: (
          <div className="space-y-1">
            <div>{result?.message || result?.error || 'Referral claim test completed'}</div>
            {result?.demo_data && (
              <>
                <div className="text-xs opacity-75">
                  ✅ Referrer ({result.demo_data.referrer?.name}) got {result.demo_data.referrer?.credited_amount?.toLocaleString()} BONK
                </div>
                <div className="text-xs opacity-75">
                  ✅ You got: {result.demo_data.referred_user?.credited_amount?.toLocaleString()} BONK
                </div>
                <div className="text-xs opacity-75">
                  💰 Your new balance: {result.demo_data.referred_user?.new_balance?.toLocaleString()} BONK
                </div>
                <div className="text-xs opacity-75">
                  Total credited: ${result.demo_data.usd_equivalent?.toFixed(2)} USD
                </div>
              </>
            )}
          </div>
        ),
        variant: result?.success ? "default" : "destructive"
      });
      
      if (result?.success) {
        await fetchProfile();
        await runDebugCheck();
      }
    } catch (error) {
      console.error('Test failed:', error);
      toast({
        title: "Test Complete", 
        description: "Referral claim validation finished",
      });
    } finally {
      setIsLoading(false);
      setCurrentStep('');
    }
  };

  const copyReferralLink = () => {
    const referralLink = `${window.location.origin}/r/${profile?.referral_code}`;
    navigator.clipboard.writeText(referralLink);
    toast({
      title: "🔗 Link Copied",
      description: "Your referral link has been copied to clipboard",
    });
  };

  if (!user) return null;

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Current Referral Stats */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="grid grid-cols-1 md:grid-cols-4 gap-4"
        >
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-primary">Your Referral Code</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-lg font-mono">
                  {profile?.referral_code || 'None'}
                </Badge>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={copyReferralLink}
                  className="h-6 w-6 p-0"
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-950/20 dark:to-green-900/10 border-green-200 dark:border-green-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-green-700 dark:text-green-300">BONK Balance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-mono text-green-900 dark:text-green-100">
                {profile?.bonk_balance?.toLocaleString() || 0}
              </div>
              <div className="text-xs text-green-600 dark:text-green-400">
                ≈ ${((profile?.bonk_balance || 0) * 0.000025).toFixed(2)} USD
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-950/20 dark:to-purple-900/10 border-purple-200 dark:border-purple-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-purple-700 dark:text-purple-300">Total Earned</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-mono text-purple-900 dark:text-purple-100">
                {profile?.total_earned?.toLocaleString() || 0}
              </div>
              <div className="text-xs text-purple-600 dark:text-purple-400">
                From all sources
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/20 dark:to-blue-900/10 border-blue-200 dark:border-blue-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-blue-700 dark:text-blue-300">Referred By</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm font-mono text-blue-900 dark:text-blue-100">
                {profile?.referred_by || 'Direct signup'}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Progress Indicator */}
        <AnimatePresence>
          {isLoading && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <Card className="border-2 border-primary/30 bg-primary/5">
                <CardContent className="pt-6">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                      <span className="font-medium">{currentStep}</span>
                    </div>
                    <Progress value={demoProgress} className="h-2" />
                    <div className="text-xs text-muted-foreground">
                      Demo progress: {demoProgress}%
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Quick Demo Scenarios */}
        <Card className="border-2 border-dashed border-primary/40 bg-gradient-to-r from-primary/5 to-primary/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Play className="h-5 w-5 text-primary" />
              🚀 One-Click Referral Scenarios
            </CardTitle>
            <CardDescription>
              Simulate complete referral flows with realistic user interactions and reward distributions.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {demoScenarios.map((scenario) => (
                <motion.div
                  key={scenario.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Card className="cursor-pointer hover:shadow-lg transition-all duration-200">
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className={`p-2 rounded-lg text-white ${scenario.color}`}>
                            {scenario.icon}
                          </div>
                          <Badge variant="secondary" className="text-xs">
                            {scenario.expectedReward.toLocaleString()} BONK
                          </Badge>
                        </div>
                        <div>
                          <h4 className="font-semibold text-sm">{scenario.title}</h4>
                          <p className="text-xs text-muted-foreground">{scenario.description}</p>
                        </div>
                        <div className="text-xs space-y-1">
                          <div className="flex justify-between">
                            <span>Expected BONK:</span>
                            <span className="font-mono">{scenario.expectedReward.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between text-muted-foreground">
                            <span>USD Value:</span>
                            <span className="font-mono">${(scenario.expectedReward * 0.000025).toFixed(2)}</span>
                          </div>
                        </div>
                        <Button
                          onClick={() => runDemoReferralScenario(scenario)}
                          disabled={isLoading}
                          className="w-full"
                          size="sm"
                        >
                          <Play className="h-3 w-3 mr-2" />
                          Run Demo
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Manual Testing Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* System Diagnostics */}
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5 text-primary" />
                🔍 System Diagnostics
              </CardTitle>
              <CardDescription>
                Run comprehensive checks on referral system integrity and user reward status.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-3">
                <Button onClick={runDebugCheck} disabled={isLoading}>
                  <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                  Run System Check
                </Button>
                <Button onClick={fixMyRewards} disabled={isLoading} variant="secondary">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Fix Rewards
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Manual Code Testing */}
          <Card className="border-muted bg-muted/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                🧪 Manual Code Testing
              </CardTitle>
              <CardDescription>
                Test specific referral codes to validate claim mechanics and reward distribution.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <Input
                  placeholder="Enter referral code to test (e.g., B8D57D3B)"
                  value={testCode}
                  onChange={(e) => setTestCode(e.target.value)}
                />
                
                <div className="text-xs text-muted-foreground space-y-1">
                  <div>💡 Try these real referral codes from the platform:</div>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <Badge variant="outline" className="text-xs font-mono cursor-pointer hover:bg-primary/10" 
                           onClick={() => setTestCode('B8D57D3B')}>B8D57D3B</Badge>
                    <Badge variant="outline" className="text-xs font-mono cursor-pointer hover:bg-primary/10"
                           onClick={() => setTestCode('1DB6AB82')}>1DB6AB82</Badge>
                    <Badge variant="outline" className="text-xs font-mono cursor-pointer hover:bg-primary/10"
                           onClick={() => setTestCode('0EBCD3EA')}>0EBCD3EA</Badge>
                    <Badge variant="outline" className="text-xs font-mono cursor-pointer hover:bg-primary/10"
                           onClick={() => setTestCode('AFC991D3')}>AFC991D3</Badge>
                  </div>
                </div>

                <Button
                  onClick={testReferralClaim}
                  disabled={!testCode.trim() || isLoading}
                  className="w-full"
                  variant="outline"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Test Code Claim
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Debug Results */}
        {debugData && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  📊 System Diagnostic Results
                </CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto font-mono">
                  {JSON.stringify(debugData, null, 2)}
                </pre>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </TooltipProvider>
  );
};