import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useValidatedInput } from '@/hooks/useValidatedInput';
import { AlertCircle, Check, Shield } from 'lucide-react';

interface ValidatedInputProps {
  label: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  customValidator?: (value: string) => string | void;
  type?: 'text' | 'email' | 'url' | 'number';
  className?: string;
  showSecurityIndicator?: boolean;
}

export const ValidatedInput: React.FC<ValidatedInputProps> = ({
  label,
  placeholder,
  value,
  onChange,
  required = false,
  minLength,
  maxLength,
  pattern,
  customValidator,
  type = 'text',
  className = '',
  showSecurityIndicator = true
}) => {
  const {
    value: inputValue,
    error,
    isValid,
    handleChange
  } = useValidatedInput(value, {
    required,
    minLength,
    maxLength,
    pattern,
    customValidator
  });

  React.useEffect(() => {
    if (inputValue !== value) {
      handleChange(value);
    }
  }, [value, inputValue, handleChange]);

  const handleInputChange = (newValue: string) => {
    handleChange(newValue);
    onChange(newValue);
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <Label className="flex items-center gap-2">
        {label}
        {required && <span className="text-red-500">*</span>}
        {showSecurityIndicator && (
          <Shield className="w-4 h-4 text-green-500" />
        )}
      </Label>
      
      <div className="relative">
        <Input
          type={type}
          placeholder={placeholder}
          value={inputValue}
          onChange={(e) => handleInputChange(e.target.value)}
          className={`pr-10 ${
            isValid === true ? 'border-green-500' : 
            isValid === false ? 'border-red-500' : ''
          }`}
        />
        
        {isValid === true && (
          <Check className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-green-500" />
        )}
        {isValid === false && (
          <AlertCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-red-500" />
        )}
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {showSecurityIndicator && (
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <Shield className="w-3 h-3 text-green-500" />
          Input sanitization and security validation enabled
        </p>
      )}
    </div>
  );
};