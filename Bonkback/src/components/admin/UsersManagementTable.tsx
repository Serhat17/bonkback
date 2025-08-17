import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Eye, Search, Users, DollarSign, Gift, TrendingUp, UserPlus, Loader2 } from 'lucide-react';
import { RoleChangeConfirmDialog } from './RoleChangeConfirmDialog';

interface User {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  bonk_balance: number;
  total_earned: number;
  role: string;
  wallet_address: string | null;
  referral_code: string;
  referred_by: string | null;
  created_at: string;
  deleted_at?: string | null;
}

interface UserStats {
  totalTransactions: number;
  totalReferrals: number;
  lastActivity: string | null;
}

export function UsersManagementTable() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [createUserOpen, setCreateUserOpen] = useState(false);
  const [createUserLoading, setCreateUserLoading] = useState(false);
  const [newUserForm, setNewUserForm] = useState({
    email: '',
    password: '',
    fullName: '',
    role: 'user' as 'user' | 'admin'
  });
  const { toast } = useToast();

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: "Error",
        description: "Failed to fetch users",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchUserStats = async (userId: string) => {
    setStatsLoading(true);
    try {
      const [transactionsResult, referralsResult] = await Promise.all([
        supabase
          .from('cashback_transactions')
          .select('created_at', { count: 'exact' })
          .eq('user_id', userId),
        supabase
          .from('referrals')
          .select('created_at', { count: 'exact' })
          .eq('referrer_id', userId)
      ]);

      const lastActivityResult = await supabase
        .from('cashback_transactions')
        .select('created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      setUserStats({
        totalTransactions: transactionsResult.count || 0,
        totalReferrals: referralsResult.count || 0,
        lastActivity: lastActivityResult.data?.created_at || null
      });
    } catch (error) {
      console.error('Error fetching user stats:', error);
    } finally {
      setStatsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleViewUser = (user: User) => {
    setSelectedUser(user);
    fetchUserStats(user.user_id);
  };

  const handleRoleChangeSuccess = () => {
    fetchUsers();
  };

  const createUser = async () => {
    if (!newUserForm.email || !newUserForm.password) {
      toast({
        title: "Error",
        description: "Email and password are required",
        variant: "destructive",
      });
      return;
    }

    setCreateUserLoading(true);
    try {
      // Create auth user with Supabase Auth - auto-confirm email
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newUserForm.email,
        password: newUserForm.password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            full_name: newUserForm.fullName || newUserForm.email,
            email_confirm: true // This helps with auto-confirmation
          }
        }
      });

      if (authError) throw authError;

      if (authData.user) {
        // For admin-created users, we'll also try to confirm email via admin functions
        try {
          // Use admin function to confirm email automatically
          const { error: confirmError } = await supabase.auth.admin.updateUserById(
            authData.user.id,
            { email_confirm: true }
          );
          
          if (confirmError) {
            console.warn('Email confirmation via admin failed:', confirmError);
          }
        } catch (adminError) {
          console.warn('Admin email confirmation not available:', adminError);
        }

        // Update the profile with the specified role (default is user)
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ 
            role: newUserForm.role,
            full_name: newUserForm.fullName || newUserForm.email
          })
          .eq('user_id', authData.user.id);

        if (profileError) {
          console.error('Profile update error:', profileError);
        }

        toast({
          title: "User Created Successfully",
          description: `User ${newUserForm.email} has been created with role: ${newUserForm.role}. Email automatically confirmed.`,
        });

        // Reset form and close modal
        setNewUserForm({
          email: '',
          password: '',
          fullName: '',
          role: 'user'
        });
        setCreateUserOpen(false);
        
        // Refresh users list
        fetchUsers();
      }
    } catch (error: any) {
      console.error('Error creating user:', error);
      toast({
        title: "Error Creating User",
        description: error.message || "Failed to create user",
        variant: "destructive",
      });
    } finally {
      setCreateUserLoading(false);
    }
  };

  const filteredUsers = users.filter(user =>
    (user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.referral_code?.toLowerCase().includes(searchTerm.toLowerCase())) &&
    // Show only active users unless admin wants to see deleted ones
    (!user.deleted_at)
  );

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'moderator': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'user': return 'bg-green-500/20 text-green-400 border-green-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getBalanceColor = (balance: number) => {
    if (balance === 0) return 'text-gray-400';
    if (balance < 100000) return 'text-orange-400';
    return 'text-green-400';
  };

  if (loading) {
    return (
      <Card className="glass-card">
        <CardContent className="pt-6">
          <div className="text-center">Loading users...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <Card className="glass-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Users Management</CardTitle>
              <p className="text-muted-foreground">Manage platform users and view their activity</p>
            </div>
            <div className="text-sm text-muted-foreground">
              Total Users: {users.length}
            </div>
          </div>
          
          <div className="flex items-center justify-between gap-4 pt-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            
            <Dialog open={createUserOpen} onOpenChange={setCreateUserOpen}>
              <DialogTrigger asChild>
                <Button className="shrink-0">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Create User
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Create New User</DialogTitle>
                </DialogHeader>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="user@example.com"
                      value={newUserForm.email}
                      onChange={(e) => setNewUserForm(prev => ({ ...prev, email: e.target.value }))}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={newUserForm.password}
                      onChange={(e) => setNewUserForm(prev => ({ ...prev, password: e.target.value }))}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name (Optional)</Label>
                    <Input
                      id="fullName"
                      placeholder="John Doe"
                      value={newUserForm.fullName}
                      onChange={(e) => setNewUserForm(prev => ({ ...prev, fullName: e.target.value }))}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="role">Role</Label>
                    <Select
                      value={newUserForm.role}
                      onValueChange={(value: 'user' | 'admin') => setNewUserForm(prev => ({ ...prev, role: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">User</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex gap-2 pt-4">
                    <Button
                      onClick={createUser}
                      disabled={createUserLoading}
                      className="flex-1"
                    >
                      {createUserLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Create User
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setCreateUserOpen(false)}
                      disabled={createUserLoading}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>BONK Balance</TableHead>
                  <TableHead>Total Earned</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Referral Code</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id} className={user.deleted_at ? "opacity-50 bg-red-500/5" : ""}>
                    <TableCell>
                      <div className="flex items-center">
                        <div>
                          <div className="font-medium">{user.full_name || 'Unnamed User'}</div>
                          <div className="text-sm text-muted-foreground">{user.email}</div>
                        </div>
                        {user.deleted_at && (
                          <Badge variant="destructive" className="ml-2 text-xs">
                            Deleted
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className={`font-mono font-bold ${getBalanceColor(user.bonk_balance)}`}>
                      {user.bonk_balance.toLocaleString()} BONK
                    </TableCell>
                    <TableCell className="font-mono text-primary">
                      {user.total_earned.toLocaleString()} BONK
                    </TableCell>
                    <TableCell>
                      <RoleChangeConfirmDialog
                        userId={user.user_id}
                        userName={user.full_name || user.email || 'Unknown User'}
                        currentRole={user.role}
                        newRole={user.role === 'admin' ? 'user' : 'admin'}
                        onSuccess={handleRoleChangeSuccess}
                      >
                        <Button
                          variant="ghost"
                          size="sm"
                        >
                          <Badge className={getRoleColor(user.role)}>
                            {user.role}
                          </Badge>
                        </Button>
                      </RoleChangeConfirmDialog>
                    </TableCell>
                    <TableCell className="font-mono">
                      {user.referral_code}
                    </TableCell>
                    <TableCell>
                      {new Date(user.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewUser(user)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>User Details - {selectedUser?.full_name || 'Unnamed User'}</DialogTitle>
                          </DialogHeader>
                          
                          {selectedUser && (
                            <div className="space-y-6">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <h4 className="font-semibold mb-2">Basic Information</h4>
                                  <div className="space-y-2 text-sm">
                                    <div><span className="text-muted-foreground">Email:</span> {selectedUser.email}</div>
                                    <div><span className="text-muted-foreground">Full Name:</span> {selectedUser.full_name || 'Not provided'}</div>
                                    <div><span className="text-muted-foreground">Role:</span> <Badge className={getRoleColor(selectedUser.role)}>{selectedUser.role}</Badge></div>
                                    <div><span className="text-muted-foreground">Joined:</span> {new Date(selectedUser.created_at).toLocaleDateString()}</div>
                                    <div><span className="text-muted-foreground">Wallet:</span> {selectedUser.wallet_address || 'Not connected'}</div>
                                  </div>
                                </div>
                                
                                <div>
                                  <h4 className="font-semibold mb-2">Referral Information</h4>
                                  <div className="space-y-2 text-sm">
                                    <div><span className="text-muted-foreground">Referral Code:</span> <code className="bg-muted px-1 py-0.5 rounded">{selectedUser.referral_code}</code></div>
                                    <div><span className="text-muted-foreground">Referred By:</span> {selectedUser.referred_by || 'Direct signup'}</div>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="grid grid-cols-4 gap-4">
                                <Card>
                                  <CardContent className="pt-4">
                                    <div className="flex items-center space-x-2">
                                      <DollarSign className="h-5 w-5 text-primary" />
                                      <div>
                                        <div className="text-2xl font-bold font-mono">{selectedUser.bonk_balance.toLocaleString()}</div>
                                        <div className="text-xs text-muted-foreground">BONK Balance</div>
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
                                
                                <Card>
                                  <CardContent className="pt-4">
                                    <div className="flex items-center space-x-2">
                                      <TrendingUp className="h-5 w-5 text-green-500" />
                                      <div>
                                        <div className="text-2xl font-bold font-mono">{selectedUser.total_earned.toLocaleString()}</div>
                                        <div className="text-xs text-muted-foreground">Total Earned</div>
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
                                
                                <Card>
                                  <CardContent className="pt-4">
                                    <div className="flex items-center space-x-2">
                                      <Gift className="h-5 w-5 text-blue-500" />
                                      <div>
                                        <div className="text-2xl font-bold">
                                          {statsLoading ? '...' : userStats?.totalTransactions || 0}
                                        </div>
                                        <div className="text-xs text-muted-foreground">Transactions</div>
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
                                
                                <Card>
                                  <CardContent className="pt-4">
                                    <div className="flex items-center space-x-2">
                                      <Users className="h-5 w-5 text-purple-500" />
                                      <div>
                                        <div className="text-2xl font-bold">
                                          {statsLoading ? '...' : userStats?.totalReferrals || 0}
                                        </div>
                                        <div className="text-xs text-muted-foreground">Referrals</div>
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
                              </div>
                              
                              {userStats?.lastActivity && (
                                <div>
                                  <h4 className="font-semibold mb-2">Activity</h4>
                                  <div className="text-sm text-muted-foreground">
                                    Last activity: {new Date(userStats.lastActivity).toLocaleDateString()}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            
            {filteredUsers.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                {searchTerm ? "No users found matching your search." : "No users available."}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}