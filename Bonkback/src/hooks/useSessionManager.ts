import { useEffect, useCallback, useRef } from 'react';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface SessionManagerConfig {
  sessionTimeoutMinutes?: number;
  warningBeforeTimeoutMinutes?: number;
  refreshThresholdMinutes?: number;
  enabled?: boolean;
}

const DEFAULT_CONFIG: Required<SessionManagerConfig> = {
  sessionTimeoutMinutes: 120, // 2 hours
  warningBeforeTimeoutMinutes: 10, // Warn 10 minutes before timeout
  refreshThresholdMinutes: 30, // Refresh if expires within 30 minutes
  enabled: true,
};

export const useSessionManager = (config: SessionManagerConfig = {}) => {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  const { session, user, signOut } = useAuthStore();
  
  const timeoutRef = useRef<NodeJS.Timeout>();
  const warningRef = useRef<NodeJS.Timeout>();
  const refreshRef = useRef<NodeJS.Timeout>();
  const lastActivityRef = useRef<number>(Date.now());

  const clearAllTimers = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (warningRef.current) clearTimeout(warningRef.current);
    if (refreshRef.current) clearTimeout(refreshRef.current);
  }, []);

  const updateLastActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
  }, []);

  const refreshSession = useCallback(async () => {
    try {
      const { data, error } = await supabase.auth.refreshSession();
      if (error) {
        console.error('Session refresh failed:', error);
        toast({
          title: "Session Expired",
          description: "Please sign in again to continue.",
          variant: "destructive",
        });
        await signOut();
      } else if (data.session) {
        console.log('Session refreshed successfully');
      }
    } catch (error) {
      console.error('Session refresh error:', error);
      await signOut();
    }
  }, [signOut]);

  const checkSessionExpiry = useCallback(async () => {
    if (!session?.expires_at) return;

    const expiresAt = new Date(session.expires_at * 1000);
    const now = new Date();
    const timeUntilExpiry = expiresAt.getTime() - now.getTime();
    const minutesUntilExpiry = timeUntilExpiry / (1000 * 60);

    // If session expires within refresh threshold, refresh it
    if (minutesUntilExpiry <= finalConfig.refreshThresholdMinutes && minutesUntilExpiry > 0) {
      await refreshSession();
    }
    // If session is already expired, sign out
    else if (minutesUntilExpiry <= 0) {
      toast({
        title: "Session Expired",
        description: "Your session has expired. Please sign in again.",
        variant: "destructive",
      });
      await signOut();
    }
  }, [session, refreshSession, signOut, finalConfig.refreshThresholdMinutes]);

  const scheduleSessionCheck = useCallback(() => {
    if (!finalConfig.enabled || !session?.expires_at) return;

    const expiresAt = new Date(session.expires_at * 1000);
    const now = new Date();
    const timeUntilExpiry = expiresAt.getTime() - now.getTime();
    const timeUntilWarning = timeUntilExpiry - (finalConfig.warningBeforeTimeoutMinutes * 60 * 1000);

    // Schedule warning
    if (timeUntilWarning > 0) {
      warningRef.current = setTimeout(() => {
        toast({
          title: "Session Expiring Soon",
          description: `Your session will expire in ${finalConfig.warningBeforeTimeoutMinutes} minutes.`,
          variant: "default",
        });
      }, timeUntilWarning);
    }

    // Schedule session check
    if (timeUntilExpiry > 0) {
      timeoutRef.current = setTimeout(checkSessionExpiry, timeUntilExpiry + 1000);
    }
  }, [session, finalConfig, checkSessionExpiry]);

  const scheduleActivityTimeout = useCallback(() => {
    if (!finalConfig.enabled || !user) return;

    clearTimeout(timeoutRef.current);
    
    timeoutRef.current = setTimeout(() => {
      const timeSinceLastActivity = Date.now() - lastActivityRef.current;
      const inactivityMinutes = timeSinceLastActivity / (1000 * 60);
      
      if (inactivityMinutes >= finalConfig.sessionTimeoutMinutes) {
        toast({
          title: "Session Timed Out",
          description: "You've been inactive for too long. Please sign in again.",
          variant: "destructive",
        });
        signOut();
      } else {
        // Reschedule if user became active
        scheduleActivityTimeout();
      }
    }, finalConfig.sessionTimeoutMinutes * 60 * 1000);
  }, [user, finalConfig, signOut]);

  // Set up activity listeners
  useEffect(() => {
    if (!finalConfig.enabled) return;

    const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    const handleActivity = () => {
      updateLastActivity();
    };

    activityEvents.forEach(event => {
      document.addEventListener(event, handleActivity, { passive: true });
    });

    return () => {
      activityEvents.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
    };
  }, [finalConfig.enabled, updateLastActivity]);

  // Main session management effect
  useEffect(() => {
    if (!finalConfig.enabled) {
      clearAllTimers();
      return;
    }

    if (session && user) {
      // Update activity timestamp when session changes
      updateLastActivity();
      
      // Schedule session expiry checks
      scheduleSessionCheck();
      
      // Schedule activity timeout
      scheduleActivityTimeout();
      
      // Initial session expiry check
      checkSessionExpiry();
    } else {
      clearAllTimers();
    }

    return clearAllTimers;
  }, [session, user, finalConfig.enabled, scheduleSessionCheck, scheduleActivityTimeout, checkSessionExpiry, clearAllTimers, updateLastActivity]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearAllTimers();
    };
  }, [clearAllTimers]);

  return {
    refreshSession,
    updateLastActivity,
    lastActivity: lastActivityRef.current,
    isEnabled: finalConfig.enabled,
  };
};