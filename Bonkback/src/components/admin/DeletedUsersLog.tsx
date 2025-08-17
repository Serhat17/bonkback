import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  UserX, 
  Search, 
  Shield,
  Clock,
  FileText
} from 'lucide-react';

interface DeletedUser {
  id: string;
  email: string;
  full_name: string;
  deleted_at: string;
  reason: string;
  updated_at: string;
}

export function DeletedUsersLog() {
  const { toast } = useToast();
  const [deletedUsers, setDeletedUsers] = useState<DeletedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchDeletedUsers();
  }, []);

  const fetchDeletedUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('deleted_users_log')
        .select('*')
        .order('deleted_at', { ascending: false });

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }
      
      setDeletedUsers((data as DeletedUser[]) || []);
    } catch (error: any) {
      console.error('Error fetching deleted users:', error);
      toast({
        title: "Error", 
        description: error?.message || "Failed to fetch deleted users log. Please check if you have admin permissions.",
        variant: "destructive"
      });
      // Set empty array on error to prevent infinite loading
      setDeletedUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = deletedUsers.filter(user =>
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.reason?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <Card className="glass-card">
        <CardContent className="p-6">
          <div className="text-center">Loading deleted users log...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center">
          <UserX className="mr-2 h-5 w-5" />
          Deleted Users Log
        </CardTitle>
        <CardDescription>
          Audit trail of permanently deleted user accounts (GDPR compliance)
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Search */}
        <div className="flex items-center space-x-2 mb-6">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by email, name, or reason..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-muted/20 rounded-lg p-4">
            <div className="flex items-center">
              <UserX className="h-4 w-4 text-red-500 mr-2" />
              <span className="text-sm font-medium">Total Deleted</span>
            </div>
            <p className="text-2xl font-bold text-red-500 mt-1">
              {deletedUsers.length}
            </p>
          </div>
          
          <div className="bg-muted/20 rounded-lg p-4">
            <div className="flex items-center">
              <Shield className="h-4 w-4 text-blue-500 mr-2" />
              <span className="text-sm font-medium">GDPR Requests</span>
            </div>
            <p className="text-2xl font-bold text-blue-500 mt-1">
              {deletedUsers.filter(u => u.reason.includes('GDPR')).length}
            </p>
          </div>
          
          <div className="bg-muted/20 rounded-lg p-4">
            <div className="flex items-center">
              <Clock className="h-4 w-4 text-green-500 mr-2" />
              <span className="text-sm font-medium">This Month</span>
            </div>
            <p className="text-2xl font-bold text-green-500 mt-1">
              {deletedUsers.filter(u => {
                const deletedDate = new Date(u.deleted_at);
                const now = new Date();
                return deletedDate.getMonth() === now.getMonth() && 
                       deletedDate.getFullYear() === now.getFullYear();
              }).length}
            </p>
          </div>
        </div>

        {filteredUsers.length === 0 ? (
          <div className="text-center py-8">
            <UserX className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">No deleted users found</p>
            {searchTerm && (
              <p className="text-sm text-muted-foreground mt-1">
                Try adjusting your search criteria
              </p>
            )}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Deletion Reason</TableHead>
                <TableHead>Deleted Date</TableHead>
                <TableHead>Compliance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">
                    {user.full_name || 'N/A'}
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-mono text-xs">
                      {user.reason}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {new Date(user.deleted_at).toLocaleDateString()} at{' '}
                    {new Date(user.deleted_at).toLocaleTimeString()}
                  </TableCell>
                  <TableCell>
                    {user.reason.includes('GDPR') ? (
                      <Badge className="bg-green-500/20 text-green-400">
                        <Shield className="w-3 h-3 mr-1" />
                        GDPR Compliant
                      </Badge>
                    ) : (
                      <Badge variant="secondary">
                        <FileText className="w-3 h-3 mr-1" />
                        Other
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {/* Footer Info */}
        <div className="mt-6 text-xs text-muted-foreground bg-muted/10 rounded-lg p-3">
          <p className="flex items-center">
            <Shield className="w-3 h-3 mr-1" />
            This log is maintained for compliance purposes and audit trails as required by GDPR Article 30 (Records of processing activities).
          </p>
        </div>
      </CardContent>
    </Card>
  );
}