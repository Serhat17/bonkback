import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit } from 'lucide-react';

interface SystemConfig {
  key: string;
  value: any;
  description: string | null;
}

interface SystemConfigModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfigAdded?: () => void;
  config?: SystemConfig | null;
}

export function SystemConfigModal({ open, onOpenChange, onConfigAdded, config }: SystemConfigModalProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    key: '',
    value: '',
    description: ''
  });

  const isEditing = !!config;

  useEffect(() => {
    if (config) {
      setFormData({
        key: config.key,
        value: typeof config.value === 'object' ? JSON.stringify(config.value, null, 2) : String(config.value),
        description: config.description || ''
      });
    } else {
      setFormData({
        key: '',
        value: '',
        description: ''
      });
    }
  }, [config]);

  const handleSubmit = async () => {
    if (!formData.key || !formData.value) {
      toast({
        title: "Missing Fields",
        description: "Please fill in key and value fields.",
        variant: "destructive"
      });
      return;
    }

    let parsedValue;
    try {
      // Try to parse as JSON, fall back to string
      parsedValue = JSON.parse(formData.value);
    } catch {
      parsedValue = formData.value;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        key: formData.key,
        value: parsedValue,
        description: formData.description || null
      };

      let query;
      if (isEditing) {
        query = supabase
          .from('system_config')
          .update(payload)
          .eq('key', config!.key);
      } else {
        query = supabase
          .from('system_config')
          .insert(payload);
      }

      const { error } = await query;

      if (error) throw error;

      toast({
        title: isEditing ? "Config Updated" : "Config Added",
        description: `Configuration has been ${isEditing ? 'updated' : 'created'} successfully.`,
      });

      onOpenChange(false);
      onConfigAdded?.();
    } catch (error) {
      console.error('Error saving config:', error);
      toast({
        title: "Error",
        description: `Failed to ${isEditing ? 'update' : 'add'} configuration. Please try again.`,
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
            {isEditing ? 'Edit Configuration' : 'Add New Configuration'}
          </DialogTitle>
          <DialogDescription>
            {isEditing ? 'Update the system configuration value' : 'Create a new system configuration entry'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="key">Configuration Key *</Label>
            <Input
              id="key"
              value={formData.key}
              onChange={(e) => setFormData(prev => ({ ...prev, key: e.target.value }))}
              placeholder="e.g., bonk_price, platform_fee_percentage"
              disabled={isEditing}
            />
            {isEditing && (
              <p className="text-sm text-muted-foreground mt-1">Configuration key cannot be changed after creation</p>
            )}
          </div>

          <div>
            <Label htmlFor="value">Value *</Label>
            <Textarea
              id="value"
              value={formData.value}
              onChange={(e) => setFormData(prev => ({ ...prev, value: e.target.value }))}
              placeholder='Enter value (string, number, or JSON object)'
              rows={4}
            />
            <p className="text-sm text-muted-foreground mt-1">
              Can be a string, number, boolean, or JSON object. Will be parsed automatically.
            </p>
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Describe what this configuration controls"
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
            {isSubmitting ? (isEditing ? 'Updating...' : 'Adding...') : (isEditing ? 'Update Config' : 'Add Config')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}