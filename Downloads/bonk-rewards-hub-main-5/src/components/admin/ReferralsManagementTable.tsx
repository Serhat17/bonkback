import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Eye, Search, Users, ArrowRight, DollarSign, Calendar } from 'lucide-react';

interface ReferralData {
  id: string;
  referrer_id: string;
  referred_id: string;
  referral_code: string;
  reward_claimed: boolean;
  referred_user_claimed: boolean;
  created_at: string;
  referrer_name: string;
  referrer_email: string;
  referred_name: string;
  referred_email: string;
}

interface ReferralChain {
  user_id: string;
  user_name: string;
  user_email: string;
  level: number;
  referrals_count: number;
  total_earned: number;
  children: ReferralChain[];
}

export function ReferralsManagementTable() {
  const [referrals, setReferrals] = useState<ReferralData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedChain, setSelectedChain] = useState<ReferralChain | null>(null);
  const [chainLoading, setChainLoading] = useState(false);
  const { toast } = useToast();

  const fetchReferrals = async () => {
    try {
      // First get all referrals
      const { data: referralsData, error: referralsError } = await supabase
        .from('referrals')
        .select('*')
        .order('created_at', { ascending: false });

      if (referralsError) throw referralsError;

      if (!referralsData || referralsData.length === 0) {
        setReferrals([]);
        return;
      }

      // Get unique user IDs
      const userIds = [...new Set([
        ...referralsData.map(r => r.referrer_id),
        ...referralsData.map(r => r.referred_id)
      ])];

      // Fetch user profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, full_name, email')
        .in('user_id', userIds);

      if (profilesError) throw profilesError;

      // Create a map for quick lookup
      const profilesMap = new Map(
        profilesData?.map(profile => [profile.user_id, profile]) || []
      );

      const formattedData = referralsData.map(item => {
        const referrer = profilesMap.get(item.referrer_id);
        const referred = profilesMap.get(item.referred_id);
        
        return {
          ...item,
          referrer_name: referrer?.full_name || 'Unknown User',
          referrer_email: referrer?.email || 'No email',
          referred_name: referred?.full_name || 'Unknown User',
          referred_email: referred?.email || 'No email'
        };
      });

      setReferrals(formattedData);
    } catch (error) {
      console.error('Error fetching referrals:', error);
      toast({
        title: "Error",
        description: "Failed to fetch referrals",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const buildReferralChain = async (userId: string) => {
    setChainLoading(true);
    try {
      // This is a simplified version - in a real app you'd build a recursive tree
      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('user_id, full_name, email, total_earned')
        .eq('user_id', userId)
        .single();

      if (userError) throw userError;

      const { data: referralsData, error: referralsError } = await supabase
        .from('referrals')
        .select('referred_id')
        .eq('referrer_id', userId);

      if (referralsError) throw referralsError;

      const chain: ReferralChain = {
        user_id: userData.user_id,
        user_name: userData.full_name || 'Unknown',
        user_email: userData.email || 'Unknown',
        level: 0,
        referrals_count: referralsData?.length || 0,
        total_earned: userData.total_earned || 0,
        children: []
      };

      setSelectedChain(chain);
    } catch (error) {
      console.error('Error building referral chain:', error);
      toast({
        title: "Error",
        description: "Failed to build referral chain",
        variant: "destructive",
      });
    } finally {
      setChainLoading(false);
    }
  };

  useEffect(() => {
    fetchReferrals();
  }, []);

  const filteredReferrals = referrals.filter(referral =>
    referral.referrer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    referral.referred_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    referral.referral_code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (claimed: boolean) => {
    return claimed 
      ? 'bg-green-500/20 text-green-400 border-green-500/30'
      : 'bg-orange-500/20 text-orange-400 border-orange-500/30';
  };

  const ReferralChainNode = ({ node, depth = 0 }: { node: ReferralChain; depth?: number }) => (
    <div className={`ml-${depth * 4} border-l-2 border-muted pl-4 py-2`}>
      <div className="flex items-center justify-between">
        <div>
          <div className="font-medium">{node.user_name}</div>
          <div className="text-sm text-muted-foreground">{node.user_email}</div>
        </div>
        <div className="text-right">
          <div className="text-sm font-mono text-primary">{node.total_earned.toLocaleString()} BONK</div>
          <div className="text-xs text-muted-foreground">{node.referrals_count} referrals</div>
        </div>
      </div>
      {node.children.map((child, index) => (
        <ReferralChainNode key={`${child.user_id}-${index}`} node={child} depth={depth + 1} />
      ))}
    </div>
  );

  if (loading) {
    return (
      <Card className="glass-card">
        <CardContent className="pt-6">
          <div className="text-center">Loading referrals...</div>
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
              <CardTitle>Referrals Management</CardTitle>
              <p className="text-muted-foreground">Track referral chains and reward distribution</p>
            </div>
            <div className="text-sm text-muted-foreground">
              Total Referrals: {referrals.length}
            </div>
          </div>
          
          <div className="flex items-center space-x-2 pt-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search referrals..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Referrer</TableHead>
                  <TableHead>Referred User</TableHead>
                  <TableHead>Code Used</TableHead>
                  <TableHead>Rewards Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReferrals.map((referral) => (
                  <TableRow key={referral.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{referral.referrer_name}</div>
                        <div className="text-sm text-muted-foreground">{referral.referrer_email}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{referral.referred_name}</div>
                        <div className="text-sm text-muted-foreground">{referral.referred_email}</div>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono">
                      {referral.referral_code}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <Badge className={getStatusColor(referral.reward_claimed)}>
                          Referrer: {referral.reward_claimed ? 'Claimed' : 'Pending'}
                        </Badge>
                        <Badge className={getStatusColor(referral.referred_user_claimed)}>
                          Referred: {referral.referred_user_claimed ? 'Claimed' : 'Pending'}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>{new Date(referral.created_at).toLocaleDateString()}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => buildReferralChain(referral.referrer_id)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>Referral Chain Analysis</DialogTitle>
                          </DialogHeader>
                          
                          {chainLoading ? (
                            <div className="text-center py-8">Loading referral chain...</div>
                          ) : selectedChain ? (
                            <div className="space-y-4">
                              <div className="grid grid-cols-3 gap-4 mb-6">
                                <Card>
                                  <CardContent className="pt-4">
                                    <div className="flex items-center space-x-2">
                                      <Users className="h-5 w-5 text-blue-500" />
                                      <div>
                                        <div className="text-2xl font-bold">{selectedChain.referrals_count}</div>
                                        <div className="text-xs text-muted-foreground">Direct Referrals</div>
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
                                
                                <Card>
                                  <CardContent className="pt-4">
                                    <div className="flex items-center space-x-2">
                                      <DollarSign className="h-5 w-5 text-primary" />
                                      <div>
                                        <div className="text-2xl font-bold font-mono">{selectedChain.total_earned.toLocaleString()}</div>
                                        <div className="text-xs text-muted-foreground">BONK Earned</div>
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
                                
                                <Card>
                                  <CardContent className="pt-4">
                                    <div className="flex items-center space-x-2">
                                      <ArrowRight className="h-5 w-5 text-green-500" />
                                      <div>
                                        <div className="text-2xl font-bold">
                                          {selectedChain.children.reduce((sum, child) => sum + child.total_earned, 0).toLocaleString()}
                                        </div>
                                        <div className="text-xs text-muted-foreground">Network Value</div>
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
                              </div>
                              
                              <div>
                                <h4 className="font-semibold mb-4">Referral Tree</h4>
                                <div className="border rounded-lg p-4 bg-muted/20">
                                  <ReferralChainNode node={selectedChain} />
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="text-center py-8 text-muted-foreground">
                              No referral chain data available
                            </div>
                          )}
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            
            {filteredReferrals.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                {searchTerm ? "No referrals found matching your search." : "No referrals available."}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}