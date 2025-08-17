import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Edit, Trash2, Search, Plus, Eye } from 'lucide-react';
import { OfferManagementModal } from './OfferManagementModal';

interface Offer {
  id: string;
  title: string;
  merchant_name: string;
  cashback_percentage: number;
  max_cashback: number | null;
  status: string;
  featured: boolean;
  created_at: string;
  valid_until: string | null;
  category: string | null;
}

export function OffersManagementTable() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingOffer, setEditingOffer] = useState<Offer | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const { toast } = useToast();

  const fetchOffers = async () => {
    try {
      const { data, error } = await supabase
        .from('cashback_offers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOffers(data || []);
    } catch (error) {
      console.error('Error fetching offers:', error);
      toast({
        title: "Error",
        description: "Failed to fetch offers",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOffers();
  }, []);

  const handleDeleteOffer = async (offerId: string) => {
    try {
      const { error } = await supabase
        .from('cashback_offers')
        .delete()
        .eq('id', offerId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Offer deleted successfully",
      });
      
      fetchOffers();
    } catch (error) {
      console.error('Error deleting offer:', error);
      toast({
        title: "Error",
        description: "Failed to delete offer",
        variant: "destructive",
      });
    }
  };

  const handleToggleStatus = async (offerId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    
    try {
      const { error } = await supabase
        .from('cashback_offers')
        .update({ status: newStatus })
        .eq('id', offerId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Offer ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully`,
      });
      
      fetchOffers();
    } catch (error) {
      console.error('Error updating offer status:', error);
      toast({
        title: "Error",
        description: "Failed to update offer status",
        variant: "destructive",
      });
    }
  };

  const filteredOffers = offers.filter(offer =>
    offer.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    offer.merchant_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'inactive': return 'bg-red-500/20 text-red-400 border-red-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  if (loading) {
    return (
      <Card className="glass-card">
        <CardContent className="pt-6">
          <div className="text-center">Loading offers...</div>
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
              <CardTitle>Offers Management</CardTitle>
              <p className="text-muted-foreground">Manage cashback offers and merchant partnerships</p>
            </div>
            <Button onClick={() => setShowCreateModal(true)} className="btn-primary">
              <Plus className="mr-2 h-4 w-4" />
              Create Offer
            </Button>
          </div>
          
          <div className="flex items-center space-x-2 pt-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search offers..."
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
                  <TableHead>Merchant</TableHead>
                  <TableHead>Offer</TableHead>
                  <TableHead>Cashback</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Featured</TableHead>
                  <TableHead>Valid Until</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOffers.map((offer) => (
                  <TableRow key={offer.id}>
                    <TableCell className="font-medium">
                      {offer.merchant_name}
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{offer.title}</div>
                        {offer.category && (
                          <div className="text-sm text-muted-foreground">{offer.category}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div>{offer.cashback_percentage}%</div>
                        {offer.max_cashback && (
                          <div className="text-sm text-muted-foreground">
                            Max: €{offer.max_cashback}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleStatus(offer.id, offer.status)}
                      >
                        <Badge className={getStatusColor(offer.status)}>
                          {offer.status}
                        </Badge>
                      </Button>
                    </TableCell>
                    <TableCell>
                      <Badge variant={offer.featured ? "default" : "secondary"}>
                        {offer.featured ? "Featured" : "Standard"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {offer.valid_until 
                        ? new Date(offer.valid_until).toLocaleDateString()
                        : "No expiry"
                      }
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingOffer(offer)}
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
                              <AlertDialogTitle>Delete Offer</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete "{offer.title}"? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteOffer(offer.id)}
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
            
            {filteredOffers.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                {searchTerm ? "No offers found matching your search." : "No offers available."}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <OfferManagementModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        onOfferAdded={fetchOffers}
      />

      <OfferManagementModal
        open={!!editingOffer}
        onOpenChange={(open) => !open && setEditingOffer(null)}
        onOfferAdded={fetchOffers}
      />
    </motion.div>
  );
}