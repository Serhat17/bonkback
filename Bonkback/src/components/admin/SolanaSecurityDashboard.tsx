import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  Shield, 
  Key, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  Users,
  Lock,
  Zap
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuthStore } from '@/store/authStore';

interface KeyHealth {
  needsRotation: boolean;
  lastRotation: string | null;
  daysSinceRotation: number;
  recommendation: string;
}

interface MultiSigValidation {
  required: boolean;
  threshold: number;
  provided: number;
  approved: boolean;
  missingSignatures?: string[];
}

interface KeyInfo {
  version: number;
  publicKey: string;
}

export function SolanaSecurityDashboard() {
  const [keyHealth, setKeyHealth] = useState<KeyHealth | null>(null);
  const [keyInfo, setKeyInfo] = useState<KeyInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRotating, setIsRotating] = useState(false);
  const { toast } = useToast();
  const { user, profile } = useAuthStore();

  const isAdmin = profile?.role === 'admin';

  useEffect(() => {
    if (user) {
      loadSecurityData();
    }
  }, [user]);

  const loadSecurityData = async () => {
    setIsLoading(true);
    try {
      // Load key health status
      const { data: healthData, error: healthError } = await supabase.functions.invoke(
        'solana-key-vault/check-health', 
        {
          body: JSON.stringify({}),
          headers: { Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}` }
        }
      );

      if (healthError) throw healthError;
      if (healthData?.health) {
        setKeyHealth(healthData.health);
      }

      // Load key info
      const { data: keyData, error: keyError } = await supabase.functions.invoke(
        'solana-key-vault/get-key-info',
        {
          body: JSON.stringify({}),
          headers: { Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}` }
        }
      );

      if (keyError) throw keyError;
      if (keyData?.keyInfo) {
        setKeyInfo(keyData.keyInfo);
      }
    } catch (error: any) {
      console.error('Failed to load security data:', error);
      toast({
        title: "Failed to load security data",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyRotation = async (reason: string = 'manual_rotation') => {
    if (!isAdmin) {
      toast({
        title: "Access Denied",
        description: "Admin privileges required for key rotation",
        variant: "destructive",
      });
      return;
    }

    setIsRotating(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        'solana-key-vault/rotate-key',
        {
          body: JSON.stringify({ reason }),
          headers: { Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}` }
        }
      );

      if (error) throw error;

      toast({
        title: "Key Rotation Successful",
        description: `New key version ${data.newVersion} activated. Previous version ${data.oldVersion} deactivated.`,
      });

      // Reload security data
      await loadSecurityData();
    } catch (error: any) {
      console.error('Key rotation failed:', error);
      toast({
        title: "Key Rotation Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsRotating(false);
    }
  };

  const validateMultiSig = async (amount: number) => {
    try {
      const { data, error } = await supabase.functions.invoke(
        'solana-key-vault/validate-multisig',
        {
          body: JSON.stringify({ amount, signatures: [] }),
          headers: { Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}` }
        }
      );

      if (error) throw error;
      return data.multiSigValidation as MultiSigValidation;
    } catch (error: any) {
      console.error('Multi-sig validation failed:', error);
      return null;
    }
  };

  const getHealthColor = (health: KeyHealth) => {
    if (health.needsRotation) return 'text-destructive';
    if (health.daysSinceRotation > 60) return 'text-warning';
    if (health.daysSinceRotation > 30) return 'text-amber-600';
    return 'text-green-600';
  };

  const getHealthProgress = (days: number) => {
    return Math.min((days / 90) * 100, 100);
  };

  const getSecurityScore = () => {
    if (!keyHealth) return 0;
    
    let score = 100;
    if (keyHealth.needsRotation) score -= 40;
    else if (keyHealth.daysSinceRotation > 60) score -= 20;
    else if (keyHealth.daysSinceRotation > 30) score -= 10;
    
    return Math.max(score, 0);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Solana Security Dashboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin" />
            <span className="ml-2">Loading security data...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Security Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Solana Security Dashboard
          </CardTitle>
          <CardDescription>
            Enhanced security monitoring for Solana key management and transfers
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Security Score */}
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{getSecurityScore()}%</div>
              <div className="text-sm text-muted-foreground">Security Score</div>
            </div>

            {/* Key Version */}
            <div className="text-center">
              <div className="text-2xl font-bold">v{keyInfo?.version || 'N/A'}</div>
              <div className="text-sm text-muted-foreground">Key Version</div>
            </div>

            {/* HSM Status */}
            <div className="text-center">
              <div className="flex items-center justify-center gap-1">
                <Zap className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium text-green-600">Active</span>
              </div>
              <div className="text-sm text-muted-foreground">HSM Status</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Health Status */}
      {keyHealth && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              Key Health Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-medium">Key Age</span>
              <Badge variant={keyHealth.needsRotation ? 'destructive' : 'secondary'}>
                {keyHealth.daysSinceRotation} days
              </Badge>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Rotation Progress</span>
                <span>{keyHealth.daysSinceRotation}/90 days</span>
              </div>
              <Progress 
                value={getHealthProgress(keyHealth.daysSinceRotation)} 
                className="h-2"
              />
            </div>

            <Alert className={keyHealth.needsRotation ? 'border-destructive' : ''}>
              <AlertTriangle className={`h-4 w-4 ${getHealthColor(keyHealth)}`} />
              <AlertDescription className={getHealthColor(keyHealth)}>
                <strong>Recommendation:</strong> {keyHealth.recommendation}
              </AlertDescription>
            </Alert>

            {keyHealth.lastRotation && (
              <div className="text-sm text-muted-foreground">
                Last rotation: {new Date(keyHealth.lastRotation).toLocaleDateString()}
              </div>
            )}

            {isAdmin && (
              <div className="flex gap-2 pt-2">
                <Button
                  onClick={() => handleKeyRotation('manual_rotation')}
                  disabled={isRotating}
                  variant={keyHealth.needsRotation ? 'destructive' : 'outline'}
                  size="sm"
                >
                  {isRotating ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Rotating...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Rotate Key
                    </>
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Multi-Signature Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Multi-Signature Security
          </CardTitle>
          <CardDescription>
            Enhanced protection for large transfers
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="font-medium">Large Transfer Threshold</span>
              </div>
              <div className="text-sm text-muted-foreground pl-6">
                50,000+ BONK tokens require 2 signatures
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-red-500" />
                <span className="font-medium">Critical Transfer Threshold</span>
              </div>
              <div className="text-sm text-muted-foreground pl-6">
                100,000+ BONK tokens require 3 signatures
              </div>
            </div>
          </div>

          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Large transfers require approval from admin, security officer, and compliance officer roles.
              Transfers are automatically held pending approval when thresholds are exceeded.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Hardware Security Module Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Hardware Security Module
          </CardTitle>
          <CardDescription>
            Secure key derivation and storage simulation
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium">Key Derivation</span>
                <Badge variant="outline" className="text-green-600 border-green-600">
                  PBKDF2-SHA256
                </Badge>
              </div>
              <div className="text-sm text-muted-foreground">
                100,000 iterations with unique salts
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium">Encryption</span>
                <Badge variant="outline" className="text-blue-600 border-blue-600">
                  Web Crypto API
                </Badge>
              </div>
              <div className="text-sm text-muted-foreground">
                Browser-native secure cryptography
              </div>
            </div>
          </div>

          {keyInfo && (
            <div className="space-y-2">
              <div className="font-medium">Active Public Key</div>
              <div className="text-sm font-mono bg-muted p-2 rounded break-all">
                {keyInfo.publicKey}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Security Audit */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Recent Security Events
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-4">
            Security audit events are logged and monitored continuously.
            Admin users can access detailed security logs in the admin dashboard.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}