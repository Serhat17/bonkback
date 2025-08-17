import React, { useEffect } from 'react';
import { useSessionManager } from '@/hooks/useSessionManager';
import { useAuthStore } from '@/store/authStore';
import { SecureStorage } from '@/lib/secure-storage';

interface AuthSecurityProviderProps {
  children: React.ReactNode;
}

export const AuthSecurityProvider: React.FC<AuthSecurityProviderProps> = ({ children }) => {
  const { user, session } = useAuthStore();
  const { updateLastActivity } = useSessionManager({
    sessionTimeoutMinutes: 120, // 2 hours
    warningBeforeTimeoutMinutes: 10,
    refreshThresholdMinutes: 30,
    enabled: !!user
  });

  // Update activity on user interactions
  useEffect(() => {
    if (!user) return;

    const handleActivity = () => {
      updateLastActivity();
    };

    // Track various user activities
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    events.forEach(event => {
      document.addEventListener(event, handleActivity, { passive: true });
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
    };
  }, [user, updateLastActivity]);

  // Clear secure storage on logout
  useEffect(() => {
    if (!session && !user) {
      SecureStorage.clearAllSecureTokens().catch(console.error);
    }
  }, [session, user]);

  return <>{children}</>;
};