import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { useToast } from '@/hooks/use-toast';
import { getCashbackPolicy, updateCashbackPolicy, type CashbackPolicy } from '@/lib/data-access/cashback-policy';
import { Loader2, Save } from 'lucide-react';

export function CashbackPolicySettings() {
  const [policy, setPolicy] = useState<CashbackPolicy | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    immediate_release_percent: 0,
    deferred_release_delay_days: 30
  });
  const { toast } = useToast();

  useEffect(() => {
    loadPolicy();
  }, []);

  const loadPolicy = async () => {
    try {
      setLoading(true);
      const policyData = await getCashbackPolicy();
      setPolicy(policyData);
      setFormData({
        immediate_release_percent: policyData.immediate_release_percent,
        deferred_release_delay_days: policyData.deferred_release_delay_days
      });
    } catch (error) {
      console.error('Error loading cashback policy:', error);
      toast({
        title: "Error",
        description: "Failed to load cashback policy settings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      // Validate inputs
      if (formData.immediate_release_percent < 0 || formData.immediate_release_percent > 100) {
        toast({
          title: "Validation Error",
          description: "Immediate release percentage must be between 0 and 100",
          variant: "destructive",
        });
        return;
      }
      
      if (formData.deferred_release_delay_days < 0) {
        toast({
          title: "Validation Error", 
          description: "Deferred release delay must be 0 or greater",
          variant: "destructive",
        });
        return;
      }

      const updatedPolicy = await updateCashbackPolicy(formData);
      setPolicy(updatedPolicy);
      
      toast({
        title: "Success",
        description: "Cashback policy updated successfully",
      });
    } catch (error) {
      console.error('Error updating cashback policy:', error);
      toast({
        title: "Error",
        description: "Failed to update cashback policy",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card className="glass-card">
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-2">Loading policy settings...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle>Cashback Release Policy</CardTitle>
        <CardDescription>
          Configure when cashback becomes available for withdrawal
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="immediate-percent">
            Immediate Release Percentage ({formData.immediate_release_percent}%)
          </Label>
          <Slider
            id="immediate-percent"
            min={0}
            max={100}
            step={5}
            value={[formData.immediate_release_percent]}
            onValueChange={(value) => 
              setFormData(prev => ({ ...prev, immediate_release_percent: value[0] }))
            }
            className="w-full"
          />
          <p className="text-sm text-muted-foreground">
            Percentage of cashback released immediately after return period ends
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="deferred-delay">
            Deferred Release Delay (days)
          </Label>
          <Input
            id="deferred-delay"
            type="number"
            min="0"
            value={formData.deferred_release_delay_days}
            onChange={(e) => 
              setFormData(prev => ({ 
                ...prev, 
                deferred_release_delay_days: parseInt(e.target.value) || 0 
              }))
            }
            placeholder="30"
          />
          <p className="text-sm text-muted-foreground">
            Days after return period when remaining cashback becomes available
          </p>
        </div>

        <div className="bg-muted/50 p-4 rounded-lg">
          <h4 className="font-semibold mb-2">Current Policy Summary</h4>
          <ul className="text-sm space-y-1 text-muted-foreground">
            <li>• {formData.immediate_release_percent}% released immediately after return period</li>
            <li>• {100 - formData.immediate_release_percent}% released {formData.deferred_release_delay_days} days later</li>
            <li>• Returns/chargebacks block all releases</li>
          </ul>
        </div>

        <Button 
          onClick={handleSave} 
          disabled={saving}
          className="w-full"
        >
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Policy
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}