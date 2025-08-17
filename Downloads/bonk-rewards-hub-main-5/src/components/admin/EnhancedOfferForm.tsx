import React, { useState } from 'react';
import { ValidatedInput } from '@/components/ValidatedInput';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { createValidationSchema, validateNumeric, sanitizeInput } from '@/lib/input-validation';
import { useRateLimit } from '@/hooks/useRateLimit';
import { AlertCircle, Shield, Clock } from 'lucide-react';

interface OfferFormData {
  merchant_name: string;
  title: string;
  description: string;
  cashback_percentage: string;
  max_cashback: string;
  category: string;
  merchant_logo_url: string;
  image_url: string;
  terms_conditions: string;
  featured: boolean;
  valid_until: string;
  affiliate_network: string;
  program_id: string;
  affiliate_id: string;
  deeplink: string;
  tracking_template: string;
}

interface EnhancedOfferFormProps {
  formData: OfferFormData;
  onFormDataChange: (data: OfferFormData) => void;
  affiliateNetworks: Array<{ network: string; display_name: string | null }>;
  isSubmitting: boolean;
}

export const EnhancedOfferForm: React.FC<EnhancedOfferFormProps> = ({
  formData,
  onFormDataChange,
  affiliateNetworks,
  isSubmitting
}) => {
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const validation = createValidationSchema.admin();

  // Rate limiting for offer creation - max 10 offers per hour
  const { isLimited, remainingOperations, resetTime } = useRateLimit('offer_creation', {
    maxOperations: 10,
    timeWindowMs: 60 * 60 * 1000 // 1 hour
  });

  const handleFieldChange = (field: keyof OfferFormData, value: string | boolean) => {
    const newData = { ...formData, [field]: value };
    onFormDataChange(newData);

    // Clear validation error for this field
    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validateField = (field: keyof OfferFormData, value: string): string | null => {
    try {
      switch (field) {
        case 'title':
          validation.offerTitle(value);
          break;
        case 'description':
          validation.offerDescription(value);
          break;
        case 'cashback_percentage':
          if (value) validation.cashbackRate(value);
          break;
        case 'max_cashback':
          if (value) validation.maxCashback(value);
          break;
        case 'merchant_name':
          if (value.length < 2 || value.length > 100) {
            throw new Error('Merchant name must be between 2 and 100 characters');
          }
          sanitizeInput.text(value);
          break;
        case 'merchant_logo_url':
        case 'image_url':
          if (value) sanitizeInput.url(value);
          break;
        case 'deeplink':
          if (value) sanitizeInput.url(value);
          break;
        case 'terms_conditions':
          if (value) sanitizeInput.html(value);
          break;
        default:
          if (value) sanitizeInput.text(value);
      }
      return null;
    } catch (error) {
      return error instanceof Error ? error.message : 'Invalid input';
    }
  };

  const handleInputChange = (field: keyof OfferFormData) => (value: string) => {
    handleFieldChange(field, value);
    
    // Validate field on change
    const error = validateField(field, value);
    if (error) {
      setValidationErrors(prev => ({ ...prev, [field]: error }));
    }
  };

  const formatDateForInput = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toISOString().split('T')[0];
  };

  return (
    <div className="space-y-6">
      {/* Rate limiting warning */}
      {isLimited && (
        <Alert>
          <Clock className="h-4 w-4" />
          <AlertDescription>
            Rate limit reached. You can create {remainingOperations} more offers. 
            Limit resets at {resetTime?.toLocaleTimeString()}.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ValidatedInput
          label="Merchant Name"
          placeholder="Enter merchant name"
          value={formData.merchant_name}
          onChange={handleInputChange('merchant_name')}
          required
          minLength={2}
          maxLength={100}
        />

        <ValidatedInput
          label="Offer Title"
          placeholder="Enter offer title"
          value={formData.title}
          onChange={handleInputChange('title')}
          required
          minLength={3}
          maxLength={200}
        />
      </div>

      <div>
        <Label className="flex items-center gap-2">
          Description
          <Shield className="w-4 h-4 text-green-500" />
        </Label>
        <Textarea
          placeholder="Enter offer description"
          value={formData.description}
          onChange={(e) => handleInputChange('description')(e.target.value)}
          className="mt-2"
          rows={4}
        />
        {validationErrors.description && (
          <Alert variant="destructive" className="mt-2">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{validationErrors.description}</AlertDescription>
          </Alert>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ValidatedInput
          label="Cashback Percentage"
          placeholder="e.g., 5.5"
          value={formData.cashback_percentage}
          onChange={handleInputChange('cashback_percentage')}
          type="number"
          required
          customValidator={(value) => {
            const num = parseFloat(value);
            if (num < 0 || num > 100) {
              throw new Error('Percentage must be between 0 and 100');
            }
          }}
        />

        <ValidatedInput
          label="Max Cashback (EUR)"
          placeholder="e.g., 50.00"
          value={formData.max_cashback}
          onChange={handleInputChange('max_cashback')}
          type="number"
          customValidator={(value) => {
            if (value) {
              const num = parseFloat(value);
              if (num < 0 || num > 1000) {
                throw new Error('Max cashback must be between 0 and 1000 EUR');
              }
            }
          }}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ValidatedInput
          label="Merchant Logo URL"
          placeholder="https://example.com/logo.png"
          value={formData.merchant_logo_url}
          onChange={handleInputChange('merchant_logo_url')}
          type="url"
        />

        <ValidatedInput
          label="Offer Image URL"
          placeholder="https://example.com/image.png"
          value={formData.image_url}
          onChange={handleInputChange('image_url')}
          type="url"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Category</Label>
          <Select value={formData.category} onValueChange={(value) => handleFieldChange('category', value)}>
            <SelectTrigger className="mt-2">
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="electronics">Electronics</SelectItem>
              <SelectItem value="fashion">Fashion</SelectItem>
              <SelectItem value="travel">Travel</SelectItem>
              <SelectItem value="food">Food & Dining</SelectItem>
              <SelectItem value="beauty">Beauty & Health</SelectItem>
              <SelectItem value="home">Home & Garden</SelectItem>
              <SelectItem value="sports">Sports & Fitness</SelectItem>
              <SelectItem value="entertainment">Entertainment</SelectItem>
              <SelectItem value="services">Services</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Affiliate Network</Label>
          <Select value={formData.affiliate_network} onValueChange={(value) => handleFieldChange('affiliate_network', value)}>
            <SelectTrigger className="mt-2">
              <SelectValue placeholder="Select network" />
            </SelectTrigger>
            <SelectContent>
              {affiliateNetworks.map((network) => (
                <SelectItem key={network.network} value={network.network}>
                  {network.display_name || network.network}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ValidatedInput
          label="Program ID"
          placeholder="Enter program ID"
          value={formData.program_id}
          onChange={handleInputChange('program_id')}
        />

        <ValidatedInput
          label="Affiliate ID"
          placeholder="Enter affiliate ID"
          value={formData.affiliate_id}
          onChange={handleInputChange('affiliate_id')}
        />

        <div>
          <Label>Valid Until</Label>
          <input
            type="date"
            value={formatDateForInput(formData.valid_until)}
            onChange={(e) => handleFieldChange('valid_until', e.target.value)}
            className="mt-2 w-full px-3 py-2 border border-input bg-background rounded-md text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>
      </div>

      <ValidatedInput
        label="Deep Link URL"
        placeholder="https://merchant.com/product"
        value={formData.deeplink}
        onChange={handleInputChange('deeplink')}
        type="url"
      />

      <div>
        <Label className="flex items-center gap-2">
          Terms & Conditions
          <Shield className="w-4 h-4 text-green-500" />
        </Label>
        <Textarea
          placeholder="Enter terms and conditions"
          value={formData.terms_conditions}
          onChange={(e) => handleInputChange('terms_conditions')(e.target.value)}
          className="mt-2"
          rows={3}
        />
        {validationErrors.terms_conditions && (
          <Alert variant="destructive" className="mt-2">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{validationErrors.terms_conditions}</AlertDescription>
          </Alert>
        )}
      </div>

      <div className="flex items-center space-x-2">
        <Switch
          id="featured"
          checked={formData.featured}
          onCheckedChange={(checked) => handleFieldChange('featured', checked)}
          disabled={isSubmitting}
        />
        <Label htmlFor="featured">Featured offer</Label>
      </div>

      <div className="text-sm text-muted-foreground bg-green-50 p-3 rounded-lg border border-green-200">
        <div className="flex items-center gap-2 mb-2">
          <Shield className="w-4 h-4 text-green-600" />
          <span className="font-medium text-green-800">Security Features Enabled</span>
        </div>
        <ul className="space-y-1 text-green-700">
          <li>• Input sanitization and XSS protection</li>
          <li>• URL validation for links and images</li>
          <li>• Numeric bounds checking</li>
          <li>• Rate limiting (max 10 offers per hour)</li>
        </ul>
      </div>
    </div>
  );
};