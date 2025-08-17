import { useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { errorTracker } from '@/lib/error-tracking';

interface ErrorContext {
  component?: string;
  action?: string;
  userId?: string;
  additional?: Record<string, any>;
}

export const useErrorHandler = () => {
  const { toast } = useToast();

  const handleError = useCallback((
    error: any,
    context: ErrorContext = {},
    userMessage?: string
  ) => {
    // Log error for tracking
    console.error('Error occurred:', error, context);
    
    // Track error in our error tracking system
    errorTracker.logError(error, 'medium', {
      ...context,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    });

    // Show user-friendly message
    const defaultMessage = getDefaultErrorMessage(error);
    toast({
      title: "An error occurred",
      description: userMessage || defaultMessage,
      variant: "destructive"
    });
  }, [toast]);

  const handleAsyncError = useCallback(async (
    asyncFn: () => Promise<any>,
    context: ErrorContext = {},
    userMessage?: string
  ) => {
    try {
      return await asyncFn();
    } catch (error) {
      handleError(error, context, userMessage);
      throw error; // Re-throw so calling code can handle if needed
    }
  }, [handleError]);

  return {
    handleError,
    handleAsyncError
  };
};

function getDefaultErrorMessage(error: any): string {
  if (error?.message) {
    // Return first sentence of error message for brevity
    return error.message.split('.')[0] + '.';
  }
  
  if (error?.status === 401 || error?.status === 403) {
    return 'Authentication required. Please log in and try again.';
  }
  
  if (error?.status === 404) {
    return 'The requested resource was not found.';
  }
  
  if (error?.status >= 500) {
    return 'A server error occurred. Please try again later.';
  }
  
  if (error?.code === 'NETWORK_ERROR') {
    return 'Network error. Please check your connection and try again.';
  }
  
  return 'An unexpected error occurred. Please try again.';
}