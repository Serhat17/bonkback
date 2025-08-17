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
import { Edit, Trash2, Search, Plus, Package } from 'lucide-react';
import { GiftCardManagementModal } from './GiftCardManagementModal';

interface GiftCard {
  id: string;
  title: string;
  brand_name: string;
  fiat_value: number;
  bonk_price: number;
  available_quantity: number;
  status: string;
  currency: string;
  created_at: string;
}

export function GiftCardsManagementTable() {
  const [giftCards, setGiftCards] = useState<GiftCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingCard, setEditingCard] = useState<GiftCard | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const { toast } = useToast();

  const fetchGiftCards = async () => {
    try {
      const { data, error } = await supabase
        .from('gift_cards')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setGiftCards(data || []);
    } catch (error) {
      console.error('Error fetching gift cards:', error);
      toast({
        title: "Error",
        description: "Failed to fetch gift cards",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGiftCards();
  }, []);

  const handleDeleteGiftCard = async (cardId: string) => {
    try {
      const { error } = await supabase
        .from('gift_cards')
        .delete()
        .eq('id', cardId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Gift card deleted successfully",
      });
      
      fetchGiftCards();
    } catch (error) {
      console.error('Error deleting gift card:', error);
      toast({
        title: "Error",
        description: "Failed to delete gift card",
        variant: "destructive",
      });
    }
  };

  const handleUpdateQuantity = async (cardId: string, newQuantity: number) => {
    try {
      const { error } = await supabase
        .from('gift_cards')
        .update({ available_quantity: newQuantity })
        .eq('id', cardId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Quantity updated successfully",
      });
      
      fetchGiftCards();
    } catch (error) {
      console.error('Error updating quantity:', error);
      toast({
        title: "Error",
        description: "Failed to update quantity",
        variant: "destructive",
      });
    }
  };

  const handleToggleStatus = async (cardId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    
    try {
      const { error } = await supabase
        .from('gift_cards')
        .update({ status: newStatus })
        .eq('id', cardId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Gift card ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully`,
      });
      
      fetchGiftCards();
    } catch (error) {
      console.error('Error updating gift card status:', error);
      toast({
        title: "Error",
        description: "Failed to update gift card status",
        variant: "destructive",
      });
    }
  };

  const filteredGiftCards = giftCards.filter(card =>
    card.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    card.brand_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'inactive': return 'bg-red-500/20 text-red-400 border-red-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getInventoryColor = (quantity: number) => {
    if (quantity === 0) return 'bg-red-500/20 text-red-400 border-red-500/30';
    if (quantity < 10) return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
    return 'bg-green-500/20 text-green-400 border-green-500/30';
  };

  if (loading) {
    return (
      <Card className="glass-card">
        <CardContent className="pt-6">
          <div className="text-center">Loading gift cards...</div>
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
              <CardTitle>Gift Cards Management</CardTitle>
              <p className="text-muted-foreground">Manage gift card inventory and pricing</p>
            </div>
            <Button onClick={() => setShowCreateModal(true)} className="btn-primary">
              <Plus className="mr-2 h-4 w-4" />
              Add Gift Card
            </Button>
          </div>
          
          <div className="flex items-center space-x-2 pt-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search gift cards..."
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
                  <TableHead>Brand</TableHead>
                  <TableHead>Gift Card</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>BONK Price</TableHead>
                  <TableHead>Inventory</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredGiftCards.map((card) => (
                  <TableRow key={card.id}>
                    <TableCell className="font-medium">
                      {card.brand_name}
                    </TableCell>
                    <TableCell>
                      {card.title}
                    </TableCell>
                    <TableCell>
                      {card.currency} {card.fiat_value}
                    </TableCell>
                    <TableCell className="font-mono">
                      {card.bonk_price.toLocaleString()} BONK
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Badge className={getInventoryColor(card.available_quantity)}>
                          {card.available_quantity} available
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const newQuantity = prompt(`Update quantity for ${card.title}:`, card.available_quantity.toString());
                            if (newQuantity && !isNaN(Number(newQuantity))) {
                              handleUpdateQuantity(card.id, Number(newQuantity));
                            }
                          }}
                        >
                          <Package className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleStatus(card.id, card.status)}
                      >
                        <Badge className={getStatusColor(card.status)}>
                          {card.status}
                        </Badge>
                      </Button>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingCard(card)}
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
                              <AlertDialogTitle>Delete Gift Card</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete "{card.title}"? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteGiftCard(card.id)}
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
            
            {filteredGiftCards.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                {searchTerm ? "No gift cards found matching your search." : "No gift cards available."}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <GiftCardManagementModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        onGiftCardAdded={fetchGiftCards}
      />

      <GiftCardManagementModal
        open={!!editingCard}
        onOpenChange={(open) => !open && setEditingCard(null)}
        onGiftCardAdded={fetchGiftCards}
      />
    </motion.div>
  );
}