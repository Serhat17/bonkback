import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/store/authStore';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AlertTriangle, CheckCircle, RefreshCw, Bug, RotateCcw } from 'lucide-react';

export const ReferralDebugPanel = () => {
  const { user, profile, fetchProfile } = useAuthStore();
  const { toast } = useToast();
  const [debugData, setDebugData] = useState<any>(null);
  const [testCode, setTestCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const runDebugCheck = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc('debug_referral_status');
      if (error) throw error;
      setDebugData(data);
    } catch (error) {
      console.error('Debug check failed:', error);
      toast({
        title: "Debug Failed",
        description: "Could not fetch debug data",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fixMyRewards = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc('fix_my_referral_rewards');
      if (error) throw error;
      
      toast({
        title: "Fix Applied",
        description: (data as any)?.message || 'Referral rewards have been fixed',
      });
      
      await fetchProfile();
      await runDebugCheck();
    } catch (error) {
      console.error('Fix failed:', error);
      toast({
        title: "Fix Failed",
        description: "Could not apply fix",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const testReferralClaim = async () => {
    if (!testCode.trim()) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc('test_referral_claim', { 
        p_referral_code: testCode.trim() 
      });
      if (error) throw error;
      
      console.log('Referral claim result:', data);
      const result = data as any;
      toast({
        title: result?.success ? "Test Successful" : "Test Failed",
        description: result?.message || result?.error || 'Test completed',
        variant: result?.success ? "default" : "destructive"
      });
      
      if (result?.success) {
        await fetchProfile();
        await runDebugCheck();
      }
    } catch (error) {
      console.error('Test failed:', error);
      toast({
        title: "Test Failed", 
        description: "Could not test referral claim",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resetTestData = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc('reset_test_referral');
      if (error) throw error;
      
      const result = data as any;
      toast({
        title: result?.success ? "Reset Successful" : "Reset Failed",
        description: result?.message || result?.error || 'Reset completed',
        variant: result?.success ? "default" : "destructive"
      });
      
      if (result?.success) {
        await fetchProfile();
        await runDebugCheck();
      }
    } catch (error) {
      console.error('Reset failed:', error);
      toast({
        title: "Reset Failed",
        description: "Could not reset test data",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) return null;

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bug className="h-5 w-5" />
          Referral System Debug Panel
        </CardTitle>
        <CardDescription>
          Debug and test the referral reward system
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Profile Info */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-sm text-muted-foreground">Your Code</div>
            <Badge variant="outline">{profile?.referral_code || 'None'}</Badge>
          </div>
          <div className="text-center">
            <div className="text-sm text-muted-foreground">BONK Balance</div>
            <div className="font-mono">{profile?.bonk_balance?.toLocaleString() || 0}</div>
          </div>
          <div className="text-center">
            <div className="text-sm text-muted-foreground">Total Earned</div>
            <div className="font-mono">{profile?.total_earned?.toLocaleString() || 0}</div>
          </div>
          <div className="text-center">
            <div className="text-sm text-muted-foreground">Referred By</div>
            <div className="font-mono text-xs">{profile?.referred_by || 'None'}</div>
          </div>
        </div>

        <Separator />

        {/* Debug Actions */}
        <div className="flex flex-wrap gap-3">
          <Button onClick={runDebugCheck} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Run Debug Check
          </Button>
          <Button onClick={fixMyRewards} disabled={isLoading} variant="secondary">
            <AlertTriangle className="h-4 w-4 mr-2" />
            Fix My Rewards
          </Button>
          <Button onClick={resetTestData} disabled={isLoading} variant="outline">
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset Test Data
          </Button>
        </div>

        {/* Test Referral Claim */}
        <div className="space-y-3">
          <div className="flex gap-3">
            <Input
              placeholder="Enter referral code to test (e.g. 0EBCD3EA)"
              value={testCode}
              onChange={(e) => setTestCode(e.target.value)}
              className="flex-1"
            />
            <Button onClick={testReferralClaim} disabled={!testCode.trim() || isLoading}>
              <CheckCircle className="h-4 w-4 mr-2" />
              Test Claim
            </Button>
          </div>
          <div className="text-sm text-muted-foreground">
            <strong>Note:</strong> Use someone else's referral code to test. Your own code will be rejected.
          </div>
        </div>

        {/* Debug Results */}
        {debugData && (
          <div className="space-y-4">
            <Separator />
            <div>
              <h4 className="font-medium mb-2">Debug Results:</h4>
              <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto">
                {JSON.stringify(debugData, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};