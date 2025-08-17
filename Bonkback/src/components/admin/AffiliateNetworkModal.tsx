import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit } from 'lucide-react';

interface AffiliateNetwork {
  id: string;
  network: string;
  display_name: string | null;
  tracking_url_template: string;
  encoding_rules: any;
}

interface AffiliateNetworkModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNetworkAdded?: () => void;
  network?: AffiliateNetwork | null;
}

export function AffiliateNetworkModal({ open, onOpenChange, onNetworkAdded, network }: AffiliateNetworkModalProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    network: '',
    display_name: '',
    tracking_url_template: '',
    encoding_rules: '{"deeplink": "url_encode"}'
  });

  const isEditing = !!network;

  useEffect(() => {
    if (network) {
      setFormData({
        network: network.network,
        display_name: network.display_name || '',
        tracking_url_template: network.tracking_url_template,
        encoding_rules: JSON.stringify(network.encoding_rules, null, 2)
      });
    } else {
      setFormData({
        network: '',
        display_name: '',
        tracking_url_template: '',
        encoding_rules: '{"deeplink": "url_encode"}'
      });
    }
  }, [network]);

  const handleSubmit = async () => {
    if (!formData.network || !formData.tracking_url_template) {
      toast({
        title: "Missing Fields",
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      return;
    }

    let encodingRules;
    try {
      encodingRules = JSON.parse(formData.encoding_rules);
    } catch (error) {
      toast({
        title: "Invalid JSON",
        description: "Encoding rules must be valid JSON.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        network: formData.network,
        display_name: formData.display_name || null,
        tracking_url_template: formData.tracking_url_template,
        encoding_rules: encodingRules
      };

      let query;
      if (isEditing) {
        query = supabase
          .from('affiliate_networks')
          .update(payload)
          .eq('id', network!.id);
      } else {
        query = supabase
          .from('affiliate_networks')
          .insert(payload);
      }

      const { error } = await query;

      if (error) throw error;

      toast({
        title: isEditing ? "Network Updated" : "Network Added",
        description: `Affiliate network has been ${isEditing ? 'updated' : 'created'} successfully.`,
      });

      onOpenChange(false);
      onNetworkAdded?.();
    } catch (error) {
      console.error('Error saving network:', error);
      toast({
        title: "Error",
        description: `Failed to ${isEditing ? 'update' : 'add'} network. Please try again.`,
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
            {isEditing ? <Edit className="mr-2 h-5 w-5" /> : <Plus className="mr-2 h-5 w-5" />}
            {isEditing ? 'Edit Affiliate Network' : 'Add New Affiliate Network'}
          </DialogTitle>
          <DialogDescription>
            {isEditing ? 'Update the affiliate network configuration' : 'Configure a new affiliate network for tracking'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="network">Network ID *</Label>
            <Input
              id="network"
              value={formData.network}
              onChange={(e) => setFormData(prev => ({ ...prev, network: e.target.value }))}
              placeholder="e.g., awin, cj, impact"
              disabled={isEditing}
            />
            {isEditing && (
              <p className="text-sm text-muted-foreground mt-1">Network ID cannot be changed after creation</p>
            )}
          </div>

          <div>
            <Label htmlFor="display_name">Display Name</Label>
            <Input
              id="display_name"
              value={formData.display_name}
              onChange={(e) => setFormData(prev => ({ ...prev, display_name: e.target.value }))}
              placeholder="e.g., Awin, Commission Junction"
            />
          </div>

          <div>
            <Label htmlFor="tracking_url_template">Tracking URL Template *</Label>
            <Textarea
              id="tracking_url_template"
              value={formData.tracking_url_template}
              onChange={(e) => setFormData(prev => ({ ...prev, tracking_url_template: e.target.value }))}
              placeholder="https://example.com/track?program={PROGRAM_ID}&affiliate={AFFILIATE_ID}&user={USER_ID}&click={CLICK_ID}&url={DEEPLINK}"
              rows={3}
            />
            <p className="text-sm text-muted-foreground mt-1">
              Use placeholders: {`{PROGRAM_ID}, {AFFILIATE_ID}, {USER_ID}, {CLICK_ID}, {DEEPLINK}, {OFFER_ID}`}
            </p>
          </div>

          <div>
            <Label htmlFor="encoding_rules">Encoding Rules (JSON)</Label>
            <Textarea
              id="encoding_rules"
              value={formData.encoding_rules}
              onChange={(e) => setFormData(prev => ({ ...prev, encoding_rules: e.target.value }))}
              placeholder='{"deeplink": "url_encode"}'
              rows={4}
            />
            <p className="text-sm text-muted-foreground mt-1">
              Specify how to encode parameters. Common: deeplink: "url_encode" or "none"
            </p>
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
            {isSubmitting ? (isEditing ? 'Updating...' : 'Adding...') : (isEditing ? 'Update Network' : 'Add Network')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}