import { supabase } from '@/integrations/supabase/client';

export interface GiftCardRedemption {
  giftCardId: string;
  bonkPrice: number;
  userId: string;
}

export class GiftCardService {
  /**
   * Securely redeem a gift card using a backend function
   * This prevents race conditions and ensures atomic operations
   */
  static async redeemGiftCard({ giftCardId, bonkPrice, userId }: GiftCardRedemption) {
    try {
      const { data, error } = await supabase.rpc('redeem_gift_card_secure', {
        _gift_card_id: giftCardId,
        _bonk_amount: bonkPrice
      });

      if (error) {
        throw error;
      }

      return data;
    } catch (error: any) {
      console.error('Gift card redemption error:', error);
      
      // Return structured error response
      return {
        success: false,
        error: error?.message || 'Failed to redeem gift card',
        code: error?.code || 'REDEMPTION_FAILED'
      };
    }
  }

  /**
   * Check if user has sufficient balance and meets anti-abuse requirements for redemption
   */
  static async checkRedemptionEligibility(userId: string, bonkPrice: number) {
    try {
      const { data, error } = await supabase.rpc('check_gift_card_redemption_eligibility', {
        _user_id: userId,
        _bonk_amount: bonkPrice
      });

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error checking redemption eligibility:', error);
      return {
        eligible: false,
        reason: 'check_failed',
        message: 'Failed to check eligibility',
        error: 'Failed to check eligibility'
      };
    }
  }

  /**
   * Get user's gift card redemption history
   */
  static async getRedemptionHistory(userId: string) {
    try {
      const { data, error } = await supabase
        .from('gift_card_redemptions')
        .select(`
          *,
          gift_card:gift_cards!gift_card_redemptions_gift_card_id_fkey(
            title,
            brand_name,
            fiat_value,
            currency
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      return {
        success: true,
        redemptions: data || []
      };
    } catch (error) {
      console.error('Error fetching redemption history:', error);
      return {
        success: false,
        redemptions: [],
        error: 'Failed to load redemption history'
      };
    }
  }
}