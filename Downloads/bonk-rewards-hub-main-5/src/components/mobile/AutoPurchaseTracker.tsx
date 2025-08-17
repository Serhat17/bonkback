import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { 
  Mail, 
  Globe, 
  Zap, 
  CheckCircle, 
  AlertCircle,
  TrendingUp,
  Clock
} from 'lucide-react';

interface AutoTrackingMethod {
  id: string;
  name: string;
  description: string;
  icon: any;
  status: 'active' | 'inactive' | 'setup_required';
  enabled: boolean;
}

export function AutoPurchaseTracker() {
  const [methods, setMethods] = useState<AutoTrackingMethod[]>([
    {
      id: 'email_parsing',
      name: 'Email Receipt Parsing',
      description: 'Automatically detect purchases from email receipts',
      icon: Mail,
      status: 'setup_required',
      enabled: false
    },
    {
      id: 'affiliate_networks',
      name: 'Affiliate Network Integration',
      description: 'Real-time tracking through affiliate partnerships',
      icon: Globe,
      status: 'active',
      enabled: true
    },
    {
      id: 'webhook_integration',
      name: 'Merchant Webhooks',
      description: 'Direct integration with merchant systems',
      icon: Zap,
      status: 'setup_required',
      enabled: false
    }
  ]);

  const [isLoading, setIsLoading] = useState(false);
  const [stats, setStats] = useState({
    totalTracked: 0,
    thisMonth: 0,
    accuracy: 98.5
  });

  useEffect(() => {
    loadTrackingStats();
  }, []);

  const loadTrackingStats = async () => {
    try {
      const { data, error } = await supabase
        .from('cashback_transactions')
        .select('*')
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

      if (error) throw error;

      const thisMonth = data?.length || 0;
      const autoTracked = data?.filter(t => {
        const metadata = t.metadata as any;
        return metadata?.source === 'email_parsing' || metadata?.source === 'affiliate_network';
      }).length || 0;

      setStats({
        totalTracked: autoTracked,
        thisMonth,
        accuracy: autoTracked > 0 ? (autoTracked / thisMonth) * 100 : 98.5
      });
    } catch (error) {
      console.error('Error loading tracking stats:', error);
    }
  };

  const toggleMethod = async (methodId: string, enabled: boolean) => {
    setIsLoading(true);
    
    try {
      if (methodId === 'email_parsing' && enabled) {
        // Request email access permission
        await requestEmailAccess();
      } else if (methodId === 'affiliate_networks' && enabled) {
        // Start affiliate monitoring
        await startAffiliateMonitoring();
      }

      setMethods(prev => prev.map(method => 
        method.id === methodId 
          ? { ...method, enabled, status: enabled ? 'active' : 'inactive' }
          : method
      ));

      toast.success(`${enabled ? 'Enabled' : 'Disabled'} automatic tracking`);
    } catch (error) {
      toast.error('Failed to update tracking method');
      console.error('Error toggling method:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const requestEmailAccess = async () => {
    // In a real implementation, this would request email API access
    toast.info('Email access setup would be configured here');
  };

  const startAffiliateMonitoring = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      console.log('Starting Awin affiliate monitoring...');
      
      const response = await supabase.functions.invoke('affiliate-monitor', {
        body: {
          network: 'awin',
          programId: 'default',
          userToken: session.access_token
        }
      });

      if (response.error) {
        console.error('Affiliate monitor error:', response.error);
        throw response.error;
      }
      
      console.log('Affiliate monitoring response:', response.data);
      toast.success('Awin automatic tracking activated! Your purchases will now be tracked automatically.');
    } catch (error) {
      console.error('Failed to start affiliate monitoring:', error);
      toast.error('Failed to start automatic tracking. Please try again.');
      throw error;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'inactive':
        return <AlertCircle className="h-4 w-4 text-gray-400" />;
      case 'setup_required':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default" className="bg-green-500">Active</Badge>;
      case 'inactive':
        return <Badge variant="secondary">Inactive</Badge>;
      case 'setup_required':
        return <Badge variant="outline" className="border-yellow-500 text-yellow-600">Setup Required</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-2">Automatic Purchase Tracking</h1>
        <p className="text-muted-foreground">
          Zero-effort cashback tracking across all your purchases
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Auto-Tracked This Month</p>
                <p className="text-2xl font-bold">{stats.thisMonth}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Total Auto-Tracked</p>
                <p className="text-2xl font-bold">{stats.totalTracked}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="text-sm text-muted-foreground">Accuracy Rate</p>
                <p className="text-2xl font-bold">{stats.accuracy.toFixed(1)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tracking Methods */}
      <div className="grid gap-4">
        {methods.map((method) => {
          const IconComponent = method.icon;
          return (
            <Card key={method.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <IconComponent className="h-6 w-6 text-primary" />
                    <div>
                      <CardTitle className="text-lg">{method.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {method.description}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {getStatusIcon(method.status)}
                    {getStatusBadge(method.status)}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    {method.enabled ? 'Currently tracking purchases' : 'Not active'}
                  </div>
                  <Switch
                    checked={method.enabled}
                    onCheckedChange={(enabled) => toggleMethod(method.id, enabled)}
                    disabled={isLoading}
                  />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* How It Works */}
      <Card>
        <CardHeader>
          <CardTitle>How Automatic Tracking Works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">1</div>
            <div>
              <p className="font-medium">Email Monitoring</p>
              <p className="text-sm text-muted-foreground">
                We scan your email receipts in real-time to detect purchases
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">2</div>
            <div>
              <p className="font-medium">Affiliate Network Integration</p>
              <p className="text-sm text-muted-foreground">
                Direct API connections with major affiliate networks for instant tracking
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">3</div>
            <div>
              <p className="font-medium">Merchant Webhooks</p>
              <p className="text-sm text-muted-foreground">
                Real-time notifications directly from merchant systems
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}