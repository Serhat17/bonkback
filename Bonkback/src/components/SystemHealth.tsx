import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Activity, 
  Database, 
  Wifi, 
  Server, 
  AlertTriangle, 
  CheckCircle, 
  RefreshCw,
  Clock
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface HealthMetric {
  name: string;
  status: 'healthy' | 'warning' | 'error' | 'checking';
  value?: string;
  icon: React.ComponentType<{ className?: string }>;
  lastChecked?: Date;
}

export function SystemHealth() {
  const [metrics, setMetrics] = useState<HealthMetric[]>([
    { name: 'Database Connection', status: 'checking', icon: Database },
    { name: 'API Endpoints', status: 'checking', icon: Server },
    { name: 'Authentication', status: 'checking', icon: Activity },
    { name: 'Network Status', status: 'checking', icon: Wifi }
  ]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [overallHealth, setOverallHealth] = useState(0);

  useEffect(() => {
    checkSystemHealth();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(checkSystemHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  const checkSystemHealth = async () => {
    setIsRefreshing(true);
    const newMetrics = [...metrics];
    
    try {
      // Check database connection
      const { error: dbError } = await supabase
        .from('system_settings')
        .select('count')
        .limit(1);
      
      newMetrics[0] = {
        ...newMetrics[0],
        status: dbError ? 'error' : 'healthy',
        value: dbError ? 'Disconnected' : 'Connected',
        lastChecked: new Date()
      };
      
      // Check API endpoints
      const { error: apiError } = await supabase.auth.getSession();
      newMetrics[1] = {
        ...newMetrics[1],
        status: apiError ? 'error' : 'healthy',
        value: apiError ? 'Unavailable' : 'Operational',
        lastChecked: new Date()
      };
      
      // Check authentication
      const { data: session } = await supabase.auth.getSession();
      newMetrics[2] = {
        ...newMetrics[2],
        status: 'healthy',
        value: session?.session?.user ? 'Authenticated' : 'Guest',
        lastChecked: new Date()
      };
      
      // Check network (simple connectivity test)
      newMetrics[3] = {
        ...newMetrics[3],
        status: navigator.onLine ? 'healthy' : 'error',
        value: navigator.onLine ? 'Connected' : 'Offline',
        lastChecked: new Date()
      };
      
    } catch (error) {
      console.error('Health check failed:', error);
      newMetrics.forEach((metric, index) => {
        newMetrics[index] = {
          ...metric,
          status: 'error',
          value: 'Check Failed',
          lastChecked: new Date()
        };
      });
    }
    
    setMetrics(newMetrics);
    
    // Calculate overall health percentage
    const healthyCount = newMetrics.filter(m => m.status === 'healthy').length;
    const warningCount = newMetrics.filter(m => m.status === 'warning').length;
    const overallPercentage = Math.round(((healthyCount + warningCount * 0.5) / newMetrics.length) * 100);
    setOverallHealth(overallPercentage);
    
    setIsRefreshing(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'checking':
        return <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'healthy':
        return <Badge className="bg-green-500">Healthy</Badge>;
      case 'warning':
        return <Badge className="bg-yellow-500">Warning</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      case 'checking':
        return <Badge variant="outline">Checking</Badge>;
      default:
        return null;
    }
  };

  const getHealthColor = (percentage: number) => {
    if (percentage >= 90) return 'text-green-500';
    if (percentage >= 70) return 'text-yellow-500';
    return 'text-red-500';
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          System Health
        </CardTitle>
        <div className="flex items-center gap-3">
          <div className={`text-2xl font-bold ${getHealthColor(overallHealth)}`}>
            {overallHealth}%
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={checkSystemHealth}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Overall Health</span>
            <span className={getHealthColor(overallHealth)}>{overallHealth}%</span>
          </div>
          <Progress value={overallHealth} className="h-2" />
        </div>
        
        <div className="space-y-3">
          {metrics.map((metric, index) => {
            const IconComponent = metric.icon;
            return (
              <div key={index} className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex items-center gap-3">
                  <IconComponent className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <div className="font-medium">{metric.name}</div>
                    {metric.value && (
                      <div className="text-sm text-muted-foreground">{metric.value}</div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {metric.lastChecked && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {metric.lastChecked.toLocaleTimeString()}
                    </div>
                  )}
                  {getStatusIcon(metric.status)}
                  {getStatusBadge(metric.status)}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}