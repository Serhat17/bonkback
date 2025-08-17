import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { securityTracker } from '@/lib/security-tracker';
import { useToast } from '@/hooks/use-toast';
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Clock,
  Search,
  RefreshCw,
  Download,
  Filter
} from 'lucide-react';
import { motion } from 'framer-motion';

interface SecurityEvent {
  id: string;
  user_id?: string;
  event_type: string;
  ip_address?: string;
  user_agent?: string;
  success: boolean;
  error_message?: string;
  metadata?: any;
  created_at: string;
}

interface SecurityScanResult {
  passed: boolean;
  issues: Array<{
    type: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    fix_suggestion: string;
    details?: {
      recent_failures?: number;
      total_failures?: number;
      total_failures_24h?: number;
      unique_ips?: number;
      max_per_ip?: number;
      high_volume_ips?: Array<[string, number] | {ip: string, count: number}>;
      top_attacking_ips?: Array<{ip: string, count: number}>;
      session_count?: number;
      users_affected?: number;
      [key: string]: any;
    };
  }>;
  score: number;
  timestamp: string;
}

export function SecurityDashboard() {
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [scanResult, setScanResult] = useState<SecurityScanResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [filters, setFilters] = useState({
    eventType: '',
    severity: '',
    startDate: new Date(Date.now() - 86400000).toISOString(), // Default to 24 hours ago
    endDate: '',
    searchTerm: ''
  });
  const { toast } = useToast();

  useEffect(() => {
    loadSecurityEvents();
    runSecurityScan();
  }, []);

  const loadSecurityEvents = async () => {
    try {
      setIsLoading(true);
      
      const eventData = await securityTracker.getSecurityEvents({
        limit: 100,
        ...filters
      });
      setEvents(eventData);
    } catch (error) {
      console.error('Failed to load security events:', error);
      toast({
        title: 'Error',
        description: 'Failed to load security events',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const runSecurityScan = async () => {
    try {
      setIsScanning(true);
      const result = await securityTracker.runSecurityScan();
      setScanResult(result);
      
      if (!result.passed) {
        toast({
          title: 'Security Issues Detected',
          description: `Security scan completed with score ${result.score}/100`,
          variant: 'destructive'
        });
      } else {
        toast({
          title: 'Security Scan Complete',
          description: `All security checks passed. Score: ${result.score}/100`,
          variant: 'default'
        });
      }
    } catch (error) {
      console.error('Security scan failed:', error);
      toast({
        title: 'Scan Failed',
        description: 'Security scan could not be completed',
        variant: 'destructive'
      });
    } finally {
      setIsScanning(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500 hover:bg-red-600';
      case 'high': return 'bg-orange-500 hover:bg-orange-600';
      case 'medium': return 'bg-yellow-500 hover:bg-yellow-600';
      case 'low': return 'bg-blue-500 hover:bg-blue-600';
      default: return 'bg-gray-500 hover:bg-gray-600';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-500';
    if (score >= 70) return 'text-yellow-500';
    if (score >= 50) return 'text-orange-500';
    return 'text-red-500';
  };

  const exportSecurityReport = () => {
    const reportData = {
      timestamp: new Date().toISOString(),
      scan_result: scanResult,
      recent_events: events.slice(0, 50),
      summary: {
        total_events: events.length,
        critical_issues: scanResult?.issues.filter(i => i.severity === 'critical').length || 0,
        high_issues: scanResult?.issues.filter(i => i.severity === 'high').length || 0,
        security_score: scanResult?.score || 0
      }
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `security-report-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const filteredEvents = events.filter(event => {
    const matchesSearch = !filters.searchTerm || 
      event.event_type.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
      event.user_id?.includes(filters.searchTerm) ||
      event.ip_address?.includes(filters.searchTerm);
    
    const matchesType = !filters.eventType || event.event_type === filters.eventType;
    const matchesSeverity = !filters.severity || event.metadata?.severity === filters.severity;
    
    return matchesSearch && matchesType && matchesSeverity;
  });

  return (
    <div className="space-y-6">
      {/* Security Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Security Score</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getScoreColor(scanResult?.score || 0)}`}>
              {scanResult?.score || 0}/100
            </div>
            <p className="text-xs text-muted-foreground">
              Last scan: {scanResult?.timestamp ? new Date(scanResult.timestamp).toLocaleString() : 'Never'}
            </p>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical Issues</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">
              {scanResult?.issues.filter(i => i.severity === 'critical').length || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Require immediate attention
            </p>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Security Events</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {events.length}
            </div>
            <p className="text-xs text-muted-foreground">
              Last 24 hours
            </p>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed Logins</CardTitle>
            <XCircle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">
              {events.filter(e => e.event_type === 'sign_in_attempt' && !e.success).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Potential threats
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-4">
        <Button 
          onClick={runSecurityScan} 
          disabled={isScanning}
          className="btn-primary"
        >
          {isScanning ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Scanning...
            </>
          ) : (
            <>
              <Shield className="mr-2 h-4 w-4" />
              Run Security Scan
            </>
          )}
        </Button>
        
        <Button onClick={exportSecurityReport} variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Export Report
        </Button>
        
        <Button onClick={loadSecurityEvents} variant="outline">
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh Events
        </Button>
      </div>

      <Tabs defaultValue="events" className="space-y-4">
        <TabsList>
          <TabsTrigger value="events">Security Events</TabsTrigger>
          <TabsTrigger value="issues">Security Issues</TabsTrigger>
          <TabsTrigger value="monitoring">Real-time Monitoring</TabsTrigger>
        </TabsList>

        <TabsContent value="events" className="space-y-4">
          {/* Filters */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Filter Events</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search events..."
                    value={filters.searchTerm}
                    onChange={(e) => setFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
                    className="pl-8"
                  />
                </div>
                
                <Select value={filters.eventType} onValueChange={(value) => setFilters(prev => ({ ...prev, eventType: value === "all" ? "" : value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Event Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="sign_in_attempt">Login Attempts</SelectItem>
                    <SelectItem value="sign_out">Logouts</SelectItem>
                    <SelectItem value="data_access">Data Access</SelectItem>
                    <SelectItem value="privilege_change">Role Changes</SelectItem>
                    <SelectItem value="suspicious_activity">Suspicious Activity</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={filters.severity} onValueChange={(value) => setFilters(prev => ({ ...prev, severity: value === "all" ? "" : value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Severity" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Severities</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>

                <Button onClick={loadSecurityEvents} className="btn-primary">
                  <Filter className="mr-2 h-4 w-4" />
                  Apply Filters
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Events Table */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Recent Security Events</CardTitle>
              <CardDescription>
                Showing {filteredEvents.length} of {events.length} events
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8">Loading events...</div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Timestamp</TableHead>
                        <TableHead>Event Type</TableHead>
                        <TableHead>User ID</TableHead>
                        <TableHead>IP Address</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Severity</TableHead>
                        <TableHead>Details</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredEvents.map((event) => (
                        <TableRow key={event.id}>
                          <TableCell className="font-mono text-xs">
                            {new Date(event.created_at).toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{event.event_type}</Badge>
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {event.user_id || 'N/A'}
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {event.ip_address || 'N/A'}
                          </TableCell>
                          <TableCell>
                            {event.success ? (
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            ) : (
                              <XCircle className="h-4 w-4 text-red-500" />
                            )}
                          </TableCell>
                          <TableCell>
                            {event.metadata?.severity && (
                              <Badge className={getSeverityColor(event.metadata.severity)}>
                                {event.metadata.severity}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="max-w-xs truncate">
                            {event.error_message || event.metadata?.description || 'No details'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="issues" className="space-y-4">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Security Issues</CardTitle>
              <CardDescription>
                Issues detected during the last security scan
              </CardDescription>
            </CardHeader>
            <CardContent>
              {scanResult?.issues.length ? (
                <div className="space-y-4">
                  {scanResult.issues.map((issue, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="border rounded-lg p-4 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold">{issue.type.replace(/_/g, ' ').toUpperCase()}</h4>
                        <Badge className={getSeverityColor(issue.severity)}>
                          {issue.severity}
                        </Badge>
                      </div>
                      
                      <p className="text-sm text-muted-foreground">{issue.description}</p>
                      
                      {/* Detailed Information */}
                      {issue.details && (
                        <div className="bg-muted/50 p-3 rounded-lg space-y-2">
                          <h5 className="font-semibold text-sm">Detailed Information:</h5>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                            {issue.details.recent_failures && (
                              <div className="flex justify-between">
                                <span>Recent failures (1h):</span>
                                <span className="font-mono text-red-600">{issue.details.recent_failures}</span>
                              </div>
                            )}
                            {issue.details.total_failures_24h && (
                              <div className="flex justify-between">
                                <span>Total failures (24h):</span>
                                <span className="font-mono text-orange-600">{issue.details.total_failures_24h}</span>
                              </div>
                            )}
                            {issue.details.total_failures && (
                              <div className="flex justify-between">
                                <span>Total failures:</span>
                                <span className="font-mono text-orange-600">{issue.details.total_failures}</span>
                              </div>
                            )}
                            {issue.details.unique_ips && (
                              <div className="flex justify-between">
                                <span>Unique IPs:</span>
                                <span className="font-mono text-blue-600">{issue.details.unique_ips}</span>
                              </div>
                            )}
                            {issue.details.max_per_ip && (
                              <div className="flex justify-between">
                                <span>Max attempts per IP:</span>
                                <span className="font-mono text-red-600">{issue.details.max_per_ip}</span>
                              </div>
                            )}
                          </div>
                          
                          {/* High Volume IPs */}
                          {issue.details.high_volume_ips && issue.details.high_volume_ips.length > 0 && (
                            <div className="mt-3">
                              <h6 className="font-semibold text-sm mb-2 text-red-600">Attacking IP Addresses:</h6>
                              <div className="space-y-1">
                                {issue.details.high_volume_ips.map((ipData: any, ipIndex: number) => (
                                <div key={ipIndex} className="flex justify-between items-center bg-destructive/10 border border-destructive/20 px-2 py-1 rounded">
                                    <span className="font-mono text-sm text-foreground">{Array.isArray(ipData) ? ipData[0] : ipData.ip}</span>
                                    <Badge variant="destructive" className="text-xs">
                                      {Array.isArray(ipData) ? ipData[1] : ipData.count} attempts
                                    </Badge>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {/* Additional metadata */}
                          {issue.details.session_count && (
                            <div className="flex justify-between text-sm">
                              <span>Active sessions:</span>
                              <span className="font-mono text-yellow-600">{issue.details.session_count}</span>
                            </div>
                          )}
                          
                          {issue.details.users_affected && (
                            <div className="flex justify-between text-sm">
                              <span>Users affected:</span>
                              <span className="font-mono text-orange-600">{issue.details.users_affected}</span>
                            </div>
                          )}
                        </div>
                      )}
                      
                      <div className="bg-muted/50 p-3 rounded text-sm border-l-4 border-primary">
                        <strong className="text-foreground">Recommended Fix:</strong> <span className="text-muted-foreground">{issue.fix_suggestion}</span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <CheckCircle className="mx-auto h-16 w-16 text-green-500 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Security Issues</h3>
                  <p className="text-muted-foreground">
                    All security checks passed successfully
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="monitoring" className="space-y-4">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Real-time Security Monitoring</CardTitle>
              <CardDescription>
                Automated security monitoring and alerting
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-semibold">Monitoring Status</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span>Failed Login Detection</span>
                      <Badge className="bg-green-500 hover:bg-green-600">Active</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Suspicious Activity Monitoring</span>
                      <Badge className="bg-green-500 hover:bg-green-600">Active</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Privilege Escalation Alerts</span>
                      <Badge className="bg-green-500 hover:bg-green-600">Active</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Data Access Monitoring</span>
                      <Badge className="bg-green-500 hover:bg-green-600">Active</Badge>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-semibold">Alert Thresholds</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Failed logins per IP/hour:</span>
                      <span className="font-mono">10</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Sessions per user:</span>
                      <span className="font-mono">5</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Large queries per hour:</span>
                      <span className="font-mono">10</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Admin role changes per day:</span>
                      <span className="font-mono">1</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold">Automatic Security Scans</h4>
                    <p className="text-sm text-muted-foreground">
                      Runs every hour to detect security issues
                    </p>
                  </div>
                  <Badge className="bg-green-500 hover:bg-green-600">
                    <Clock className="mr-1 h-3 w-3" />
                    Enabled
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}