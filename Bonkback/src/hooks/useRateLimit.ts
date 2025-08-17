import { useState, useCallback } from 'react';
import { rateLimitValidation } from '@/lib/input-validation';

interface RateLimitConfig {
  maxOperations: number;
  timeWindowMs: number;
  storageKey?: string;
}

export function useRateLimit(operationType: string, config: RateLimitConfig) {
  const [isLimited, setIsLimited] = useState(false);
  const [remainingOperations, setRemainingOperations] = useState(config.maxOperations);
  const [resetTime, setResetTime] = useState<Date | null>(null);

  const checkAndUpdateLimit = useCallback((): boolean => {
    try {
      // Check if operation is allowed
      rateLimitValidation.checkRateLimit(
        operationType,
        config.maxOperations,
        config.timeWindowMs,
        config.storageKey
      );

      // Update remaining operations
      const remaining = rateLimitValidation.getRemainingOperations(
        operationType,
        config.maxOperations,
        config.timeWindowMs,
        config.storageKey
      );

      setRemainingOperations(remaining.remaining);
      setResetTime(remaining.resetTime);
      setIsLimited(false);
      
      return true;
    } catch (error) {
      setIsLimited(true);
      setRemainingOperations(0);
      
      // Get reset time even when limited
      const remaining = rateLimitValidation.getRemainingOperations(
        operationType,
        config.maxOperations,
        config.timeWindowMs,
        config.storageKey
      );
      setResetTime(remaining.resetTime);
      
      throw error;
    }
  }, [operationType, config]);

  const getRemainingInfo = useCallback(() => {
    const remaining = rateLimitValidation.getRemainingOperations(
      operationType,
      config.maxOperations,
      config.timeWindowMs,
      config.storageKey
    );

    setRemainingOperations(remaining.remaining);
    setResetTime(remaining.resetTime);
    setIsLimited(remaining.remaining === 0);

    return remaining;
  }, [operationType, config]);

  return {
    isLimited,
    remainingOperations,
    resetTime,
    checkAndUpdateLimit,
    getRemainingInfo
  };
}