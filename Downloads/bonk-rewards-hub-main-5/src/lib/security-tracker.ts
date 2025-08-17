// Enhanced security tracking and monitoring system
import { supabase } from '@/integrations/supabase/client';
import { errorTracker } from './error-tracking';

interface SecurityEvent {
  event_type: string;
  user_id?: string;
  ip_address?: string;
  user_agent?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  metadata?: Record<string, any>;
  blocked?: boolean;
}

interface SecurityScanResult {
  passed: boolean;
  issues: SecurityIssue[];
  score: number;
  timestamp: string;
}

interface SecurityIssue {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  fix_suggestion: string;
}

class SecurityTracker {
  private static instance: SecurityTracker;
  private checkInterval: number | null = null;

  static getInstance(): SecurityTracker {
    if (!SecurityTracker.instance) {
      SecurityTracker.instance = new SecurityTracker();
    }
    return SecurityTracker.instance;
  }

  async logSecurityEvent(event: SecurityEvent): Promise<void> {
    try {
      // Log to auth_audit_log table
      await supabase.from('auth_audit_log').insert({
        user_id: event.user_id,
        event_type: event.event_type,
        ip_address: event.ip_address,
        user_agent: event.user_agent,
        success: !event.blocked,
        error_message: event.blocked ? event.description : null,
        metadata: {
          severity: event.severity,
          description: event.description,
          ...event.metadata
        }
      });

      // Log critical events to error tracking as well
      if (event.severity === 'critical' || event.severity === 'high') {
        errorTracker.logError(
          `Security Event: ${event.description}`,
          event.severity === 'critical' ? 'critical' : 'high',
          {
            event_type: event.event_type,
            user_id: event.user_id,
            ip_address: event.ip_address,
            blocked: event.blocked,
            ...event.metadata
          }
        );
      }
    } catch (error) {
      console.error('Failed to log security event:', error);
    }
  }

  async getSecurityEvents(filters?: {
    startDate?: string;
    endDate?: string;
    severity?: string;
    eventType?: string;
    userId?: string;
    limit?: number;
  }): Promise<any[]> {
    try {
      let query = supabase
        .from('auth_audit_log')
        .select('*')
        .order('created_at', { ascending: false });

      if (filters?.startDate) {
        query = query.gte('created_at', filters.startDate);
      }
      if (filters?.endDate) {
        query = query.lte('created_at', filters.endDate);
      }
      if (filters?.eventType) {
        query = query.eq('event_type', filters.eventType);
      }
      if (filters?.userId) {
        query = query.eq('user_id', filters.userId);
      }
      if (filters?.severity) {
        query = query.eq('metadata->>severity', filters.severity);
      }

      query = query.limit(filters?.limit || 100);

      const { data, error } = await query;
      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Failed to fetch security events:', error);
      return [];
    }
  }

  async runSecurityScan(): Promise<SecurityScanResult> {
    try {
      // Use the edge function for comprehensive security scanning
      const { data, error } = await supabase.functions.invoke('security-scan');
      
      if (error) {
        throw new Error(`Security scan failed: ${error.message}`);
      }

      return data as SecurityScanResult;
    } catch (error) {
      console.error('Security scan failed:', error);
      return {
        passed: false,
        issues: [{
          type: 'scan_error',
          severity: 'high',
          description: 'Security scan failed to complete',
          fix_suggestion: 'Check system logs and retry scan'
        }],
        score: 0,
        timestamp: new Date().toISOString()
      };
    }
  }

  private async checkSuspiciousLoginPatterns(): Promise<SecurityIssue[]> {
    const issues: SecurityIssue[] = [];
    
    try {
      // Check for multiple failed logins from same IP in last hour
      const { data } = await supabase
        .from('auth_audit_log')
        .select('ip_address, user_id')
        .eq('event_type', 'sign_in_attempt')
        .eq('success', false)
        .gte('created_at', new Date(Date.now() - 3600000).toISOString());

      if (data) {
        const ipCounts = data.reduce((acc, event) => {
          acc[event.ip_address] = (acc[event.ip_address] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        Object.entries(ipCounts).forEach(([ip, count]) => {
          if (count > 10) {
            issues.push({
              type: 'brute_force_attempt',
              severity: 'high',
              description: `${count} failed login attempts from IP ${ip} in the last hour`,
              fix_suggestion: 'Consider implementing IP-based rate limiting and blocking'
            });
          }
        });
      }
    } catch (error) {
      console.error('Error checking suspicious login patterns:', error);
    }

    return issues;
  }

  private async checkFailedLoginAttempts(): Promise<SecurityIssue[]> {
    const issues: SecurityIssue[] = [];
    
    try {
      const { data, count } = await supabase
        .from('auth_audit_log')
        .select('*', { count: 'exact', head: true })
        .eq('event_type', 'sign_in_attempt')
        .eq('success', false)
        .gte('created_at', new Date(Date.now() - 86400000).toISOString());

      if (count && count > 100) {
        issues.push({
          type: 'high_failed_logins',
          severity: 'medium',
          description: `${count} failed login attempts in the last 24 hours`,
          fix_suggestion: 'Monitor for credential stuffing attacks and implement account lockouts'
        });
      }
    } catch (error) {
      console.error('Error checking failed login attempts:', error);
    }

    return issues;
  }

  private async checkMultipleSessions(): Promise<SecurityIssue[]> {
    const issues: SecurityIssue[] = [];
    
    try {
      const { data } = await supabase
        .from('session_timeouts')
        .select('user_id')
        .eq('is_active', true);

      if (data) {
        const userSessions = data.reduce((acc, session) => {
          acc[session.user_id] = (acc[session.user_id] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        Object.entries(userSessions).forEach(([userId, count]) => {
          if (count > 5) {
            issues.push({
              type: 'multiple_sessions',
              severity: 'medium',
              description: `User ${userId} has ${count} active sessions`,
              fix_suggestion: 'Investigate potential account sharing or session hijacking'
            });
          }
        });
      }
    } catch (error) {
      console.error('Error checking multiple sessions:', error);
    }

    return issues;
  }

  private async checkPrivilegeEscalations(): Promise<SecurityIssue[]> {
    const issues: SecurityIssue[] = [];
    
    try {
      const { data } = await supabase
        .from('role_change_audit')
        .select('*')
        .gte('created_at', new Date(Date.now() - 86400000).toISOString());

      if (data && data.length > 0) {
        const adminChanges = data.filter(change => change.new_role === 'admin');
        if (adminChanges.length > 0) {
          issues.push({
            type: 'privilege_escalation',
            severity: 'high',
            description: `${adminChanges.length} admin role changes in the last 24 hours`,
            fix_suggestion: 'Review all admin role assignments and ensure proper authorization'
          });
        }
      }
    } catch (error) {
      console.error('Error checking privilege escalations:', error);
    }

    return issues;
  }

  private async checkUnusualDataAccess(): Promise<SecurityIssue[]> {
    const issues: SecurityIssue[] = [];
    
    try {
      // Check for large data exports or unusual access patterns
      const { data } = await supabase
        .from('auth_audit_log')
        .select('user_id, metadata')
        .contains('metadata', { large_query: true })
        .gte('created_at', new Date(Date.now() - 3600000).toISOString());

      if (data && data.length > 10) {
        issues.push({
          type: 'unusual_data_access',
          severity: 'medium',
          description: 'High volume of large data queries detected',
          fix_suggestion: 'Review query patterns and implement data access monitoring'
        });
      }
    } catch (error) {
      console.error('Error checking unusual data access:', error);
    }

    return issues;
  }

  startAutomaticScans(intervalMinutes: number = 60): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }

    this.checkInterval = window.setInterval(async () => {
      const scanResult = await this.runSecurityScan();
      
      // Log critical issues
      if (scanResult.score < 50) {
        await this.logSecurityEvent({
          event_type: 'security_scan_critical',
          severity: 'critical',
          description: `Security scan failed with score ${scanResult.score}`,
          metadata: {
            issues: scanResult.issues,
            score: scanResult.score
          }
        });
      }
    }, intervalMinutes * 60 * 1000);
  }

  stopAutomaticScans(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }
}

export const securityTracker = SecurityTracker.getInstance();

// Security event helpers
export const logSecurityEvent = {
  login: (userId: string, success: boolean, ip?: string, userAgent?: string) =>
    securityTracker.logSecurityEvent({
      event_type: 'sign_in_attempt',
      user_id: userId,
      ip_address: ip,
      user_agent: userAgent,
      severity: success ? 'low' : 'medium',
      description: success ? 'Successful login' : 'Failed login attempt',
      blocked: !success
    }),

  logout: (userId: string, ip?: string) =>
    securityTracker.logSecurityEvent({
      event_type: 'sign_out',
      user_id: userId,
      ip_address: ip,
      severity: 'low',
      description: 'User logged out'
    }),

  dataAccess: (userId: string, resource: string, large = false) =>
    securityTracker.logSecurityEvent({
      event_type: 'data_access',
      user_id: userId,
      severity: large ? 'medium' : 'low',
      description: `Accessed ${resource}`,
      metadata: { resource, large_query: large }
    }),

  privilegeChange: (targetUserId: string, adminUserId: string, oldRole: string, newRole: string) =>
    securityTracker.logSecurityEvent({
      event_type: 'privilege_change',
      user_id: adminUserId,
      severity: newRole === 'admin' ? 'high' : 'medium',
      description: `Changed user ${targetUserId} role from ${oldRole} to ${newRole}`,
      metadata: { target_user_id: targetUserId, old_role: oldRole, new_role: newRole }
    }),

  suspiciousActivity: (userId: string, activity: string, details?: any) =>
    securityTracker.logSecurityEvent({
      event_type: 'suspicious_activity',
      user_id: userId,
      severity: 'high',
      description: activity,
      metadata: details
    })
};