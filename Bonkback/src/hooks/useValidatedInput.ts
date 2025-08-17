import { useState, useCallback } from 'react';
import { sanitizeInput, securityUtils } from '@/lib/input-validation';

interface ValidationOptions {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  customValidator?: (value: string) => string | void;
}

export function useValidatedInput(
  initialValue: string = '',
  options: ValidationOptions = {}
) {
  const [value, setValue] = useState(initialValue);
  const [error, setError] = useState<string | null>(null);
  const [isValid, setIsValid] = useState(true);

  const validate = useCallback((inputValue: string): boolean => {
    try {
      // Security validation first
      securityUtils.validateSecurity(inputValue);
      
      // Basic sanitization
      const sanitized = sanitizeInput.text(inputValue);
      
      // Required validation
      if (options.required && !sanitized.trim()) {
        throw new Error('This field is required');
      }
      
      // Length validation
      if (options.minLength && sanitized.length < options.minLength) {
        throw new Error(`Must be at least ${options.minLength} characters`);
      }
      
      if (options.maxLength && sanitized.length > options.maxLength) {
        throw new Error(`Must not exceed ${options.maxLength} characters`);
      }
      
      // Pattern validation
      if (options.pattern && !options.pattern.test(sanitized)) {
        throw new Error('Invalid format');
      }
      
      // Custom validation
      if (options.customValidator) {
        options.customValidator(sanitized);
      }
      
      setError(null);
      setIsValid(true);
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Invalid input';
      setError(errorMessage);
      setIsValid(false);
      return false;
    }
  }, [options]);

  const handleChange = useCallback((newValue: string) => {
    setValue(newValue);
    validate(newValue);
  }, [validate]);

  const getSanitizedValue = useCallback(() => {
    return sanitizeInput.text(value);
  }, [value]);

  return {
    value,
    error,
    isValid,
    handleChange,
    validate: () => validate(value),
    getSanitizedValue
  };
}