import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useDemoMode = () => {
  const [demoModeEnabled, setDemoModeEnabled] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDemoModeStatus();
  }, []);

  const fetchDemoModeStatus = async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'demo_mode_enabled')
        .single();
      
      if (error) throw error;
      setDemoModeEnabled(data?.value === true);
    } catch (error) {
      console.error('Error fetching demo mode status:', error);
      setDemoModeEnabled(true); // Default to enabled if fetch fails
    } finally {
      setIsLoading(false);
    }
  };

  return { demoModeEnabled, isLoading, refreshDemoMode: fetchDemoModeStatus };
};