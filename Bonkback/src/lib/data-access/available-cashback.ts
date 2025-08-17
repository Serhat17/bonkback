import { supabase } from '@/integrations/supabase/client';

export interface AvailableCashback {
  id: string;
  user_id: string;
  offer_id: string;
  purchase_amount: number;
  cashback_amount: number;
  bonk_amount: number;
  total_cashback: number;
  status: string;
  purchase_date: string;
  return_window_ends_at: string;
  available_from_immediate: string;
  available_from_deferred: string;
  immediate_amount: number;
  deferred_amount: number;
  is_returned: boolean;
  available_amount: number;
  created_at: string;
  updated_at: string;
}

export async function getUserAvailableCashback(userId?: string) {
  // If no userId provided, use the secure function that automatically gets current user's data
  const { data, error } = userId 
    ? await supabase.rpc('get_available_cashback', { target_user_id: userId })
    : await supabase.rpc('get_my_available_cashback');
  
  if (error) throw error;
  return data as AvailableCashback[];
}

export async function getTotalAvailableBalance(userId?: string) {
  // If no userId provided, use the secure function that automatically gets current user's data
  const { data, error } = userId 
    ? await supabase.rpc('get_available_cashback', { target_user_id: userId })
    : await supabase.rpc('get_my_available_cashback');
  
  if (error) throw error;
  
  return data?.reduce((total, row) => total + (row.available_amount || 0), 0) || 0;
}

export async function validatePayoutAmount(userId?: string, requestedAmount?: number) {
  const totalAvailable = await getTotalAvailableBalance(userId);
  
  return {
    isValid: (requestedAmount || 0) <= totalAvailable,
    availableAmount: totalAvailable,
    requestedAmount: requestedAmount || 0
  };
}