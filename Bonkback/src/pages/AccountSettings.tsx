import { useState, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/integrations/supabase/client';
import { buildReferralUrl } from '@/lib/domain';
import { useToast } from '@/hooks/use-toast';
import { 
  User, 
  Mail, 
  Wallet, 
  AlertTriangle, 
  Trash2, 
  Save,
  Shield,
  Clock,
  CheckCircle,
  XCircle,
  Copy,
  Share2,
  LogOut
} from 'lucide-react';

interface DeletionRequest {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'cancelled';
  requested_at: string;
  processed_at?: string;
  admin_notes?: string;
}

interface DeletionResponse {
  success: boolean;
  error?: string;
  message?: string;
}

export default function AccountSettings() {
  const { user, profile, updateProfile, signOut, fetchProfile } = useAuthStore();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [deletionRequest, setDeletionRequest] = useState<DeletionRequest | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  
  const [formData, setFormData] = useState({
    full_name: profile?.full_name || '',
    email: profile?.email || '',
    wallet_address: profile?.wallet_address || ''
  });

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  useEffect(() => {
    fetchDeletionRequest();
  }, [user]);

  const fetchDeletionRequest = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('account_deletion_requests' as any)
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        setDeletionRequest(data as unknown as DeletionRequest);
      }
    } catch (error) {
      console.error('Error fetching deletion request:', error);
    }
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: formData.full_name,
          email: formData.email,
          wallet_address: formData.wallet_address || null,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (error) throw error;

      // Refresh profile data
      window.location.reload();
      
      toast({
        title: "Profile Updated",
        description: "Your profile information has been saved successfully.",
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Update Failed",
        description: "Failed to update your profile. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleRequestDeletion = async () => {
    if (!user || deletionRequest || deleteConfirmText !== 'DELETE') return;
    
    setIsLoading(true);
    try {
      // Check if user is authenticated
      if (!user) {
        toast({
          title: "Authentication Required",
          description: "Please log in again to submit your deletion request.",
          variant: "destructive",
        });
        navigate('/auth');
        return;
      }

      // Use the secure RPC function
      const { data, error } = await supabase.rpc('request_account_deletion');

      if (error) {
        throw new Error(error.message);
      }

      const response = data as unknown as DeletionResponse;
      if (!response?.success) {
        throw new Error(response?.error || 'Failed to submit deletion request');
      }

      await fetchDeletionRequest();
      setShowDeleteConfirm(false);
      setDeleteConfirmText('');
      
      toast({
        title: "Deletion Request Submitted",
        description: response.message || "Your account deletion request has been submitted and will be processed by our team.",
      });
    } catch (error: any) {
      console.error('Error submitting deletion request:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to submit deletion request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-400"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case 'processing':
        return <Badge variant="secondary" className="bg-blue-500/20 text-blue-400"><Shield className="w-3 h-3 mr-1" />Processing</Badge>;
      case 'completed':
        return <Badge variant="secondary" className="bg-green-500/20 text-green-400"><CheckCircle className="w-3 h-3 mr-1" />Completed</Badge>;
      case 'cancelled':
        return <Badge variant="secondary" className="bg-red-500/20 text-red-400"><XCircle className="w-3 h-3 mr-1" />Cancelled</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  // Referral link helpers (updated)
  const [referralUrl, setReferralUrl] = useState<string>("");
  
  useEffect(() => {
    const generate = async () => {
      if (profile?.referral_code) {
        try {
          const url = await buildReferralUrl(profile.referral_code);
          setReferralUrl(url);
        } catch {
          setReferralUrl(`${window.location.origin}/r/${encodeURIComponent(profile.referral_code)}`);
        }
      } else {
        setReferralUrl("");
      }
    };
    generate();
  }, [profile?.referral_code]);
  
  const copyReferralLink = async () => {
    try {
      await navigator.clipboard.writeText(referralUrl);
      toast({
        title: "Copied!",
        description: "Referral link copied to clipboard",
      });
    } catch (error) {
      console.error('Failed to copy:', error);
      toast({
        title: "Copy failed",
        description: "Please copy the link manually",
        variant: "destructive",
      });
    }
  };
  
  const shareReferralLink = async () => {
    const message = `Join BonkBack and start earning BONK every time you shop.
Sign up with my link and we’ll both get rewarded!
${referralUrl}`;
    try {
      await navigator.clipboard.writeText(message);
      toast({
        title: "Share text copied!",
        description: "Message copied. Paste it into any app to share.",
      });
    } catch (error) {
      console.error('Error preparing share text:', error);
      toast({
        title: "Copy failed",
        description: "Please copy and share manually.",
        variant: "destructive",
      });
    }
  };
  // Handle logout for mobile
  const handleMobileLogout = async () => {
    await signOut();
  };

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold mb-2">Account Settings</h1>
          <p className="text-muted-foreground">
            Manage your personal information and account preferences
          </p>
        </motion.div>

        {/* Debug info */}
        <div className="mb-4 p-4 bg-muted rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold">Debug Info:</p>
              <p className="text-xs">User ID: {user?.id}</p>
              <p className="text-xs">Profile Role: {profile?.role}</p>
              <p className="text-xs">Profile ID: {profile?.id}</p>
              <p className="text-xs">Can Access Admin: {profile?.role === 'admin' ? 'Yes' : 'No'}</p>
              <p className="text-xs">Admin Link Available: {profile?.role === 'admin' ? 'Should show' : 'Hidden'}</p>
            </div>
            <Button 
              onClick={async () => {
                console.log('Refreshing profile...');
                await fetchProfile();
                toast({
                  title: "Profile Refreshed",
                  description: "Profile data has been reloaded."
                });
              }}
              variant="outline"
              size="sm"
            >
              Refresh Profile
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Settings */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-2 space-y-6"
          >
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <User className="mr-2 h-5 w-5" />
                  Profile Information
                </CardTitle>
                <CardDescription>
                  Update your personal details and contact information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="full_name">Full Name</Label>
                  <Input
                    id="full_name"
                    value={formData.full_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                    placeholder="Enter your full name"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="Enter your email address"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="wallet_address">Wallet Address (Optional)</Label>
                  <Input
                    id="wallet_address"
                    value={formData.wallet_address}
                    onChange={(e) => setFormData(prev => ({ ...prev, wallet_address: e.target.value }))}
                    placeholder="Enter your BONK wallet address"
                  />
                  <p className="text-xs text-muted-foreground">
                    Connect your wallet for automatic BONK transfers
                  </p>
                </div>

                <Button 
                  onClick={handleSaveProfile} 
                  disabled={isSaving}
                  className="w-full"
                >
                  <Save className="mr-2 h-4 w-4" />
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </Button>
              </CardContent>
            </Card>

            {/* Account Deletion Section */}
            <Card className="glass-card border-destructive/20">
              <CardHeader>
                <CardTitle className="flex items-center text-destructive">
                  <Trash2 className="mr-2 h-5 w-5" />
                  Delete Account
                </CardTitle>
                <CardDescription>
                  Permanently delete your account and all associated data (GDPR compliant)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {deletionRequest ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Deletion Request Status:</span>
                      {getStatusBadge(deletionRequest.status)}
                    </div>
                    
                    <div className="text-sm text-muted-foreground">
                      <p><strong>Requested:</strong> {new Date(deletionRequest.requested_at).toLocaleDateString()}</p>
                      {deletionRequest.processed_at && (
                        <p><strong>Processed:</strong> {new Date(deletionRequest.processed_at).toLocaleDateString()}</p>
                      )}
                      {deletionRequest.admin_notes && (
                        <div className="mt-2">
                          <p><strong>Admin Notes:</strong></p>
                          <p className="bg-muted/20 p-2 rounded text-xs">{deletionRequest.admin_notes}</p>
                        </div>
                      )}
                    </div>

                    {deletionRequest.status === 'pending' && (
                      <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                        <p className="text-sm text-yellow-400">
                          Your deletion request is being processed. This typically takes up to 30 days as required by GDPR regulations.
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                      <div className="flex items-start">
                        <AlertTriangle className="h-5 w-5 text-destructive mt-0.5 mr-2 flex-shrink-0" />
                        <div className="text-sm">
                          <p className="font-medium text-destructive mb-2">Warning: This action cannot be undone</p>
                          <ul className="text-muted-foreground space-y-1">
                            <li>• All your personal data will be permanently deleted</li>
                            <li>• Your BONK balance and transaction history will be removed</li>
                            <li>• Referral links and rewards will be forfeited</li>
                            <li>• This process complies with GDPR data protection regulations</li>
                          </ul>
                        </div>
                      </div>
                    </div>

                    {!showDeleteConfirm ? (
                      <Button 
                        variant="destructive" 
                        onClick={() => setShowDeleteConfirm(true)}
                        className="w-full"
                      >
                        Request Account Deletion
                      </Button>
                    ) : (
                      <div className="space-y-3">
                        <p className="text-sm font-medium">Are you absolutely sure? Type "DELETE" to confirm:</p>
                        <Input
                          value={deleteConfirmText}
                          onChange={(e) => setDeleteConfirmText(e.target.value)}
                          placeholder="Type DELETE to confirm"
                          className="text-center font-mono"
                        />
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            onClick={() => {
                              setShowDeleteConfirm(false);
                              setDeleteConfirmText('');
                            }}
                            className="flex-1"
                          >
                            Cancel
                          </Button>
                          <Button 
                            variant="destructive" 
                            onClick={handleRequestDeletion}
                            disabled={isLoading || deleteConfirmText !== 'DELETE'}
                            className="flex-1"
                          >
                            {isLoading ? 'Submitting...' : 'Confirm Deletion'}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Account Summary */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-6"
          >
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-lg">Account Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Account Type</span>
                  <Badge variant="outline">{profile?.role || 'user'}</Badge>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">BONK Balance</span>
                  <span className="font-mono">{profile?.bonk_balance?.toLocaleString() || '0'}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Total Earned</span>
                  <span className="font-mono">{profile?.total_earned?.toLocaleString() || '0'}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Referral Code</span>
                  <span className="font-mono text-primary">{profile?.referral_code || 'N/A'}</span>
                </div>

                {profile?.referral_code && (
                  <>
                    <Separator />
                    <div className="space-y-4">
                      <h3 className="text-sm font-semibold">Share Your Referral Link</h3>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <Input
                          value={referralUrl}
                          readOnly
                          className="flex-1 text-sm sm:text-base min-w-0 font-mono"
                        />
                        <div className="flex gap-2 shrink-0">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={copyReferralLink}
                            className="flex-1 sm:flex-none min-h-[44px] sm:min-h-auto"
                          >
                            <Copy className="h-4 w-4 mr-2 sm:mr-0" />
                            <span className="sm:hidden">Copy</span>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={shareReferralLink}
                            className="flex-1 sm:flex-none min-h-[44px] sm:min-h-auto"
                          >
                            <Share2 className="h-4 w-4 mr-2 sm:mr-0" />
                            <span className="sm:hidden">Share</span>
                          </Button>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                <Separator />
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Member Since</span>
                  <span className="text-sm">
                    {profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : 'N/A'}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <Shield className="mr-2 h-4 w-4" />
                  Privacy & Security
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>Your data is protected under GDPR regulations.</p>
                <p>We use industry-standard encryption to secure your information.</p>
                <p>You have the right to request, modify, or delete your personal data at any time.</p>
                
                {/* Mobile Logout Button */}
                <div className="md:hidden pt-4 border-t border-border/20">
                  <Button 
                    variant="destructive" 
                    onClick={handleMobileLogout}
                    className="w-full"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Log Out
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}