import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Plus } from 'lucide-react';

interface OfferManagementModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOfferAdded?: () => void;
}

export function OfferManagementModal({ open, onOpenChange, onOfferAdded }: OfferManagementModalProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [affiliateNetworks, setAffiliateNetworks] = useState<Array<{ network: string; display_name: string | null }>>([]);
  const [formData, setFormData] = useState({
    merchant_name: '',
    title: '',
    description: '',
    cashback_percentage: '',
    max_cashback: '',
    category: '',
    merchant_logo_url: '',
    image_url: '',
    terms_conditions: '',
    featured: false,
    valid_until: '',
    affiliate_network: '',
    program_id: '',
    affiliate_id: '',
    deeplink: '',
    tracking_template: ''
  });

  // Fetch affiliate networks
  useEffect(() => {
    const fetchNetworks = async () => {
      const { data, error } = await supabase
        .from('affiliate_networks')
        .select('network, display_name')
        .order('network');
      
      if (!error && data) {
        setAffiliateNetworks(data);
      }
    };
    
    if (open) {
      fetchNetworks();
    }
  }, [open]);

  const handleSubmit = async () => {
    if (!formData.merchant_name || !formData.title || !formData.cashback_percentage || !formData.deeplink) {
      toast({
        title: "Missing Fields",
        description: "Please fill in all required fields including deeplink for tracking.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('cashback_offers')
        .insert({
          merchant_name: formData.merchant_name,
          title: formData.title,
          description: formData.description,
          cashback_percentage: parseFloat(formData.cashback_percentage),
          max_cashback: formData.max_cashback ? parseFloat(formData.max_cashback) : null,
          category: formData.category,
          merchant_logo_url: formData.merchant_logo_url,
          image_url: formData.image_url,
          terms_conditions: formData.terms_conditions,
          featured: formData.featured,
          valid_until: formData.valid_until ? new Date(formData.valid_until).toISOString() : null,
          affiliate_network: formData.affiliate_network || null,
          deeplink: formData.deeplink,
          tracking_template: formData.tracking_template || null,
          status: 'active'
        });

      if (error) throw error;

      toast({
        title: "Offer Added",
        description: "Cashback offer has been created successfully.",
      });

      onOpenChange(false);
      onOfferAdded?.();
      setFormData({
        merchant_name: '',
        title: '',
        description: '',
        cashback_percentage: '',
        max_cashback: '',
        category: '',
        merchant_logo_url: '',
        image_url: '',
        terms_conditions: '',
        featured: false,
        valid_until: '',
        affiliate_network: '',
        program_id: '',
        affiliate_id: '',
        deeplink: '',
        tracking_template: ''
      });
    } catch (error) {
      console.error('Error adding offer:', error);
      toast({
        title: "Error",
        description: "Failed to add offer. Please try again.",
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
            <Plus className="mr-2 h-5 w-5" />
            Add New Cashback Offer
          </DialogTitle>
          <DialogDescription>
            Create a new cashback offer for merchant partners
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="merchant_name">Merchant Name *</Label>
            <Input
              id="merchant_name"
              value={formData.merchant_name}
              onChange={(e) => setFormData(prev => ({ ...prev, merchant_name: e.target.value }))}
              placeholder="e.g., Amazon"
            />
          </div>

          <div>
            <Label htmlFor="title">Offer Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="e.g., Electronics Cashback"
            />
          </div>

          <div>
            <Label htmlFor="cashback_percentage">Cashback % *</Label>
            <Input
              id="cashback_percentage"
              type="number"
              step="0.01"
              value={formData.cashback_percentage}
              onChange={(e) => setFormData(prev => ({ ...prev, cashback_percentage: e.target.value }))}
              placeholder="e.g., 5.5"
            />
          </div>

          <div>
            <Label htmlFor="max_cashback">Max Cashback ($)</Label>
            <Input
              id="max_cashback"
              type="number"
              value={formData.max_cashback}
              onChange={(e) => setFormData(prev => ({ ...prev, max_cashback: e.target.value }))}
              placeholder="e.g., 50"
            />
          </div>

          <div>
            <Label htmlFor="category">Category</Label>
            <Select value={formData.category} onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="electronics">Electronics</SelectItem>
                <SelectItem value="fashion">Fashion</SelectItem>
                <SelectItem value="travel">Travel</SelectItem>
                <SelectItem value="food">Food & Dining</SelectItem>
                <SelectItem value="health">Health & Beauty</SelectItem>
                <SelectItem value="home">Home & Garden</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="valid_until">Valid Until</Label>
            <Input
              id="valid_until"
              type="date"
              value={formData.valid_until}
              onChange={(e) => setFormData(prev => ({ ...prev, valid_until: e.target.value }))}
            />
          </div>

          <div>
            <Label htmlFor="merchant_logo_url">Merchant Logo URL</Label>
            <Input
              id="merchant_logo_url"
              value={formData.merchant_logo_url}
              onChange={(e) => setFormData(prev => ({ ...prev, merchant_logo_url: e.target.value }))}
              placeholder="https://example.com/logo.png"
            />
          </div>

          <div>
            <Label htmlFor="image_url">Offer Image URL</Label>
            <Input
              id="image_url"
              value={formData.image_url}
              onChange={(e) => setFormData(prev => ({ ...prev, image_url: e.target.value }))}
              placeholder="https://example.com/offer-image.png"
            />
          </div>

          <div>
            <Label htmlFor="affiliate_network">Affiliate Network</Label>
            <Select value={formData.affiliate_network} onValueChange={(value) => setFormData(prev => ({ ...prev, affiliate_network: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select affiliate network" />
              </SelectTrigger>
              <SelectContent>
                {affiliateNetworks.map((network) => (
                  <SelectItem key={network.network} value={network.network}>
                    {network.display_name || network.network}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="program_id">Program ID</Label>
            <Input
              id="program_id"
              value={formData.program_id}
              onChange={(e) => setFormData(prev => ({ ...prev, program_id: e.target.value }))}
              placeholder="e.g., 12345"
            />
          </div>

          <div>
            <Label htmlFor="affiliate_id">Affiliate ID</Label>
            <Input
              id="affiliate_id"
              value={formData.affiliate_id}
              onChange={(e) => setFormData(prev => ({ ...prev, affiliate_id: e.target.value }))}
              placeholder="e.g., your-affiliate-id"
            />
          </div>

          <div className="md:col-span-2">
            <Label htmlFor="deeplink">Deeplink URL *</Label>
            <Input
              id="deeplink"
              value={formData.deeplink}
              onChange={(e) => setFormData(prev => ({ ...prev, deeplink: e.target.value }))}
              placeholder="https://merchant.com/product-page"
            />
            <p className="text-sm text-muted-foreground mt-1">The final destination URL for users</p>
          </div>

          <div className="md:col-span-2">
            <Label htmlFor="tracking_template">Custom Tracking Template</Label>
            <Textarea
              id="tracking_template"
              value={formData.tracking_template}
              onChange={(e) => setFormData(prev => ({ ...prev, tracking_template: e.target.value }))}
              placeholder="Optional custom tracking template for this specific offer"
              rows={2}
            />
            <p className="text-sm text-muted-foreground mt-1">Leave empty to use network default template</p>
          </div>

          <div className="md:col-span-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Describe the cashback offer..."
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

          <div className="md:col-span-2 flex items-center space-x-2">
            <Switch
              id="featured"
              checked={formData.featured}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, featured: checked }))}
            />
            <Label htmlFor="featured">Featured Offer</Label>
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
            {isSubmitting ? 'Adding...' : 'Add Offer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}