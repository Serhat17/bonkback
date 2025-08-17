import DOMPurify from 'dompurify';
import { PublicKey } from '@solana/web3.js';

// Input sanitization utilities
export const sanitizeInput = {
  /**
   * Sanitize HTML content to prevent XSS attacks
   */
  html: (input: string): string => {
    return DOMPurify.sanitize(input, {
      ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'ol', 'ul', 'li'],
      ALLOWED_ATTR: []
    });
  },

  /**
   * Sanitize plain text input
   */
  text: (input: string): string => {
    return DOMPurify.sanitize(input, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
  },

  /**
   * Sanitize and validate email
   */
  email: (input: string): string => {
    const sanitized = DOMPurify.sanitize(input.toLowerCase().trim(), { 
      ALLOWED_TAGS: [], 
      ALLOWED_ATTR: [] 
    });
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(sanitized)) {
      throw new Error('Invalid email format');
    }
    
    return sanitized;
  },

  /**
   * Sanitize URL input
   */
  url: (input: string): string => {
    const sanitized = DOMPurify.sanitize(input.trim(), { 
      ALLOWED_TAGS: [], 
      ALLOWED_ATTR: [] 
    });
    
    try {
      new URL(sanitized);
      return sanitized;
    } catch {
      throw new Error('Invalid URL format');
    }
  }
};

// Numeric validation with bounds checking
export const validateNumeric = {
  /**
   * Validate currency amount (supports up to 2 decimal places)
   */
  currency: (value: number | string, min = 0, max = 1000000): number => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    
    if (isNaN(num) || !isFinite(num)) {
      throw new Error('Invalid numeric value');
    }
    
    if (num < min) {
      throw new Error(`Value must be at least ${min}`);
    }
    
    if (num > max) {
      throw new Error(`Value must not exceed ${max}`);
    }
    
    // Round to 2 decimal places
    return Math.round(num * 100) / 100;
  },

  /**
   * Validate percentage (0-100)
   */
  percentage: (value: number | string): number => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    
    if (isNaN(num) || !isFinite(num)) {
      throw new Error('Invalid percentage value');
    }
    
    if (num < 0 || num > 100) {
      throw new Error('Percentage must be between 0 and 100');
    }
    
    return Math.round(num * 100) / 100;
  },

  /**
   * Validate integer within bounds
   */
  integer: (value: number | string, min = 0, max = Number.MAX_SAFE_INTEGER): number => {
    const num = typeof value === 'string' ? parseInt(value, 10) : Math.floor(value);
    
    if (isNaN(num) || !isFinite(num)) {
      throw new Error('Invalid integer value');
    }
    
    if (num < min) {
      throw new Error(`Value must be at least ${min}`);
    }
    
    if (num > max) {
      throw new Error(`Value must not exceed ${max}`);
    }
    
    return num;
  },

  /**
   * Validate BONK amount (no decimal places, positive)
   */
  bonkAmount: (value: number | string): number => {
    const num = typeof value === 'string' ? parseInt(value, 10) : Math.floor(value);
    
    if (isNaN(num) || !isFinite(num)) {
      throw new Error('Invalid BONK amount');
    }
    
    if (num < 0) {
      throw new Error('BONK amount must be positive');
    }
    
    if (num > 1000000000000) { // 1 trillion BONK limit
      throw new Error('BONK amount exceeds maximum limit');
    }
    
    return num;
  }
};

// Enhanced Solana wallet validation
export const validateSolanaAddress = {
  /**
   * Validate Solana address with checksum verification
   */
  isValid: (address: string): boolean => {
    try {
      const sanitized = sanitizeInput.text(address.trim());
      new PublicKey(sanitized);
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Validate and return sanitized Solana address
   */
  validate: (address: string): string => {
    const sanitized = sanitizeInput.text(address.trim());
    
    if (!sanitized) {
      throw new Error('Wallet address is required');
    }
    
    try {
      const pubKey = new PublicKey(sanitized);
      return pubKey.toString();
    } catch {
      throw new Error('Invalid Solana wallet address format');
    }
  },

  /**
   * Check if address is a valid program address
   */
  isProgramAddress: (address: string): boolean => {
    try {
      const pubKey = new PublicKey(address);
      return PublicKey.isOnCurve(pubKey.toBytes());
    } catch {
      return false;
    }
  }
};

// Rate limiting validation
export const rateLimitValidation = {
  /**
   * Check if operation is within rate limits
   */
  checkRateLimit: (
    operationType: string,
    maxOperations: number,
    timeWindowMs: number,
    storageKey?: string
  ): boolean => {
    const key = storageKey || `rate_limit_${operationType}`;
    const now = Date.now();
    
    // Get stored rate limit data
    const stored = localStorage.getItem(key);
    const data = stored ? JSON.parse(stored) : { count: 0, windowStart: now };
    
    // Reset if time window has passed
    if (now - data.windowStart > timeWindowMs) {
      data.count = 0;
      data.windowStart = now;
    }
    
    // Check if within limits
    if (data.count >= maxOperations) {
      const resetTime = new Date(data.windowStart + timeWindowMs);
      throw new Error(`Rate limit exceeded. Try again after ${resetTime.toLocaleTimeString()}`);
    }
    
    // Increment counter
    data.count++;
    localStorage.setItem(key, JSON.stringify(data));
    
    return true;
  },

  /**
   * Get remaining operations for rate limit
   */
  getRemainingOperations: (
    operationType: string,
    maxOperations: number,
    timeWindowMs: number,
    storageKey?: string
  ): { remaining: number; resetTime: Date } => {
    const key = storageKey || `rate_limit_${operationType}`;
    const now = Date.now();
    
    const stored = localStorage.getItem(key);
    const data = stored ? JSON.parse(stored) : { count: 0, windowStart: now };
    
    // Reset if time window has passed
    if (now - data.windowStart > timeWindowMs) {
      return {
        remaining: maxOperations,
        resetTime: new Date(now + timeWindowMs)
      };
    }
    
    return {
      remaining: Math.max(0, maxOperations - data.count),
      resetTime: new Date(data.windowStart + timeWindowMs)
    };
  }
};

// Form validation schemas using the above utilities
export const createValidationSchema = {
  /**
   * Create validation function for profile updates
   */
  profile: () => ({
    email: (value: string) => sanitizeInput.email(value),
    fullName: (value: string) => {
      const sanitized = sanitizeInput.text(value);
      if (sanitized.length < 2 || sanitized.length > 100) {
        throw new Error('Name must be between 2 and 100 characters');
      }
      return sanitized;
    },
    walletAddress: (value: string) => validateSolanaAddress.validate(value)
  }),

  /**
   * Create validation function for financial operations
   */
  financial: () => ({
    payoutAmount: (value: number | string) => validateNumeric.currency(value, 15, 10000),
    cashbackPercentage: (value: number | string) => validateNumeric.percentage(value),
    bonkAmount: (value: number | string) => validateNumeric.bonkAmount(value)
  }),

  /**
   * Create validation function for admin operations
   */
  admin: () => ({
    offerTitle: (value: string) => {
      const sanitized = sanitizeInput.text(value);
      if (sanitized.length < 3 || sanitized.length > 200) {
        throw new Error('Title must be between 3 and 200 characters');
      }
      return sanitized;
    },
    offerDescription: (value: string) => {
      const sanitized = sanitizeInput.html(value);
      if (sanitized.length > 2000) {
        throw new Error('Description must not exceed 2000 characters');
      }
      return sanitized;
    },
    cashbackRate: (value: number | string) => validateNumeric.percentage(value),
    maxCashback: (value: number | string) => validateNumeric.currency(value, 0, 1000)
  })
};

// Security utilities for input validation
export const securityUtils = {
  /**
   * Check for potential XSS patterns
   */
  containsXSS: (input: string): boolean => {
    const xssPatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
      /<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi,
      /<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi
    ];
    
    return xssPatterns.some(pattern => pattern.test(input));
  },

  /**
   * Check for SQL injection patterns
   */
  containsSQLInjection: (input: string): boolean => {
    const sqlPatterns = [
      /union\s+select/gi,
      /insert\s+into/gi,
      /delete\s+from/gi,
      /update\s+set/gi,
      /drop\s+table/gi,
      /exec\s*\(/gi,
      /script\s*:/gi
    ];
    
    return sqlPatterns.some(pattern => pattern.test(input));
  },

  /**
   * Validate input for potential security threats
   */
  validateSecurity: (input: string): void => {
    if (securityUtils.containsXSS(input)) {
      throw new Error('Input contains potentially malicious content');
    }
    
    if (securityUtils.containsSQLInjection(input)) {
      throw new Error('Input contains potentially malicious content');
    }
  }
};