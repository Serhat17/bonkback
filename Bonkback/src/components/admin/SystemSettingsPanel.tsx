import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Save, DollarSign, Percent, Settings, RefreshCw } from 'lucide-react';

interface SystemSetting {
  id: string;
  key: string;
  value: any;
  description: string;
}

const DEFAULT_SETTINGS = [
  {
    key: 'bonk_price_usd',
    value: 0.000015,
    description: 'Current BONK price in USD'
  },
  {
    key: 'platform_fee_percentage',
    value: 2.5,
    description: 'Platform transaction fee percentage'
  },
  {
    key: 'referral_reward_amount',
    value: 333333,
    description: 'BONK reward amount for successful referrals'
  },
  {
    key: 'minimum_payout_amount',
    value: 15.0,
    description: 'Minimum payout amount in EUR'
  },
  {
    key: 'payout_rate_limit_minutes',
    value: 10,
    description: 'Minutes between allowed payouts per user'
  },
  {
    key: 'referral_unlock_threshold',
    value: 666666,
    description: 'BONK amount required to unlock referral rewards'
  }
];

export function SystemSettingsPanel() {
  const [settings, setSettings] = useState<SystemSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editedValues, setEditedValues] = useState<Record<string, any>>({});
  const { toast } = useToast();

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .order('key');

      if (error) throw error;

      // Merge with default settings for any missing keys
      const existingKeys = new Set(data?.map(s => s.key) || []);
      const allSettings = [
        ...(data || []),
        ...DEFAULT_SETTINGS
          .filter(defaultSetting => !existingKeys.has(defaultSetting.key))
          .map(defaultSetting => ({
            id: `default-${defaultSetting.key}`,
            ...defaultSetting
          }))
      ];

      setSettings(allSettings);
      
      // Initialize edited values with current values
      const initialValues: Record<string, any> = {};
      allSettings.forEach(setting => {
        initialValues[setting.key] = setting.value;
      });
      setEditedValues(initialValues);
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast({
        title: "Error",
        description: "Failed to fetch system settings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const saveSetting = async (key: string, value: any) => {
    try {
      const { error } = await supabase
        .from('system_settings')
        .upsert({
          key,
          value,
          description: settings.find(s => s.key === key)?.description || '',
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      return true;
    } catch (error) {
      console.error(`Error saving setting ${key}:`, error);
      return false;
    }
  };

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      const savePromises = Object.entries(editedValues).map(([key, value]) =>
        saveSetting(key, value)
      );

      const results = await Promise.all(savePromises);
      const allSuccessful = results.every(result => result);

      if (allSuccessful) {
        toast({
          title: "Success",
          description: "All settings saved successfully",
        });
        fetchSettings(); // Refresh to get latest data
      } else {
        toast({
          title: "Partial Success",
          description: "Some settings may not have been saved correctly",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: "Error",
        description: "Failed to save settings",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleValueChange = (key: string, value: any) => {
    setEditedValues(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const getInputType = (key: string) => {
    if (key.includes('percentage') || key.includes('price') || key.includes('amount') || key.includes('threshold')) {
      return 'number';
    }
    if (key.includes('minutes')) {
      return 'number';
    }
    return 'text';
  };

  const formatDisplayValue = (key: string, value: any) => {
    if (key.includes('price')) {
      return `$${Number(value).toFixed(8)}`;
    }
    if (key.includes('percentage')) {
      return `${value}%`;
    }
    if (key.includes('amount') || key.includes('threshold')) {
      return `${Number(value).toLocaleString()} BONK`;
    }
    if (key.includes('minutes')) {
      return `${value} minutes`;
    }
    return value.toString();
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  if (loading) {
    return (
      <Card className="glass-card">
        <CardContent className="pt-6">
          <div className="text-center">Loading system settings...</div>
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
              <CardTitle className="flex items-center space-x-2">
                <Settings className="h-5 w-5" />
                <span>System Settings</span>
              </CardTitle>
              <p className="text-muted-foreground">Configure platform parameters and pricing</p>
            </div>
            <div className="flex space-x-2">
              <Button variant="outline" onClick={fetchSettings} disabled={saving}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
              <Button onClick={handleSaveAll} disabled={saving} className="btn-primary">
                <Save className="mr-2 h-4 w-4" />
                {saving ? 'Saving...' : 'Save All'}
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {settings.map((setting) => (
              <Card key={setting.key}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg capitalize">
                      {setting.key.replace(/_/g, ' ')}
                    </CardTitle>
                    <div className="text-sm text-muted-foreground">
                      {formatDisplayValue(setting.key, setting.value)}
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {setting.description}
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Label htmlFor={setting.key}>
                      New Value
                    </Label>
                    <Input
                      id={setting.key}
                      type={getInputType(setting.key)}
                      step={setting.key.includes('price') ? '0.000001' : '0.01'}
                      value={editedValues[setting.key] || ''}
                      onChange={(e) => {
                        const value = getInputType(setting.key) === 'number' 
                          ? (parseFloat(e.target.value) || 0)
                          : e.target.value;
                        handleValueChange(setting.key, value);
                      }}
                      placeholder={`Enter ${setting.key.replace(/_/g, ' ')}`}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          
          <div className="mt-8 p-4 bg-muted/20 rounded-lg">
            <h3 className="font-semibold mb-2 flex items-center space-x-2">
              <DollarSign className="h-5 w-5 text-primary" />
              <span>Quick Calculator</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
              <div className="text-muted-foreground">Current BONK Price</div>
              <div className="font-mono">
                ${Number(editedValues['bonk_price_usd'] || 0).toFixed(8)}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">€5 in BONK</div>
              <div className="font-mono">
                {Math.round(5 / Number(editedValues['bonk_price_usd'] || 0.000015)).toLocaleString()} BONK
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">€10 in BONK</div>
              <div className="font-mono">
                {Math.round(10 / Number(editedValues['bonk_price_usd'] || 0.000015)).toLocaleString()} BONK
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}