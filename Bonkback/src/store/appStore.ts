import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';

interface CashbackOffer {
  id: string;
  title: string;
  description: string | null;
  merchant_name: string;
  merchant_logo_url: string | null;
  cashback_percentage: number;
  max_cashback: number | null;
  status: 'active' | 'inactive' | 'expired';
  valid_from: string;
  valid_until: string | null;
  terms_conditions: string | null;
  category: string | null;
  featured: boolean;
  deeplink: string | null;
  affiliate_network: string | null;
  created_at: string;
  updated_at: string;
}

interface GiftCard {
  id: string;
  title: string;
  description: string | null;
  brand_name: string;
  brand_logo_url: string | null;
  bonk_price: number;
  fiat_value: number;
  currency: string;
  available_quantity: number;
  status: 'active' | 'inactive' | 'expired';
  terms_conditions: string | null;
  created_at: string;
  updated_at: string;
}

interface SystemSettings {
  bonkPriceUsd: number;
  platformFeePercentage: number;
  minCashbackThreshold: number;
  lastUpdated: string;
}

interface AppState {
  // Data
  offers: CashbackOffer[];
  featuredOffers: CashbackOffer[];
  giftCards: GiftCard[];
  systemSettings: SystemSettings | null;
  
  // UI State
  isLoading: boolean;
  selectedCategory: string | null;
  
  // Actions
  fetchOffers: () => Promise<void>;
  fetchGiftCards: () => Promise<void>;
  fetchSystemSettings: () => Promise<void>;
  setSelectedCategory: (category: string | null) => void;
  initialize: () => Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => ({
  offers: [],
  featuredOffers: [],
  giftCards: [],
  systemSettings: null,
  isLoading: false,
  selectedCategory: null,

  fetchOffers: async () => {
    try {
      const { data: offers, error } = await supabase
        .from('cashback_offers')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (!error && offers) {
        const featured = offers.filter(offer => offer.featured);
        set({ offers, featuredOffers: featured });
      }
    } catch (error) {
      console.error('Error fetching offers:', error);
    }
  },

  fetchGiftCards: async () => {
    try {
      const { data: giftCards, error } = await supabase
        .from('gift_cards')
        .select('*')
        .eq('status', 'active')
        .order('fiat_value', { ascending: true });

      if (!error && giftCards) {
        set({ giftCards });
      }
    } catch (error) {
      console.error('Error fetching gift cards:', error);
    }
  },

  fetchSystemSettings: async () => {
    try {
      const { data: settings, error } = await supabase
        .from('system_settings')
        .select('*')
        .in('key', ['bonk_price_usd', 'platform_fee_percentage', 'min_cashback_threshold']);

      if (!error && settings) {
        const systemSettings: SystemSettings = {
          bonkPriceUsd: 0.000015,
          platformFeePercentage: 2.5,
          minCashbackThreshold: 10,
          lastUpdated: new Date().toISOString(),
        };

        settings.forEach((setting) => {
          const value = setting.value as any;
          switch (setting.key) {
            case 'bonk_price_usd':
              systemSettings.bonkPriceUsd = value.price || 0.000015;
              systemSettings.lastUpdated = value.last_updated || new Date().toISOString();
              break;
            case 'platform_fee_percentage':
              systemSettings.platformFeePercentage = value.percentage || 2.5;
              break;
            case 'min_cashback_threshold':
              systemSettings.minCashbackThreshold = value.amount || 10;
              break;
          }
        });

        set({ systemSettings });
      }
    } catch (error) {
      console.error('Error fetching system settings:', error);
    }
  },

  setSelectedCategory: (category: string | null) => {
    set({ selectedCategory: category });
  },

  initialize: async () => {
    set({ isLoading: true });
    await Promise.all([
      get().fetchOffers(),
      get().fetchGiftCards(),
      get().fetchSystemSettings(),
    ]);
    set({ isLoading: false });
  },
}));