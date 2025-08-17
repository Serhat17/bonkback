import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

export const ReferralRedirect = () => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (code) {
      // Store referral code in localStorage
      localStorage.setItem('referral_code', code);
      
      toast({
        title: "Referral Code Saved!",
        description: "You'll receive a bonus when you sign up. Creating an account now...",
      });

      // Redirect to homepage after brief delay
      setTimeout(() => {
        navigate('/', { replace: true });
      }, 1500);
    } else {
      navigate('/', { replace: true });
    }
  }, [code, navigate, toast]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Processing referral...</p>
      </div>
    </div>
  );
};

export default ReferralRedirect;