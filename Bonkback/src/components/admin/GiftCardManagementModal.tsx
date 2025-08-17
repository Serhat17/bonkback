import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Gift } from 'lucide-react';

interface GiftCardManagementModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGiftCardAdded?: () => void;
}

export function GiftCardManagementModal({ open, onOpenChange, onGiftCardAdded }: GiftCardManagementModalProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    brand_name: '',
    title: '',
    description: '',
    fiat_value: '',
    bonk_price: '',
    currency: 'USD',
    brand_logo_url: '',
    terms_conditions: '',
    available_quantity: ''
  });

  const handleSubmit = async () => {
    if (!formData.brand_name || !formData.title || !formData.fiat_value || !formData.bonk_price) {
      toast({
        title: "Missing Fields",
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('gift_cards')
        .insert({
          brand_name: formData.brand_name,
          title: formData.title,
          description: formData.description,
          fiat_value: parseFloat(formData.fiat_value),
          bonk_price: parseFloat(formData.bonk_price),
          currency: formData.currency,
          brand_logo_url: formData.brand_logo_url,
          terms_conditions: formData.terms_conditions,
          available_quantity: formData.available_quantity ? parseInt(formData.available_quantity) : 0,
          status: 'active'
        });

      if (error) throw error;

      toast({
        title: "Gift Card Added",
        description: "Gift card has been created successfully.",
      });

      onOpenChange(false);
      onGiftCardAdded?.();
      setFormData({
        brand_name: '',
        title: '',
        description: '',
        fiat_value: '',
        bonk_price: '',
        currency: 'USD',
        brand_logo_url: '',
        terms_conditions: '',
        available_quantity: ''
      });
    } catch (error) {
      console.error('Error adding gift card:', error);
      toast({
        title: "Error",
        description: "Failed to add gift card. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Gift className="mr-2 h-5 w-5" />
            Add New Gift Card
          </DialogTitle>
          <DialogDescription>
            Create a new gift card option for users to redeem
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="brand_name">Brand Name *</Label>
            <Input
              id="brand_name"
              value={formData.brand_name}
              onChange={(e) => setFormData(prev => ({ ...prev, brand_name: e.target.value }))}
              placeholder="e.g., Apple, Amazon"
            />
          </div>

          <div>
            <Label htmlFor="title">Card Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="e.g., $25 iTunes Gift Card"
            />
          </div>

          <div>
            <Label htmlFor="fiat_value">Value ($) *</Label>
            <Input
              id="fiat_value"
              type="number"
              step="0.01"
              value={formData.fiat_value}
              onChange={(e) => setFormData(prev => ({ ...prev, fiat_value: e.target.value }))}
              placeholder="e.g., 25.00"
            />
          </div>

          <div>
            <Label htmlFor="bonk_price">BONK Price *</Label>
            <Input
              id="bonk_price"
              type="number"
              value={formData.bonk_price}
              onChange={(e) => setFormData(prev => ({ ...prev, bonk_price: e.target.value }))}
              placeholder="e.g., 1666667"
            />
          </div>

          <div>
            <Label htmlFor="currency">Currency</Label>
            <Select value={formData.currency} onValueChange={(value) => setFormData(prev => ({ ...prev, currency: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select currency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USD">USD</SelectItem>
                <SelectItem value="EUR">EUR</SelectItem>
                <SelectItem value="GBP">GBP</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="available_quantity">Available Quantity</Label>
            <Input
              id="available_quantity"
              type="number"
              value={formData.available_quantity}
              onChange={(e) => setFormData(prev => ({ ...prev, available_quantity: e.target.value }))}
              placeholder="e.g., 100"
            />
          </div>

          <div className="md:col-span-2">
            <Label htmlFor="brand_logo_url">Brand Logo URL</Label>
            <Input
              id="brand_logo_url"
              value={formData.brand_logo_url}
              onChange={(e) => setFormData(prev => ({ ...prev, brand_logo_url: e.target.value }))}
              placeholder="https://example.com/logo.png"
            />
          </div>

          <div className="md:col-span-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Describe the gift card..."
              rows={3}
            />
          </div>

          <div className="md:col-span-2">
            <Label htmlFor="terms_conditions">Terms & Conditions</Label>
            <Textarea
              id="terms_conditions"
              value={formData.terms_conditions}
              onChange={(e) => setFormData(prev => ({ ...prev, terms_conditions: e.target.value }))}
              placeholder="Enter terms and conditions..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting}
            className="btn-primary"
          >
            {isSubmitting ? 'Adding...' : 'Add Gift Card'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}