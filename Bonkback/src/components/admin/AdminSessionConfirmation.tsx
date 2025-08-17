import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Shield, Clock, Fingerprint } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/store/authStore';

interface AdminSessionConfirmationProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  operationType: string;
  description: string;
}

export function AdminSessionConfirmation({
  isOpen,
  onConfirm,
  onCancel,
  operationType,
  description
}: AdminSessionConfirmationProps) {
  const [mfaCode, setMfaCode] = useState('');
  const [timeRemaining, setTimeRemaining] = useState(30);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionToken, setSessionToken] = useState('');
  const { toast } = useToast();
  const { session } = useAuthStore();

  useEffect(() => {
    if (isOpen) {
      // Generate time-based session token
      generateSessionToken();
      
      // Start countdown timer
      const timer = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            onCancel();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [isOpen, onCancel]);

  const generateSessionToken = async () => {
    try {
      // Use current session from store instead of refreshing
      if (!session?.user?.id) {
        throw new Error('No active session - please re-authenticate');
      }

      // Generate time-based confirmation token using current session
      const token = btoa(`${session.user.id}:${Date.now()}:${operationType}`).slice(0, 6).toUpperCase();
      setSessionToken(token);
      
      toast({
        title: "Session Confirmation Required",
        description: `Enter the code: ${token}`,
      });
    } catch (error: any) {
      console.error('Session token generation error:', error);
      toast({
        title: "Session Validation Failed",
        description: error.message,
        variant: "destructive",
      });
      onCancel();
    }
  };

  const handleConfirm = async () => {
    if (!mfaCode.trim()) {
      toast({
        title: "Code Required",
        description: "Please enter the session confirmation code",
        variant: "destructive",
      });
      return;
    }

    if (mfaCode.toUpperCase() !== sessionToken) {
      toast({
        title: "Invalid Code",
        description: "The confirmation code is incorrect",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      // Simple validation using session from store
      if (!session?.user?.id) {
        throw new Error('Session invalid - please re-authenticate');
      }

      // Log security event (optional, skip if it causes issues)
      try {
        await supabase.rpc('log_auth_event', {
          p_user_id: session.user.id,
          p_event_type: `admin_operation_confirmed`,
          p_success: true,
          p_metadata: {
            operation_type: operationType,
            timestamp: new Date().toISOString()
          }
        });
      } catch (logError) {
        console.warn('Failed to log security event:', logError);
        // Continue anyway - logging failure shouldn't block the operation
      }

      onConfirm();
    } catch (error: any) {
      console.error('Confirmation error:', error);
      toast({
        title: "Confirmation Failed",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setMfaCode('');
    setSessionToken('');
    setTimeRemaining(30);
    onCancel();
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={handleCancel}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-amber-500" />
            <AlertDialogTitle>Admin Session Confirmation</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="space-y-4 pt-2">
            <div className="text-sm">
              <strong>Operation:</strong> {operationType}
            </div>
            <div className="text-sm text-muted-foreground">
              {description}
            </div>
            
            <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
              <Fingerprint className="h-4 w-4 text-amber-600" />
              <div className="text-sm">
                <div className="font-medium">Session Token: {sessionToken}</div>
                <div className="text-xs text-muted-foreground">Enter this code below to confirm</div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmation-code" className="text-sm font-medium">
                Enter Confirmation Code:
              </Label>
              <Input
                id="confirmation-code"
                type="text"
                value={mfaCode}
                onChange={(e) => setMfaCode(e.target.value.toUpperCase())}
                placeholder="Enter code"
                className="w-full font-mono text-center"
                maxLength={6}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !isLoading) {
                    handleConfirm();
                  }
                }}
              />
            </div>

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>Expires in {timeRemaining} seconds</span>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!mfaCode.trim() || isLoading || timeRemaining === 0}
          >
            {isLoading ? 'Confirming...' : 'Confirm'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}