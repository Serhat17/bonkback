// Centralized error tracking system
interface ErrorReport {
  message: string;
  stack?: string;
  componentStack?: string;
  url: string;
  userAgent: string;
  timestamp: string;
  userId?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  context?: Record<string, any>;
}

class ErrorTracker {
  private static instance: ErrorTracker;
  private isProduction = import.meta.env.PROD;

  static getInstance(): ErrorTracker {
    if (!ErrorTracker.instance) {
      ErrorTracker.instance = new ErrorTracker();
    }
    return ErrorTracker.instance;
  }

  async logError(
    error: Error | string,
    severity: ErrorReport['severity'] = 'medium',
    context?: Record<string, any>
  ): Promise<void> {
    const errorReport: ErrorReport = {
      message: typeof error === 'string' ? error : error.message,
      stack: typeof error === 'string' ? undefined : error.stack,
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
      userId: localStorage.getItem('user_id') || undefined,
      severity,
      context
    };

    // Log to console in development
    if (!this.isProduction) {
      console.error('[ErrorTracker]', errorReport);
    }

    // Send to logging service in production
    if (this.isProduction) {
      await this.sendToLoggingService(errorReport);
    }
  }

  private async sendToLoggingService(errorReport: ErrorReport): Promise<void> {
    try {
      // Send to Supabase edge function for error logging
      const response = await fetch('/functions/v1/log-error', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(errorReport)
      });

      if (!response.ok) {
        console.error('Failed to send error report:', response.statusText);
      }
    } catch (sendError) {
      console.error('Error sending error report:', sendError);
    }
  }

  // Convenient methods for different severity levels
  logLow(error: Error | string, context?: Record<string, any>) {
    return this.logError(error, 'low', context);
  }

  logMedium(error: Error | string, context?: Record<string, any>) {
    return this.logError(error, 'medium', context);
  }

  logHigh(error: Error | string, context?: Record<string, any>) {
    return this.logError(error, 'high', context);
  }

  logCritical(error: Error | string, context?: Record<string, any>) {
    return this.logError(error, 'critical', context);
  }
}

export const errorTracker = ErrorTracker.getInstance();

// Global error handler
window.addEventListener('error', (event) => {
  errorTracker.logHigh(event.error || event.message, {
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno
  });
});

// Unhandled promise rejection handler
window.addEventListener('unhandledrejection', (event) => {
  errorTracker.logHigh(
    `Unhandled Promise Rejection: ${event.reason}`,
    { reason: event.reason }
  );
});