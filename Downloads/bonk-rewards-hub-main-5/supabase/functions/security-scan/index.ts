import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
  details?: any; // Optional details object for additional context
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const issues: SecurityIssue[] = [];
    let score = 100;

    console.log('Starting comprehensive security scan...');

    // 1. Check for suspicious login patterns
    const suspiciousLoginIssues = await checkSuspiciousLoginPatterns(supabaseClient);
    issues.push(...suspiciousLoginIssues);

    // 2. Check for failed login attempts
    const failedLoginIssues = await checkFailedLoginAttempts(supabaseClient);
    issues.push(...failedLoginIssues);

    // 3. Check for multiple active sessions
    const multipleSessionIssues = await checkMultipleSessions(supabaseClient);
    issues.push(...multipleSessionIssues);

    // 4. Check for recent privilege escalations
    const privilegeEscalationIssues = await checkPrivilegeEscalations(supabaseClient);
    issues.push(...privilegeEscalationIssues);

    // 5. Check for unusual data access patterns
    const dataAccessIssues = await checkUnusualDataAccess(supabaseClient);
    issues.push(...dataAccessIssues);

    // 6. Check for weak user accounts
    const weakAccountIssues = await checkWeakAccounts(supabaseClient);
    issues.push(...weakAccountIssues);

    // 7. Check for database security issues
    const databaseIssues = await checkDatabaseSecurity(supabaseClient);
    issues.push(...databaseIssues);

    // 8. Check for suspicious financial activity
    const financialIssues = await checkSuspiciousFinancialActivity(supabaseClient);
    issues.push(...financialIssues);

    // 9. Check for rate limiting violations
    const rateLimitIssues = await checkRateLimitViolations(supabaseClient);
    issues.push(...rateLimitIssues);

    // 10. Check for account security issues
    const accountSecurityIssues = await checkAccountSecurity(supabaseClient);
    issues.push(...accountSecurityIssues);

    // Calculate security score
    issues.forEach(issue => {
      switch (issue.severity) {
        case 'critical':
          score -= 25;
          break;
        case 'high':
          score -= 15;
          break;
        case 'medium':
          score -= 10;
          break;
        case 'low':
          score -= 5;
          break;
      }
    });

    score = Math.max(0, score);

    const result: SecurityScanResult = {
      passed: score >= 80,
      issues,
      score,
      timestamp: new Date().toISOString()
    };

    console.log(`Security scan completed. Score: ${score}/100, Issues: ${issues.length}`);

    // Log scan results
    await supabaseClient.from('auth_audit_log').insert({
      event_type: 'security_scan_completed',
      success: true,
      metadata: {
        score,
        issues_count: issues.length,
        critical_issues: issues.filter(i => i.severity === 'critical').length,
        high_issues: issues.filter(i => i.severity === 'high').length
      }
    });

    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
      status: 200,
    });

  } catch (error) {
    console.error('Security scan error:', error);
    
    return new Response(JSON.stringify({
      passed: false,
      issues: [{
        type: 'scan_error',
        severity: 'critical' as const,
        description: 'Security scan failed to complete',
        fix_suggestion: 'Check system logs and retry scan'
      }],
      score: 0,
      timestamp: new Date().toISOString(),
      error: error.message
    }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
      status: 500,
    });
  }
});

async function checkSuspiciousLoginPatterns(supabase: any): Promise<SecurityIssue[]> {
  const issues: SecurityIssue[] = [];
  
  try {
    // Check for multiple failed logins from same IP in last hour
    const { data } = await supabase
      .from('auth_audit_log')
      .select('ip_address, user_id, created_at')
      .eq('event_type', 'sign_in_attempt')
      .eq('success', false)
      .gte('created_at', new Date(Date.now() - 3600000).toISOString());

    if (data && data.length > 0) {
      const ipCounts: Record<string, number> = {};
      data.forEach((event: any) => {
        if (event.ip_address) {
          ipCounts[event.ip_address] = (ipCounts[event.ip_address] || 0) + 1;
        }
      });

      Object.entries(ipCounts).forEach(([ip, count]) => {
        if (count > 10) {
          issues.push({
            type: 'brute_force_attempt',
            severity: 'high',
            description: `${count} failed login attempts from IP ${ip} in the last hour`,
            fix_suggestion: 'Consider implementing IP-based rate limiting and blocking'
          });
        } else if (count > 5) {
          issues.push({
            type: 'suspicious_login_pattern',
            severity: 'medium',
            description: `${count} failed login attempts from IP ${ip} in the last hour`,
            fix_suggestion: 'Monitor this IP address for continued suspicious activity'
          });
        }
      });
    }
  } catch (error) {
    console.error('Error checking suspicious login patterns:', error);
  }

  return issues;
}

async function checkFailedLoginAttempts(supabase: any): Promise<SecurityIssue[]> {
  const issues: SecurityIssue[] = [];
  
  try {
    console.log('Checking failed login attempts...');
    
    const oneHourAgo = new Date(Date.now() - (60 * 60 * 1000)).toISOString();
    const oneDayAgo = new Date(Date.now() - (24 * 60 * 60 * 1000)).toISOString();
    
    // Query real auth audit log for failed login attempts
    const { data: failedLogins } = await supabase
      .from('auth_audit_log')
      .select('*')
      .in('event_type', ['sign_in_failed', 'sign_in_attempt', 'rate_limit_exceeded'])
      .eq('success', false)
      .gte('created_at', oneDayAgo)
      .order('created_at', { ascending: false });

    if (!failedLogins || failedLogins.length === 0) {
      console.log('No failed login attempts found in real data');
      return issues;
    }

    // Filter recent failures (last hour)
    const recentFailures = failedLogins.filter((log: any) => {
      const logTime = new Date(log.created_at);
      return logTime > new Date(oneHourAgo);
    });
    
    const recentFailuresCount = recentFailures.length;
    const allFailuresCount = failedLogins.length;

    console.log(`Failed logins analysis - Recent (1h): ${recentFailuresCount}, Total (24h): ${allFailuresCount}`);
    
    // Extract IP addresses and count attempts per IP
    const ipCounts: { [key: string]: number } = {};
    
    failedLogins.forEach((log: any) => {
      const ip = log.ip_address || 'unknown';
      ipCounts[ip] = (ipCounts[ip] || 0) + 1;
    });
    
    const uniqueIPs = Object.keys(ipCounts).filter(ip => ip !== 'unknown').length;
    const maxAttemptsPerIP = Object.values(ipCounts).length > 0 ? Math.max(...Object.values(ipCounts)) : 0;
    
    // Only report issues if there are actual recent failures
    if (recentFailuresCount === 0 && allFailuresCount <= 5) {
      console.log('No significant failed login activity detected');
      return issues;
    }
    
    // Define thresholds for different severity levels based on recent activity
    if (recentFailuresCount > 100) {
      issues.push({
        type: 'critical_failed_logins',
        severity: 'critical',
        description: `Critical: ${recentFailuresCount} failed login attempts in the last hour from ${uniqueIPs} unique IPs`,
        details: { recent_failures: recentFailuresCount, unique_ips: uniqueIPs, max_per_ip: maxAttemptsPerIP },
        fix_suggestion: 'Immediately implement IP blocking, CAPTCHA, and account lockouts. Consider DDoS protection.'
      });
    } else if (recentFailuresCount > 50) {
      issues.push({
        type: 'high_failed_logins',
        severity: 'high', 
        description: `High: ${recentFailuresCount} failed login attempts in the last hour from ${uniqueIPs} unique IPs`,
        details: { recent_failures: recentFailuresCount, unique_ips: uniqueIPs, max_per_ip: maxAttemptsPerIP },
        fix_suggestion: 'Implement rate limiting, CAPTCHA after 3 failed attempts, and monitor suspicious IPs'
      });
    } else if (recentFailuresCount > 20) {
      issues.push({
        type: 'medium_failed_logins',
        severity: 'medium',
        description: `Medium: ${recentFailuresCount} failed login attempts in the last hour from ${uniqueIPs} unique IPs`,
        details: { recent_failures: recentFailuresCount, unique_ips: uniqueIPs, max_per_ip: maxAttemptsPerIP },
        fix_suggestion: 'Consider implementing rate limiting and monitoring failed login patterns'
      });
    } else if (allFailuresCount > 10) {
      issues.push({
        type: 'low_failed_logins',
        severity: 'low',
        description: `Low: ${allFailuresCount} failed login attempts in the last 24 hours from ${uniqueIPs} unique IPs`,
        details: { total_failures: allFailuresCount, unique_ips: uniqueIPs },
        fix_suggestion: 'Normal activity - continue monitoring for patterns'
      });
    }

    // Check for potential brute force attacks (many attempts from few IPs) - only if we have real data
    const highVolumeIPs = Object.entries(ipCounts).filter(([ip, count]) => ip !== 'unknown' && count > 10);
    if (highVolumeIPs.length > 0) {
      issues.push({
        type: 'brute_force_detected',
        severity: 'high',
        description: `Potential brute force attack detected: ${highVolumeIPs.length} IPs with >10 failed attempts each`,
        details: { high_volume_ips: highVolumeIPs.slice(0, 5) },
        fix_suggestion: 'Implement CAPTCHA, account lockouts, and notify users of suspicious activity'
      });
    }

    // Check for credential stuffing patterns (many IPs with few attempts each)
    if (uniqueIPs > 20 && allFailuresCount > 100) {
      issues.push({
        type: 'credential_stuffing_attack',
        severity: 'high',
        description: `Failed logins from ${uniqueIPs} different IPs suggesting credential stuffing`,
        details: { unique_ips: uniqueIPs, total_failures: allFailuresCount },
        fix_suggestion: 'Implement CAPTCHA, account lockouts, and notify users of suspicious activity'
      });
    }

    // Only log analysis results if we found actual issues  
    if (issues.length > 0) {
      try {
        await supabase.from('auth_audit_log').insert({
          event_type: 'failed_login_analysis',
          success: recentFailuresCount === 0,
          error_message: recentFailuresCount > 0 ? `Security Scan: ${recentFailuresCount} failed logins in last hour, ${allFailuresCount} in last 24h` : null,
          metadata: {
            scan_timestamp: new Date().toISOString(),
            severity: recentFailuresCount > 50 ? 'high' : recentFailuresCount > 20 ? 'medium' : 'low',
            recent_failures: recentFailuresCount,
            total_failures_24h: allFailuresCount,
            unique_ips: uniqueIPs,
            max_attempts_per_ip: maxAttemptsPerIP,
            top_attacking_ips: Object.entries(ipCounts)
              .filter(([ip]) => ip !== 'unknown')
              .sort(([,a], [,b]) => b - a)
              .slice(0, 5)
              .map(([ip, count]) => ({ ip, count }))
          }
        });
        console.log('Logged failed login analysis to auth_audit_log');
      } catch (logError) {
        console.error('Failed to log failed login analysis:', logError);
      }
    }
    
    console.log(`Completed failed login analysis: ${issues.length} issues found`);
    
  } catch (error) {
    console.error('Error checking failed login attempts:', error);
  }

  return issues;
}

async function checkMultipleSessions(supabase: any): Promise<SecurityIssue[]> {
  const issues: SecurityIssue[] = [];
  
  try {
    const { data } = await supabase
      .from('session_timeouts')
      .select('user_id')
      .eq('is_active', true);

    if (data && data.length > 0) {
      const userSessions: Record<string, number> = {};
      data.forEach((session: any) => {
        userSessions[session.user_id] = (userSessions[session.user_id] || 0) + 1;
      });

      Object.entries(userSessions).forEach(([userId, count]) => {
        if (count > 10) {
          issues.push({
            type: 'excessive_sessions',
            severity: 'high',
            description: `User ${userId} has ${count} active sessions`,
            fix_suggestion: 'Investigate potential account compromise or session hijacking'
          });
        } else if (count > 5) {
          issues.push({
            type: 'multiple_sessions',
            severity: 'medium',
            description: `User ${userId} has ${count} active sessions`,
            fix_suggestion: 'Monitor for account sharing or suspicious activity'
          });
        }
      });
    }
  } catch (error) {
    console.error('Error checking multiple sessions:', error);
  }

  return issues;
}

async function checkPrivilegeEscalations(supabase: any): Promise<SecurityIssue[]> {
  const issues: SecurityIssue[] = [];
  
  try {
    const { data } = await supabase
      .from('role_change_audit')
      .select('*')
      .gte('created_at', new Date(Date.now() - 86400000).toISOString());

    if (data && data.length > 0) {
      const adminChanges = data.filter((change: any) => change.new_role === 'admin');
      const recentChanges = data.filter((change: any) => 
        new Date(change.created_at) > new Date(Date.now() - 3600000)
      );

      if (adminChanges.length > 2) {
        issues.push({
          type: 'multiple_admin_promotions',
          severity: 'high',
          description: `${adminChanges.length} admin role promotions in the last 24 hours`,
          fix_suggestion: 'Review all admin role assignments and ensure proper authorization'
        });
      } else if (adminChanges.length > 0) {
        issues.push({
          type: 'admin_promotion',
          severity: 'medium',
          description: `${adminChanges.length} admin role promotion(s) in the last 24 hours`,
          fix_suggestion: 'Verify the legitimacy of recent admin promotions'
        });
      }

      if (recentChanges.length > 5) {
        issues.push({
          type: 'frequent_role_changes',
          severity: 'medium',
          description: `${recentChanges.length} role changes in the last hour`,
          fix_suggestion: 'Investigate unusually high role change activity'
        });
      }
    }
  } catch (error) {
    console.error('Error checking privilege escalations:', error);
  }

  return issues;
}

async function checkUnusualDataAccess(supabase: any): Promise<SecurityIssue[]> {
  const issues: SecurityIssue[] = [];
  
  try {
    // Check for large data queries
    const { data } = await supabase
      .from('auth_audit_log')
      .select('user_id, metadata, created_at')
      .eq('event_type', 'data_access')
      .gte('created_at', new Date(Date.now() - 3600000).toISOString());

    if (data && data.length > 0) {
      const largeQueries = data.filter((event: any) => 
        event.metadata && event.metadata.large_query === true
      );

      if (largeQueries.length > 20) {
        issues.push({
          type: 'excessive_large_queries',
          severity: 'high',
          description: `${largeQueries.length} large data queries in the last hour`,
          fix_suggestion: 'Investigate potential data exfiltration attempts'
        });
      } else if (largeQueries.length > 10) {
        issues.push({
          type: 'elevated_data_access',
          severity: 'medium',
          description: `${largeQueries.length} large data queries in the last hour`,
          fix_suggestion: 'Monitor data access patterns for unusual activity'
        });
      }
    }
  } catch (error) {
    console.error('Error checking unusual data access:', error);
  }

  return issues;
}

async function checkWeakAccounts(supabase: any): Promise<SecurityIssue[]> {
  const issues: SecurityIssue[] = [];
  
  try {
    // Check for accounts without recent activity
    const { data: inactiveAccounts } = await supabase
      .from('profiles')
      .select('user_id, created_at')
      .lt('created_at', new Date(Date.now() - 86400000 * 30).toISOString()) // 30 days old
      .is('deleted_at', null);

    if (inactiveAccounts && inactiveAccounts.length > 100) {
      issues.push({
        type: 'many_inactive_accounts',
        severity: 'low',
        description: `${inactiveAccounts.length} accounts created over 30 days ago`,
        fix_suggestion: 'Consider implementing account cleanup policies for inactive users'
      });
    }

    // Check for admin accounts
    const { data: adminAccounts } = await supabase
      .from('profiles')
      .select('user_id, role')
      .eq('role', 'admin')
      .is('deleted_at', null);

    if (adminAccounts && adminAccounts.length > 5) {
      issues.push({
        type: 'too_many_admins',
        severity: 'medium',
        description: `${adminAccounts.length} admin accounts found`,
        fix_suggestion: 'Review admin accounts and remove unnecessary privileges'
      });
    }
  } catch (error) {
    console.error('Error checking weak accounts:', error);
  }

  return issues;
}

async function checkDatabaseSecurity(supabase: any): Promise<SecurityIssue[]> {
  const issues: SecurityIssue[] = [];
  
  try {
    // Check for recent error logs
    const { data: errorLogs } = await supabase
      .from('error_logs')
      .select('severity')
      .in('severity', ['critical', 'high'])
      .gte('created_at', new Date(Date.now() - 3600000).toISOString());

    if (errorLogs && errorLogs.length > 0) {
      const criticalErrors = errorLogs.filter((log: any) => log.severity === 'critical');
      const highErrors = errorLogs.filter((log: any) => log.severity === 'high');

      if (criticalErrors.length > 0) {
        issues.push({
          type: 'critical_system_errors',
          severity: 'critical',
          description: `${criticalErrors.length} critical errors in the last hour`,
          fix_suggestion: 'Investigate and resolve critical system errors immediately'
        });
      }

      if (highErrors.length > 5) {
        issues.push({
          type: 'high_system_errors',
          severity: 'high',
          description: `${highErrors.length} high-severity errors in the last hour`,
          fix_suggestion: 'Review and address high-severity system errors'
        });
      }
    }
  } catch (error) {
    console.error('Error checking database security:', error);
  }

  return issues;
}

async function checkSuspiciousFinancialActivity(supabase: any): Promise<SecurityIssue[]> {
  const issues: SecurityIssue[] = [];
  
  try {
    const oneDayAgo = new Date(Date.now() - 86400000).toISOString();
    
    // Check for suspicious payout patterns
    const { data: payoutRequests } = await supabase
      .from('payout_requests')
      .select('user_id, amount, created_at, wallet_address')
      .gte('created_at', oneDayAgo);

    if (payoutRequests && payoutRequests.length > 0) {
      // Check for users with multiple large payouts
      const userPayouts: Record<string, { count: number; total: number }> = {};
      payoutRequests.forEach((payout: any) => {
        if (!userPayouts[payout.user_id]) {
          userPayouts[payout.user_id] = { count: 0, total: 0 };
        }
        userPayouts[payout.user_id].count++;
        userPayouts[payout.user_id].total += parseFloat(payout.amount);
      });

      Object.entries(userPayouts).forEach(([userId, stats]) => {
        if (stats.total > 10000) { // Large amounts
          issues.push({
            type: 'large_financial_activity',
            severity: 'high',
            description: `User ${userId} requested ${stats.total} EUR in payouts (${stats.count} requests) in last 24h`,
            fix_suggestion: 'Review large payout requests for legitimacy and fraud'
          });
        } else if (stats.count > 10) {
          issues.push({
            type: 'frequent_payout_requests',
            severity: 'medium',
            description: `User ${userId} made ${stats.count} payout requests in last 24h`,
            fix_suggestion: 'Monitor for potential abuse or fraudulent activity'
          });
        }
      });
    }

    // Check for blocked payouts (security events)
    const { data: blockedPayouts } = await supabase
      .from('security_audit_log')
      .select('user_id, metadata')
      .eq('event_type', 'payout_blocked')
      .gte('timestamp', oneDayAgo);

    if (blockedPayouts && blockedPayouts.length > 10) {
      issues.push({
        type: 'high_blocked_payouts',
        severity: 'medium',
        description: `${blockedPayouts.length} payouts blocked by security checks in last 24h`,
        fix_suggestion: 'Review payout security rules and investigate blocked attempts'
      });
    }

    // Check for suspicious cashback patterns
    const { data: cashbackTx } = await supabase
      .from('cashback_transactions')
      .select('user_id, cashback_amount, created_at')
      .gte('created_at', oneDayAgo)
      .order('cashback_amount', { ascending: false })
      .limit(100);

    if (cashbackTx && cashbackTx.length > 0) {
      const largeCashback = cashbackTx.filter((tx: any) => parseFloat(tx.cashback_amount) > 1000);
      if (largeCashback.length > 5) {
        issues.push({
          type: 'suspicious_large_cashback',
          severity: 'high',
          description: `${largeCashback.length} unusually large cashback transactions in last 24h`,
          fix_suggestion: 'Investigate large cashback amounts for potential fraud'
        });
      }
    }
  } catch (error) {
    console.error('Error checking suspicious financial activity:', error);
  }

  return issues;
}

async function checkRateLimitViolations(supabase: any): Promise<SecurityIssue[]> {
  const issues: SecurityIssue[] = [];
  
  try {
    const oneHourAgo = new Date(Date.now() - 3600000).toISOString();
    
    // Check for rate limit violations
    const { data: rateLimits } = await supabase
      .from('rate_limits')
      .select('user_id, action_type, count')
      .gte('window_start', oneHourAgo);

    if (rateLimits && rateLimits.length > 0) {
      const violations: Record<string, number> = {};
      const actionViolations: Record<string, number> = {};
      
      rateLimits.forEach((limit: any) => {
        if (limit.count > 50) { // High rate limit violations
          violations[limit.user_id] = (violations[limit.user_id] || 0) + 1;
          actionViolations[limit.action_type] = (actionViolations[limit.action_type] || 0) + 1;
        }
      });

      Object.entries(violations).forEach(([userId, count]) => {
        if (count > 10) {
          issues.push({
            type: 'excessive_rate_limit_violations',
            severity: 'high',
            description: `User ${userId} triggered ${count} rate limit violations in last hour`,
            fix_suggestion: 'Investigate potential automated abuse or attacks'
          });
        } else if (count > 5) {
          issues.push({
            type: 'rate_limit_violations',
            severity: 'medium',
            description: `User ${userId} triggered ${count} rate limit violations in last hour`,
            fix_suggestion: 'Monitor user for aggressive usage patterns'
          });
        }
      });

      Object.entries(actionViolations).forEach(([action, count]) => {
        if (count > 20) {
          issues.push({
            type: 'action_abuse',
            severity: 'medium',
            description: `${count} rate limit violations for ${action} in last hour`,
            fix_suggestion: `Review and strengthen rate limits for ${action} actions`
          });
        }
      });
    }
  } catch (error) {
    console.error('Error checking rate limit violations:', error);
  }

  return issues;
}

async function checkAccountSecurity(supabase: any): Promise<SecurityIssue[]> {
  const issues: SecurityIssue[] = [];
  
  try {
    const oneDayAgo = new Date(Date.now() - 86400000).toISOString();
    
    // Check for account deletion requests (potential security concern)
    const { data: deletionRequests } = await supabase
      .from('account_deletion_requests')
      .select('user_id, status, created_at')
      .gte('created_at', oneDayAgo);

    if (deletionRequests && deletionRequests.length > 10) {
      issues.push({
        type: 'high_deletion_requests',
        severity: 'medium',
        description: `${deletionRequests.length} account deletion requests in last 24h`,
        fix_suggestion: 'Investigate spike in deletion requests for potential security issues'
      });
    }

    // Check for accounts with missing security information
    const { data: incompleteProfiles } = await supabase
      .from('profiles')
      .select('user_id, email, wallet_address')
      .is('wallet_address', null)
      .is('deleted_at', null);

    if (incompleteProfiles && incompleteProfiles.length > 0) {
      const oldIncomplete = incompleteProfiles.filter((profile: any) => 
        new Date(profile.created_at) < new Date(Date.now() - 86400000 * 7) // 7 days old
      );
      
      if (oldIncomplete.length > 50) {
        issues.push({
          type: 'many_incomplete_profiles',
          severity: 'low',
          description: `${oldIncomplete.length} profiles without wallet addresses (over 7 days old)`,
          fix_suggestion: 'Encourage users to complete their profiles or clean up inactive accounts'
        });
      }
    }

    // Check for unusual data export requests
    const { data: exportRequests } = await supabase
      .from('data_export_requests')
      .select('user_id, created_at')
      .gte('created_at', oneDayAgo);

    if (exportRequests && exportRequests.length > 20) {
      issues.push({
        type: 'high_data_export_requests',
        severity: 'medium',
        description: `${exportRequests.length} data export requests in last 24h`,
        fix_suggestion: 'Monitor for potential data harvesting or security concerns'
      });
    }

    // Check for key rotation needs
    const { data: keyVault } = await supabase
      .from('solana_key_vault')
      .select('user_id, last_rotation, is_active')
      .eq('is_active', true)
      .lt('last_rotation', new Date(Date.now() - 86400000 * 90).toISOString()); // 90 days old

    if (keyVault && keyVault.length > 10) {
      issues.push({
        type: 'outdated_security_keys',
        severity: 'medium',
        description: `${keyVault.length} security keys haven't been rotated in 90+ days`,
        fix_suggestion: 'Implement automatic key rotation for enhanced security'
      });
    }
  } catch (error) {
    console.error('Error checking account security:', error);
  }

  return issues;
}