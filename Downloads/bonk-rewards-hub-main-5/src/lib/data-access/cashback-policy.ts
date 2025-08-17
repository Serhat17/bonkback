import { supabase } from '@/integrations/supabase/client';

export interface CashbackPolicy {
  id: boolean;
  immediate_release_percent: number;
  deferred_release_delay_days: number;
  updated_at: string;
}

export async function getCashbackPolicy() {
  const { data, error } = await supabase
    .from('cashback_policy')
    .select('*')
    .eq('id', true)
    .single();
  
  if (error) {
    // If no policy exists, return defaults
    if (error.code === 'PGRST116') {
      return {
        id: true,
        immediate_release_percent: 0,
        deferred_release_delay_days: 30,
        updated_at: new Date().toISOString()
      };
    }
    throw error;
  }
  
  return data;
}

export async function updateCashbackPolicy(payload: {
  immediate_release_percent: number;
  deferred_release_delay_days: number;
}) {
  const { data, error } = await supabase
    .from('cashback_policy')
    .upsert({ 
      id: true,
      ...payload, 
      updated_at: new Date().toISOString() 
    })
    .select()
    .single();
  
  if (error) throw error;
  return data;
}