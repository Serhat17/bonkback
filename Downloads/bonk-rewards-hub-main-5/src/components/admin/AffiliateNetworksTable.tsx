import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Edit, Trash2, Search, Plus } from 'lucide-react';
import { AffiliateNetworkModal } from './AffiliateNetworkModal';

interface AffiliateNetwork {
  id: string;
  network: string;
  display_name: string | null;
  tracking_url_template: string;
  encoding_rules: any;
  created_at: string;
}

export function AffiliateNetworksTable() {
  const [networks, setNetworks] = useState<AffiliateNetwork[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingNetwork, setEditingNetwork] = useState<AffiliateNetwork | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const { toast } = useToast();

  const fetchNetworks = async () => {
    try {
      const { data, error } = await supabase
        .from('affiliate_networks')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNetworks(data || []);
    } catch (error) {
      console.error('Error fetching networks:', error);
      toast({
        title: "Error",
        description: "Failed to fetch affiliate networks",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNetworks();
  }, []);

  const handleDeleteNetwork = async (networkId: string) => {
    try {
      const { error } = await supabase
        .from('affiliate_networks')
        .delete()
        .eq('id', networkId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Affiliate network deleted successfully",
      });
      
      fetchNetworks();
    } catch (error) {
      console.error('Error deleting network:', error);
      toast({
        title: "Error",
        description: "Failed to delete affiliate network",
        variant: "destructive",
      });
    }
  };

  const filteredNetworks = networks.filter(network =>
    network.network.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (network.display_name && network.display_name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) {
    return (
      <Card className="glass-card">
        <CardContent className="pt-6">
          <div className="text-center">Loading affiliate networks...</div>
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
              <CardTitle>Affiliate Networks</CardTitle>
              <p className="text-muted-foreground">Manage affiliate network configurations and tracking templates</p>
            </div>
            <Button onClick={() => setShowCreateModal(true)} className="btn-primary">
              <Plus className="mr-2 h-4 w-4" />
              Add Network
            </Button>
          </div>
          
          <div className="flex items-center space-x-2 pt-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search networks..."
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
                  <TableHead>Network</TableHead>
                  <TableHead>Display Name</TableHead>
                  <TableHead>Tracking Template</TableHead>
                  <TableHead>Encoding Rules</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredNetworks.map((network) => (
                  <TableRow key={network.id}>
                    <TableCell className="font-medium">
                      {network.network}
                    </TableCell>
                    <TableCell>
                      {network.display_name || '-'}
                    </TableCell>
                    <TableCell>
                      <div className="max-w-xs truncate font-mono text-sm">
                        {network.tracking_url_template}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-xs truncate text-sm">
                        {JSON.stringify(network.encoding_rules)}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingNetwork(network)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Network</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete "{network.network}"? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteNetwork(network.id)}
                                className="bg-red-500 hover:bg-red-600"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            
            {filteredNetworks.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                {searchTerm ? "No networks found matching your search." : "No affiliate networks configured."}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <AffiliateNetworkModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        onNetworkAdded={fetchNetworks}
      />

      <AffiliateNetworkModal
        open={!!editingNetwork}
        onOpenChange={(open) => !open && setEditingNetwork(null)}
        onNetworkAdded={fetchNetworks}
        network={editingNetwork}
      />
    </motion.div>
  );
}