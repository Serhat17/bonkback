import { create } from 'zustand';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { getBaseDomain, buildAuthRedirectUrl } from '@/lib/domain';

interface Profile {
  id: string;
  user_id: string;
  email: string | null;
  full_name: string | null;
  role: 'user' | 'admin';
  bonk_balance: number;
  total_earned: number;
  wallet_address: string | null;
  referral_code: string | null;
  referred_by: string | null;
  created_at: string;
  updated_at: string;
}

interface AuthState {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isLoading: boolean;
  
  // Actions
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, fullName?: string, manualReferralCode?: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  fetchProfile: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<{ error: any }>;
  initialize: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  profile: null,
  isLoading: true,

  signIn: async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (!error) {
      await get().fetchProfile();
    }
    
    return { error };
  },

  signUp: async (email: string, password: string, fullName?: string, manualReferralCode?: string) => {
    try {
      const baseDomain = await getBaseDomain(supabase);
      
      // Use manual referral code if provided, otherwise get from localStorage
      const referralCode = manualReferralCode?.trim() || localStorage.getItem('referral_code');
      
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${baseDomain}/auth/callback`,
          data: {
            full_name: fullName || email,
            referral_code: referralCode, // Pass referral code to metadata
          },
        },
      });
      
      // Log signup attempt for debugging
      if (error) {
        try {
          await supabase.from('error_logs').insert({
            error_message: `Signup failed: ${error.message}`,
            component: 'AuthStore.signUp',
            severity: 'error',
            additional_data: {
              email,
              redirect_url: `${await getBaseDomain(supabase)}/auth/callback`,
              error_code: error.status
            }
          });
        } catch (logError) {
          console.warn('Failed to log signup error:', logError);
        }
      } else {
        console.log('Signup successful, redirect URL:', `${await getBaseDomain(supabase)}/auth/callback`);
      }
      
      return { error };
    } catch (error) {
      console.error('Unexpected signup error:', error);
      return { error: error instanceof Error ? error : new Error('Unexpected signup error') };
    }
  },

  signOut: async () => {
    try {
      // Clear local storage and session storage
      localStorage.removeItem('supabase.auth.token');
      localStorage.removeItem('sb-lnachtwjumapjmabrrrp-auth-token');
      sessionStorage.clear();
      
      // Clear PWA cached data if available
      if ('serviceWorker' in navigator && 'caches' in window) {
        try {
          const cacheNames = await caches.keys();
          await Promise.all(
            cacheNames.map(cacheName => {
              if (cacheName.includes('bonkback') || cacheName.includes('user-data')) {
                return caches.delete(cacheName);
              }
            })
          );
        } catch (cacheError) {
          console.warn('Could not clear PWA caches:', cacheError);
        }
      }
      
      // Clear any extension storage if in extension context
      if (typeof window !== 'undefined' && (window as any).chrome && (window as any).chrome.storage) {
        try {
          await (window as any).chrome.storage.local.clear();
          await (window as any).chrome.storage.session.clear();
        } catch (extensionError) {
          console.warn('Could not clear extension storage:', extensionError);
        }
      }
      
      // Sign out from Supabase
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('Logout error:', error);
        toast({
          title: "Logout Error",
          description: "There was an issue signing you out. Please try again.",
          variant: "destructive",
        });
        return;
      }

      // Clear all auth state
      set({ 
        user: null, 
        session: null, 
        profile: null,
        isLoading: false 
      });

      // Show success message
      toast({
        title: "Logged Out",
        description: "You have been logged out successfully.",
      });

      // Redirect to auth page
      window.location.href = '/auth';
    } catch (error) {
      console.error('Unexpected logout error:', error);
      toast({
        title: "Logout Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    }
  },

  fetchProfile: async () => {
    const { session } = get();
    if (!session?.user) return;

    try {
      const { data: profile, error } = await supabase.rpc('get_my_secure_profile');

      if (error) {
        console.error('Error fetching profile:', error);
        return;
      }

      if (profile?.[0]) {
        const profileData = profile[0];
        const normalized = {
          ...profileData,
          role: (profileData.role === 'admin' ? 'admin' : 'user') as 'user' | 'admin',
        };
        set({ profile: normalized as unknown as Profile });
        console.log('Profile loaded:', normalized);
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error);
    }
  },

  updateProfile: async (updates: Partial<Profile>) => {
    const { session } = get();
    if (!session?.user) return { error: 'Not authenticated' };

    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('user_id', session.user.id);

    if (!error) {
      await get().fetchProfile();
    }

    return { error };
  },

  initialize: () => {
    set({ isLoading: true });

    // Set up auth state listener with enhanced session monitoring
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        set({ session, user: session?.user ?? null });
        
        if (session?.user) {
          setTimeout(() => {
            get().fetchProfile();
          }, 0);
        } else {
          set({ profile: null });
        }

        // Log auth events for security monitoring
        if (import.meta.env.DEV) {
          console.log(`Auth event: ${event}`, {
            timestamp: new Date().toISOString(),
            userId: session?.user?.id,
            sessionExpiry: session?.expires_at ? new Date(session.expires_at * 1000) : null
          });
        }
      }
    );

    // Check for existing session with enhanced validation
    supabase.auth.getSession().then(({ data: { session } }) => {
      // Validate session expiry
      if (session?.expires_at) {
        const expiresAt = new Date(session.expires_at * 1000);
        const now = new Date();
        
        if (expiresAt <= now) {
          console.warn('Session expired, clearing auth state');
          set({ session: null, user: null, profile: null, isLoading: false });
          return;
        }
      }

      set({ 
        session, 
        user: session?.user ?? null,
        isLoading: false 
      });

      if (session?.user) {
        get().fetchProfile();
      }
    });

    // Cleanup function will be handled by the component
    return () => subscription.unsubscribe();
  },
}));