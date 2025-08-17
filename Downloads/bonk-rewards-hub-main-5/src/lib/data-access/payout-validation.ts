import { supabase } from '@/integrations/supabase/client';
import { getTotalAvailableBalance, validatePayoutAmount } from './available-cashback';

export interface PayoutValidationResult {
  isValid: boolean;
  availableAmount: number;
  requestedAmount: number;
  error?: string;
}

export async function validatePayoutRequest(
  userId: string, 
  requestedAmount: number
): Promise<PayoutValidationResult> {
  try {
    // Use the comprehensive eligibility check
    const { data: eligibilityRaw, error: eligibilityError } = await supabase
      .rpc('check_payout_eligibility', { _user_id: userId, _amount: requestedAmount });
    
    if (eligibilityError) throw eligibilityError;
    
    const eligibility = eligibilityRaw as { 
      eligible?: boolean; 
      message?: string; 
      available?: number; 
      reason?: string;
      balance_total?: number;
      locked_total?: number;
    };
    
    if (!eligibility?.eligible) {
      return {
        isValid: false,
        availableAmount: eligibility?.available || 0,
        requestedAmount,
        error: eligibility?.message || 'Payout not eligible'
      };
    }

    return {
      isValid: true,
      availableAmount: eligibility?.available || 0,
      requestedAmount
    };
  } catch (error) {
    console.error('Error validating payout request:', error);
    return {
      isValid: false,
      availableAmount: 0,
      requestedAmount,
      error: 'Failed to validate payout request'
    };
  }
}

export async function createPayoutRequest(
  userId: string,
  amount: number,
  walletAddress: string
) {
  // Validate eligibility first  
  const validation = await validatePayoutRequest(userId, amount);
  
  if (!validation.isValid) {
    throw new Error(validation.error);
  }

  // Create the payout request
  const { data, error } = await supabase
    .from('payout_requests')
    .insert({
      user_id: userId,
      amount,
      wallet_address: walletAddress,
      status: 'pending',
      requested_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}