import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuthStore } from '@/store/authStore';
import { validateSolanaAddress, rateLimitValidation } from '@/lib/input-validation';
import { Check, Wallet, AlertCircle, Shield } from 'lucide-react';

interface SolanaAddressInputProps {
  onAddressChange?: (address: string | null) => void;
  className?: string;
}

export const SolanaAddressInput: React.FC<SolanaAddressInputProps> = ({
  onAddressChange,
  className = ""
}) => {
  const [address, setAddress] = useState('');
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const { profile, updateProfile } = useAuthStore();
  const { toast } = useToast();

  // Enhanced Solana address validation with checksum verification
  const validateAddress = (addr: string): { isValid: boolean; error?: string } => {
    if (!addr?.trim()) return { isValid: false };
    
    try {
      validateSolanaAddress.validate(addr);
      return { isValid: true };
    } catch (error) {
      return { 
        isValid: false, 
        error: error instanceof Error ? error.message : 'Invalid address'
      };
    }
  };

  const handleAddressChange = (value: string) => {
    setAddress(value);
    const validation = value ? validateAddress(value) : { isValid: null };
    setIsValid(validation.isValid);
    onAddressChange?.(validation.isValid ? value : null);
  };

  const handleSaveAddress = async () => {
    if (!isValid || !address) return;

    setIsSaving(true);
    try {
      // Rate limiting: max 3 wallet updates per hour
      rateLimitValidation.checkRateLimit('wallet_update', 3, 60 * 60 * 1000);
      
      // Final validation before saving
      const sanitizedAddress = validateSolanaAddress.validate(address);
      
      const { error } = await updateProfile({ wallet_address: sanitizedAddress });
      
      if (error) {
        throw error;
      }

      toast({
        title: "Address Saved",
        description: "Your Solana address has been saved successfully.",
      });
    } catch (error) {
      console.error('Error saving address:', error);
      toast({
        title: "Save Failed",
        description: error instanceof Error ? error.message : "Failed to save your Solana address. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  React.useEffect(() => {
    if (profile?.wallet_address) {
      setAddress(profile.wallet_address);
      const validation = validateAddress(profile.wallet_address);
      setIsValid(validation.isValid);
      onAddressChange?.(validation.isValid ? profile.wallet_address : null);
    }
  }, [profile?.wallet_address, onAddressChange]);

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="space-y-2">
        <Label htmlFor="solana-address" className="flex items-center gap-2">
          <Wallet className="w-4 h-4" />
          Solana Wallet Address
          <Shield className="w-4 h-4 text-green-500" />
        </Label>
        <div className="relative">
          <Input
            id="solana-address"
            type="text"
            placeholder="Enter your Solana wallet address (44 characters)"
            value={address}
            onChange={(e) => handleAddressChange(e.target.value)}
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
        
        {/* Status indicators */}
        <div className="flex items-center gap-2">
          {isValid === true && (
            <Badge variant="outline" className="text-green-600 border-green-200">
              <Check className="w-3 h-3 mr-1" />
              Valid Address
            </Badge>
          )}
          {isValid === false && (
            <Badge variant="outline" className="text-red-600 border-red-200">
              <AlertCircle className="w-3 h-3 mr-1" />
              Invalid Format
            </Badge>
          )}
          {profile?.wallet_address === address && isValid && (
            <Badge variant="outline" className="text-blue-600 border-blue-200">
              Saved
            </Badge>
          )}
        </div>
      </div>

      {/* Save button */}
      {isValid && address !== profile?.wallet_address && (
        <Button 
          onClick={handleSaveAddress}
          disabled={isSaving}
          className="w-full"
          variant="outline"
        >
          {isSaving ? 'Saving...' : 'Save Address'}
        </Button>
      )}

      <div className="text-xs text-muted-foreground space-y-1">
        <p>
          Copy your Solana wallet address from any wallet app (Phantom, Solflare, etc.) and paste it here. 
          This address will be used for BONK payouts.
        </p>
        <p className="flex items-center gap-1 text-green-600">
          <Shield className="w-3 h-3" />
          Enhanced validation with checksum verification
        </p>
      </div>
    </div>
  );
};