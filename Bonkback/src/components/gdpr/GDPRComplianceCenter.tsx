import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Shield, Download, Trash2, Eye, FileText, Clock, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface DataExportRequest {
  id: string;
  request_type: 'full_export' | 'partial_export' | 'specific_data';
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'expired';
  data_categories: string[];
  export_format: 'json' | 'csv' | 'pdf';
  file_path?: string;
  file_size?: number;
  expires_at: string;
  processed_at?: string;
  created_at: string;
}

interface ConsentRecord {
  id: string;
  consent_type: 'cookies' | 'marketing' | 'analytics' | 'data_processing' | 'terms';
  consent_given: boolean;
  consent_version: string;
  created_at: string;
}

const GDPRComplianceCenter = () => {
  const { toast } = useToast();
  const [exportRequests, setExportRequests] = useState<DataExportRequest[]>([]);
  const [consentRecords, setConsentRecords] = useState<ConsentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([
    'profile', 'transactions', 'referrals', 'support'
  ]);
  const [exportFormat, setExportFormat] = useState<'json' | 'csv' | 'pdf'>('json');

  const dataCategories = [
    { id: 'profile', label: 'Profile Information', description: 'Personal details, email, preferences' },
    { id: 'transactions', label: 'Transaction History', description: 'Cashback, payouts, gift card redemptions' },
    { id: 'referrals', label: 'Referral Data', description: 'Referral codes, bonuses, referred users' },
    { id: 'support', label: 'Support Tickets', description: 'Help requests and communications' },
    { id: 'consent', label: 'Consent Records', description: 'Cookie preferences, marketing consent' },
    { id: 'emails', label: 'Email Communications', description: 'Sent notifications and emails' },
  ];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Load export requests
      const { data: exports, error: exportsError } = await supabase
        .from('data_export_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (exportsError) throw exportsError;
      setExportRequests((exports as DataExportRequest[]) || []);

      // Load consent records
      const { data: consents, error: consentsError } = await supabase
        .from('consent_records')
        .select('*')
        .order('created_at', { ascending: false });

      if (consentsError) throw consentsError;
      setConsentRecords((consents as ConsentRecord[]) || []);
    } catch (error: any) {
      console.error('Error loading GDPR data:', error);
      toast({
        title: "Error",
        description: "Failed to load GDPR compliance data",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const requestDataExport = async () => {
    setIsExporting(true);
    try {
      const { data, error } = await supabase.functions.invoke('export-user-data', {
        body: {
          request_type: selectedCategories.length === dataCategories.length ? 'full_export' : 'partial_export',
          data_categories: selectedCategories,
          export_format: exportFormat
        }
      });

      if (error) throw error;

      // Create download link
      const blob = new Blob([exportFormat === 'json' ? JSON.stringify(data, null, 2) : data], {
        type: exportFormat === 'json' ? 'application/json' : 'text/csv'
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bonkback-data-export-${new Date().getTime()}.${exportFormat}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Data Export Started",
        description: "Your data export is being downloaded."
      });

      loadData();
    } catch (error: any) {
      console.error('Error requesting data export:', error);
      toast({
        title: "Error",
        description: "Failed to export your data",
        variant: "destructive"
      });
    } finally {
      setIsExporting(false);
    }
  };

  const requestAccountDeletion = async () => {
    try {
      const { data, error } = await supabase.rpc('request_account_deletion');

      if (error) throw error;

      if ((data as any)?.success) {
        toast({
          title: "Deletion Request Submitted",
          description: "Your account deletion request has been submitted and will be processed within 30 days."
        });
      } else {
        throw new Error((data as any)?.error || 'Failed to submit deletion request');
      }
    } catch (error: any) {
      console.error('Error requesting account deletion:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to submit deletion request",
        variant: "destructive"
      });
    }
  };

  const updateConsent = async (consentType: string, granted: boolean) => {
    try {
      const { error } = await supabase
        .from('consent_records')
        .insert({
          consent_type: consentType,
          consent_given: granted,
          consent_version: '1.0',
          ip_address: null, // Would be filled by backend
          user_agent: navigator.userAgent
        });

      if (error) throw error;

      toast({
        title: "Consent Updated",
        description: `Your ${consentType} consent has been updated.`
      });

      loadData();
    } catch (error: any) {
      console.error('Error updating consent:', error);
      toast({
        title: "Error",
        description: "Failed to update consent",
        variant: "destructive"
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'processing': return <Clock className="h-4 w-4 animate-spin" />;
      case 'completed': return <CheckCircle className="h-4 w-4" />;
      case 'failed': return <Trash2 className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500';
      case 'processing': return 'bg-blue-500';
      case 'completed': return 'bg-green-500';
      case 'failed': return 'bg-red-500';
      case 'expired': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown';
    const kb = bytes / 1024;
    const mb = kb / 1024;
    if (mb > 1) return `${mb.toFixed(2)} MB`;
    return `${kb.toFixed(2)} KB`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Shield className="h-6 w-6" />
          GDPR Compliance Center
        </h2>
        <p className="text-muted-foreground">Manage your data privacy and rights</p>
      </div>

      {/* Your Rights */}
      <Card>
        <CardHeader>
          <CardTitle>Your Data Rights</CardTitle>
          <CardDescription>Under GDPR, you have the following rights regarding your personal data</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-4 border rounded-lg">
              <h4 className="font-semibold flex items-center gap-2">
                <Eye className="h-4 w-4" />
                Right to Access
              </h4>
              <p className="text-sm text-muted-foreground mt-1">
                You can request a copy of all personal data we hold about you.
              </p>
            </div>
            <div className="p-4 border rounded-lg">
              <h4 className="font-semibold flex items-center gap-2">
                <Download className="h-4 w-4" />
                Right to Portability
              </h4>
              <p className="text-sm text-muted-foreground mt-1">
                You can download your data in a machine-readable format.
              </p>
            </div>
            <div className="p-4 border rounded-lg">
              <h4 className="font-semibold flex items-center gap-2">
                <Trash2 className="h-4 w-4" />
                Right to Erasure
              </h4>
              <p className="text-sm text-muted-foreground mt-1">
                You can request deletion of your personal data (right to be forgotten).
              </p>
            </div>
            <div className="p-4 border rounded-lg">
              <h4 className="font-semibold flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Right to Rectification
              </h4>
              <p className="text-sm text-muted-foreground mt-1">
                You can request correction of inaccurate personal data.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Export */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export Your Data
          </CardTitle>
          <CardDescription>Download a copy of your personal data</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-medium mb-3">Select Data Categories</h4>
            <div className="grid md:grid-cols-2 gap-3">
              {dataCategories.map((category) => (
                <div key={category.id} className="flex items-start space-x-2">
                  <Checkbox
                    id={category.id}
                    checked={selectedCategories.includes(category.id)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedCategories(prev => [...prev, category.id]);
                      } else {
                        setSelectedCategories(prev => prev.filter(id => id !== category.id));
                      }
                    }}
                  />
                  <div>
                    <label htmlFor={category.id} className="text-sm font-medium cursor-pointer">
                      {category.label}
                    </label>
                    <p className="text-xs text-muted-foreground">{category.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Export Format</label>
            <Select value={exportFormat} onValueChange={(value: any) => setExportFormat(value)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="json">JSON (Machine Readable)</SelectItem>
                <SelectItem value="csv">CSV (Spreadsheet)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button 
            onClick={requestDataExport} 
            disabled={isExporting || selectedCategories.length === 0}
            className="w-full"
          >
            {isExporting ? 'Preparing Export...' : 'Export My Data'}
          </Button>
        </CardContent>
      </Card>

      {/* Export History */}
      <Card>
        <CardHeader>
          <CardTitle>Export History</CardTitle>
          <CardDescription>Your previous data export requests</CardDescription>
        </CardHeader>
        <CardContent>
          {exportRequests.length === 0 ? (
            <div className="text-center py-6">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No export requests yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {exportRequests.map((request) => (
                <div key={request.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge className={getStatusColor(request.status)}>
                        {getStatusIcon(request.status)}
                        <span className="ml-1">{request.status}</span>
                      </Badge>
                      <span className="font-medium">{request.request_type.replace('_', ' ')}</span>
                      <Badge variant="outline">{request.export_format.toUpperCase()}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Categories: {request.data_categories.join(', ')}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Requested on {new Date(request.created_at).toLocaleString()}
                      {request.file_size && ` • ${formatFileSize(request.file_size)}`}
                    </p>
                  </div>
                  {request.status === 'completed' && (
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-1" />
                      Download
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Consent Management */}
      <Card>
        <CardHeader>
          <CardTitle>Consent Management</CardTitle>
          <CardDescription>Manage your data processing consents</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            { type: 'marketing', label: 'Marketing Communications', description: 'Emails about new features and promotions' },
            { type: 'analytics', label: 'Analytics & Performance', description: 'Help us improve our service' },
            { type: 'cookies', label: 'Optional Cookies', description: 'Non-essential cookies for enhanced experience' },
          ].map((consent) => {
            const latestConsent = consentRecords.find(c => c.consent_type === consent.type);
            return (
              <div key={consent.type} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <h4 className="font-medium">{consent.label}</h4>
                  <p className="text-sm text-muted-foreground">{consent.description}</p>
                  {latestConsent && (
                    <p className="text-xs text-muted-foreground">
                      Last updated: {new Date(latestConsent.created_at).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant={latestConsent?.consent_given ? "default" : "outline"}
                    size="sm"
                    onClick={() => updateConsent(consent.type, true)}
                  >
                    Allow
                  </Button>
                  <Button
                    variant={!latestConsent?.consent_given ? "destructive" : "outline"}
                    size="sm"
                    onClick={() => updateConsent(consent.type, false)}
                  >
                    Deny
                  </Button>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Account Deletion */}
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="text-red-600 flex items-center gap-2">
            <Trash2 className="h-5 w-5" />
            Delete My Account
          </CardTitle>
          <CardDescription>Permanently delete your account and all associated data</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-red-50 p-4 rounded-lg mb-4">
            <h4 className="font-semibold text-red-800 mb-2">Warning: This action cannot be undone</h4>
            <ul className="text-sm text-red-700 space-y-1">
              <li>• All your account data will be permanently deleted</li>
              <li>• You will lose access to all BONK tokens in your account</li>
              <li>• Your referral history and earnings will be removed</li>
              <li>• This process cannot be reversed</li>
            </ul>
          </div>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">
                Request Account Deletion
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Your Account?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete your account and all associated data. 
                  This action cannot be undone. Are you absolutely sure?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={requestAccountDeletion}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Yes, Delete My Account
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default GDPRComplianceCenter;