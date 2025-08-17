import { useState } from 'react';
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle,
  AlertDialogTrigger 
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { ShieldAlert, UserX, UserCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { AdminSessionConfirmation } from './AdminSessionConfirmation';

interface RoleChangeConfirmDialogProps {
  userId: string;
  userName: string;
  currentRole: string;
  newRole: 'user' | 'admin';
  onSuccess: () => void;
  children: React.ReactNode;
}

export function RoleChangeConfirmDialog({
  userId,
  userName,
  currentRole,
  newRole,
  onSuccess,
  children
}: RoleChangeConfirmDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const { toast } = useToast();

  const handleInitiateRoleChange = () => {
    setIsOpen(false);
    setShowConfirmation(true);
  };

  const handleConfirmedRoleChange = async () => {
    setIsLoading(true);
    setShowConfirmation(false);
    
    try {
      // Call the secure admin function
      const { data, error } = await supabase.rpc('admin_change_user_role', {
        target_user_id: userId,
        new_role: newRole,
        reason: `Role change from ${currentRole} to ${newRole} via admin panel`
      });

      if (error) {
        throw error;
      }

      // Type guard for the response data
      const response = data as { success: boolean; error?: string } | null;
      
      if (!response?.success) {
        throw new Error(response?.error || 'Failed to change user role');
      }

      toast({
        title: "Role Updated Successfully",
        description: `${userName}'s role has been changed from ${currentRole} to ${newRole}`,
      });

      onSuccess();
      
    } catch (error: any) {
      console.error('Role change error:', error);
      toast({
        title: "Failed to Update Role",
        description: error.message || "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setShowConfirmation(false);
    setIsOpen(false);
  };

  const getRoleIcon = (role: string) => {
    return role === 'admin' ? UserCheck : UserX;
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'user': return 'bg-green-500/20 text-green-400 border-green-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const CurrentRoleIcon = getRoleIcon(currentRole);
  const NewRoleIcon = getRoleIcon(newRole);

  return (
    <>
      <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
        <AlertDialogTrigger asChild>
          {children}
        </AlertDialogTrigger>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-amber-500" />
              <AlertDialogTitle>Confirm Role Change</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="space-y-4 pt-2">
              <div className="text-sm">
                You are about to change <strong>{userName}'s</strong> role:
              </div>
              
              <div className="flex items-center justify-center gap-4 py-4 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <CurrentRoleIcon className="h-4 w-4" />
                  <Badge className={getRoleColor(currentRole)}>
                    {currentRole}
                  </Badge>
                </div>
                <div className="text-muted-foreground">→</div>
                <div className="flex items-center gap-2">
                  <NewRoleIcon className="h-4 w-4" />
                  <Badge className={getRoleColor(newRole)}>
                    {newRole}
                  </Badge>
                </div>
              </div>

              <div className="text-xs text-muted-foreground bg-amber-500/10 p-2 rounded border border-amber-500/20">
                <strong>Security Notice:</strong> This action requires admin session confirmation and will be logged.
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsOpen(false)} disabled={isLoading}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleInitiateRoleChange}
              disabled={isLoading}
              className="bg-amber-600 hover:bg-amber-700"
            >
              Proceed to Confirmation
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AdminSessionConfirmation
        isOpen={showConfirmation}
        onConfirm={handleConfirmedRoleChange}
        onCancel={handleCancel}
        operationType="User Role Change"
        description={`Changing ${userName}'s role from ${currentRole} to ${newRole}`}
      />
    </>
  );
}