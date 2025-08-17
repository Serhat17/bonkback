import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  Trash2, 
  Search, 
  Eye, 
  AlertTriangle, 
  Clock, 
  CheckCircle, 
  XCircle,
  Shield,
  FileText
} from 'lucide-react';

interface DeletionRequest {
  id: string;
  user_id: string;
  status: 'pending' | 'processing' | 'completed' | 'cancelled';
  requested_at: string;
  processed_at?: string;
  admin_notes?: string;
  created_at: string;
  updated_at: string;
  // User data fetched separately
  user_email?: string;
  user_name?: string;
}

export function DeletionRequestsTable() {
  const { toast } = useToast();
  const [requests, setRequests] = useState<DeletionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<DeletionRequest | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [newStatus, setNewStatus] = useState<string>('');

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      // First fetch deletion requests
      const { data: requestsData, error: requestsError } = await supabase
        .from('account_deletion_requests')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (requestsError) {
        console.error('Supabase error:', requestsError);
        throw requestsError;
      }
      
      if (!requestsData || requestsData.length === 0) {
        setRequests([]);
        return;
      }
      
      // Fetch user profiles for each request
      const userIds = requestsData.map(req => req.user_id);
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, email, full_name')
        .in('user_id', userIds);
      
      if (profilesError) {
        console.warn('Could not fetch profiles:', profilesError);
      }
      
      // Merge the data
      const enrichedRequests = requestsData.map(request => ({
        ...request,
        user_email: profilesData?.find(p => p.user_id === request.user_id)?.email || 'Unknown',
        user_name: profilesData?.find(p => p.user_id === request.user_id)?.full_name || 'Unknown'
      })) as DeletionRequest[];
      
      setRequests(enrichedRequests);
    } catch (error: any) {
      console.error('Error fetching deletion requests:', error);
      toast({
        title: "Error",
        description: error?.message || "Failed to fetch deletion requests. Please check if you have admin permissions.",
        variant: "destructive"
      });
      // Set empty array on error to prevent infinite loading
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateRequest = async () => {
    if (!selectedRequest || !newStatus) return;
    
    setIsProcessing(true);
    try {
      const updateData: any = {
        status: newStatus,
        admin_notes: adminNotes,
        updated_at: new Date().toISOString()
      };

      if (newStatus !== 'pending' && !selectedRequest.processed_at) {
        updateData.processed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('account_deletion_requests')
        .update(updateData)
        .eq('id', selectedRequest.id);

      if (error) throw error;

      // If status is completed, call the deletion function
      if (newStatus === 'completed') {
        const { data: result, error: deleteError } = await supabase.rpc(
          'delete_user_account', 
          { target_user_id: selectedRequest.user_id }
        );

        if (deleteError) {
          console.error('Error deleting user account:', deleteError);
          toast({
            title: "Partial Success",
            description: "Request updated but account deletion failed. Please try manual deletion.",
            variant: "destructive"
          });
        } else if (result && typeof result === 'object' && 'success' in result && result.success) {
          toast({
            title: "Account Deleted",
            description: "User account has been permanently deleted as requested.",
          });
        }
      }

      await fetchRequests();
      setSelectedRequest(null);
      setAdminNotes('');
      setNewStatus('');
      
      toast({
        title: "Request Updated",
        description: "Deletion request has been updated successfully.",
      });
    } catch (error) {
      console.error('Error updating request:', error);
      toast({
        title: "Update Failed",
        description: "Failed to update deletion request",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredRequests = requests.filter(request => {
    if (!request) return false;
    
    const email = request.user_email || '';
    const fullName = request.user_name || '';
    const status = request.status || '';
    const searchLower = searchTerm.toLowerCase();
    
    return email.toLowerCase().includes(searchLower) ||
           fullName.toLowerCase().includes(searchLower) ||
           status.toLowerCase().includes(searchLower);
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'processing':
        return <Shield className="w-4 h-4 text-blue-500" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'cancelled':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-500/20 text-yellow-400';
      case 'processing':
        return 'bg-blue-500/20 text-blue-400';
      case 'completed':
        return 'bg-green-500/20 text-green-400';
      case 'cancelled':
        return 'bg-red-500/20 text-red-400';
      default:
        return 'bg-gray-500/20 text-gray-400';
    }
  };

  if (loading) {
    return (
      <Card className="glass-card">
        <CardContent className="p-6">
          <div className="text-center">Loading deletion requests...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Trash2 className="mr-2 h-5 w-5" />
          Account Deletion Requests
        </CardTitle>
        <CardDescription>
          Manage GDPR-compliant account deletion requests
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Search */}
        <div className="flex items-center space-x-2 mb-6">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by email, name, or status..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
        </div>

        {filteredRequests.length === 0 ? (
          <div className="text-center py-8">
            <Trash2 className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">No deletion requests found</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Requested</TableHead>
                <TableHead>Processed</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRequests.map((request) => (
                <TableRow key={request.id}>
                  <TableCell className="font-medium">
                    {request.user_name || 'N/A'}
                  </TableCell>
                  <TableCell>{request.user_email || 'N/A'}</TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(request.status)}>
                      <span className="flex items-center">
                        {getStatusIcon(request.status)}
                        <span className="ml-1 capitalize">{request.status}</span>
                      </span>
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {new Date(request.requested_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    {request.processed_at 
                      ? new Date(request.processed_at).toLocaleDateString()
                      : '-'
                    }
                  </TableCell>
                  <TableCell>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedRequest(request);
                            setAdminNotes(request.admin_notes || '');
                            setNewStatus(request.status);
                          }}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Manage
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>Manage Deletion Request</DialogTitle>
                          <DialogDescription>
                            Update the status and notes for this GDPR deletion request
                          </DialogDescription>
                        </DialogHeader>
                        
                        {selectedRequest && (
                          <div className="space-y-6">
                            {/* Request Details */}
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <Label className="font-medium">User</Label>
                                <p>{selectedRequest.user_name || 'N/A'}</p>
                              </div>
                              <div>
                                <Label className="font-medium">Email</Label>
                                <p>{selectedRequest.user_email || 'N/A'}</p>
                              </div>
                              <div>
                                <Label className="font-medium">Requested Date</Label>
                                <p>{new Date(selectedRequest.requested_at).toLocaleString()}</p>
                              </div>
                              <div>
                                <Label className="font-medium">Current Status</Label>
                                <Badge className={getStatusColor(selectedRequest.status)}>
                                  {selectedRequest.status}
                                </Badge>
                              </div>
                            </div>

                            {/* Status Update */}
                            <div className="space-y-4">
                              <div>
                                <Label htmlFor="status">Update Status</Label>
                                <Select value={newStatus} onValueChange={setNewStatus}>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select new status" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="pending">Pending</SelectItem>
                                    <SelectItem value="processing">Processing</SelectItem>
                                    <SelectItem value="completed">Completed (Delete Account)</SelectItem>
                                    <SelectItem value="cancelled">Cancelled</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              <div>
                                <Label htmlFor="notes">Admin Notes</Label>
                                <Textarea
                                  id="notes"
                                  value={adminNotes}
                                  onChange={(e) => setAdminNotes(e.target.value)}
                                  placeholder="Add notes about this request..."
                                  rows={3}
                                />
                              </div>

                              {newStatus === 'completed' && (
                                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                                  <div className="flex items-start">
                                    <AlertTriangle className="h-5 w-5 text-destructive mt-0.5 mr-2 flex-shrink-0" />
                                    <div className="text-sm">
                                      <p className="font-medium text-destructive mb-2">
                                        Warning: Account will be permanently deleted
                                      </p>
                                      <ul className="text-muted-foreground space-y-1">
                                        <li>• All user data will be permanently removed</li>
                                        <li>• BONK balance and transactions will be deleted</li>
                                        <li>• This action cannot be undone</li>
                                        <li>• Complies with GDPR Article 17 (Right to erasure)</li>
                                      </ul>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Actions */}
                            <div className="flex justify-end space-x-2">
                              <Button
                                variant="outline"
                                onClick={() => {
                                  setSelectedRequest(null);
                                  setAdminNotes('');
                                  setNewStatus('');
                                }}
                              >
                                Cancel
                              </Button>
                              <Button
                                onClick={handleUpdateRequest}
                                disabled={isProcessing || !newStatus}
                                variant={newStatus === 'completed' ? 'destructive' : 'default'}
                              >
                                {isProcessing ? 'Processing...' : 'Update Request'}
                              </Button>
                            </div>
                          </div>
                        )}
                      </DialogContent>
                    </Dialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}