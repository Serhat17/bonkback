import { useEffect, useCallback } from 'react';
import { useAuthStore } from '@/store/authStore';
import { securityTracker, logSecurityEvent } from '@/lib/security-tracker';
import { useToast } from '@/hooks/use-toast';

interface SecurityMonitoringConfig {
  enableRealTimeScans?: boolean;
  scanIntervalMinutes?: number;
  alertOnCritical?: boolean;
  trackUserActivity?: boolean;
}

export function useSecurityMonitoring(config: SecurityMonitoringConfig = {}) {
  const { user } = useAuthStore();
  const { toast } = useToast();

  const {
    enableRealTimeScans = true,
    scanIntervalMinutes = 60,
    alertOnCritical = true,
    trackUserActivity = true
  } = config;

  // Track user activity for security monitoring
  const trackActivity = useCallback((activity: string, details?: any) => {
    if (!trackUserActivity || !user) return;

    logSecurityEvent.dataAccess(
      user.id,
      activity,
      details?.isLargeQuery || false
    );
  }, [user, trackUserActivity]);

  // Handle security alerts
  const handleSecurityAlert = useCallback((alert: {
    severity: 'low' | 'medium' | 'high' | 'critical';
    message: string;
    details?: any;
  }) => {
    if (!alertOnCritical) return;

    if (alert.severity === 'critical' || alert.severity === 'high') {
      toast({
        title: 'Security Alert',
        description: alert.message,
        variant: 'destructive',
      });

      // Log the alert as a security event
      if (user) {
        logSecurityEvent.suspiciousActivity(
          user.id,
          alert.message,
          alert.details
        );
      }
    }
  }, [alertOnCritical, toast, user]);

  // Monitor for suspicious patterns
  const checkSuspiciousActivity = useCallback(async () => {
    try {
      const scanResult = await securityTracker.runSecurityScan();
      
      // Check for critical issues
      const criticalIssues = scanResult.issues.filter(issue => issue.severity === 'critical');
      const highIssues = scanResult.issues.filter(issue => issue.severity === 'high');

      if (criticalIssues.length > 0) {
        handleSecurityAlert({
          severity: 'critical',
          message: `${criticalIssues.length} critical security issues detected`,
          details: { issues: criticalIssues, score: scanResult.score }
        });
      } else if (highIssues.length > 0) {
        handleSecurityAlert({
          severity: 'high',
          message: `${highIssues.length} high-priority security issues detected`,
          details: { issues: highIssues, score: scanResult.score }
        });
      }

      // Check security score
      if (scanResult.score < 50) {
        handleSecurityAlert({
          severity: 'critical',
          message: `Security score critically low: ${scanResult.score}/100`,
          details: { score: scanResult.score, issues: scanResult.issues }
        });
      } else if (scanResult.score < 70) {
        handleSecurityAlert({
          severity: 'high',
          message: `Security score below threshold: ${scanResult.score}/100`,
          details: { score: scanResult.score }
        });
      }

      return scanResult;
    } catch (error) {
      console.error('Security monitoring failed:', error);
      handleSecurityAlert({
        severity: 'high',
        message: 'Security monitoring system failure',
        details: { error: error instanceof Error ? error.message : 'Unknown error' }
      });
      return null;
    }
  }, [handleSecurityAlert]);

  // Track page navigation for security audit
  const trackPageAccess = useCallback((path: string) => {
    if (!trackUserActivity || !user) return;

    // Track admin page access
    if (path.includes('/admin')) {
      trackActivity('admin_page_access', { path });
    }

    // Track sensitive pages
    const sensitivePaths = ['/transactions', '/users', '/settings'];
    if (sensitivePaths.some(sensitivePath => path.includes(sensitivePath))) {
      trackActivity('sensitive_page_access', { path });
    }
  }, [trackActivity, user]);

  // Monitor data export attempts
  const trackDataExport = useCallback((dataType: string, recordCount: number) => {
    if (!trackUserActivity || !user) return;

    const isLargeExport = recordCount > 100;
    
    trackActivity(`data_export_${dataType}`, {
      recordCount,
      isLargeQuery: isLargeExport
    });

    if (isLargeExport) {
      handleSecurityAlert({
        severity: 'medium',
        message: `Large data export detected: ${recordCount} ${dataType} records`,
        details: { dataType, recordCount }
      });
    }
  }, [trackActivity, handleSecurityAlert, user]);

  // Start/stop automatic security scans
  useEffect(() => {
    if (enableRealTimeScans) {
      securityTracker.startAutomaticScans(scanIntervalMinutes);
      
      return () => {
        securityTracker.stopAutomaticScans();
      };
    }
  }, [enableRealTimeScans, scanIntervalMinutes]);

  // Initial security check
  useEffect(() => {
    if (user && enableRealTimeScans) {
      // Run initial security check after a short delay
      const timer = setTimeout(() => {
        checkSuspiciousActivity();
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [user, enableRealTimeScans, checkSuspiciousActivity]);

  return {
    trackActivity,
    trackPageAccess,
    trackDataExport,
    checkSuspiciousActivity,
    handleSecurityAlert
  };
}

// Hook for admin security monitoring
export function useAdminSecurityMonitoring() {
  const monitoring = useSecurityMonitoring({
    enableRealTimeScans: true,
    scanIntervalMinutes: 30, // More frequent scans for admin
    alertOnCritical: true,
    trackUserActivity: true
  });

  const trackAdminAction = useCallback((action: string, details?: any) => {
    monitoring.trackActivity(`admin_action_${action}`, details);
  }, [monitoring]);

  const trackPrivilegeChange = useCallback((targetUserId: string, oldRole: string, newRole: string) => {
    logSecurityEvent.privilegeChange(targetUserId, '', oldRole, newRole);
    
    // Alert for admin privilege escalations
    if (newRole === 'admin') {
      monitoring.handleSecurityAlert({
        severity: 'high',
        message: `User ${targetUserId} promoted to admin role`,
        details: { targetUserId, oldRole, newRole }
      });
    }
  }, [monitoring]);

  return {
    ...monitoring,
    trackAdminAction,
    trackPrivilegeChange
  };
}