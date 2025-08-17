import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/store/authStore';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

export default function AuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { fetchProfile } = useAuthStore();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Processing authentication...');

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        const url = new URL(window.location.href);
        
        // Log activation attempt for debugging
        console.log('Auth callback attempt:', {
          code: url.searchParams.get('code') ? 'present' : 'missing',
          token_hash: url.searchParams.get('token_hash') ? 'present' : 'missing',
          type: url.searchParams.get('type'),
          hash_present: window.location.hash.includes('access_token'),
          full_url: window.location.href
        });

        // 1) Handle PKCE/code verifier flow first (modern flow)
        const code = url.searchParams.get('code');
        if (code) {
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          
          if (error) {
            console.error('Code exchange error:', error);
            await logError('exchangeCodeForSession', error);
            
            setStatus('error');
            setMessage(error.message || 'Failed to exchange code for session');
            
            toast({
              title: 'Authentication Error',
              description: error.message || 'Failed to verify your account. Please try again.',
              variant: 'destructive'
            });

            setTimeout(() => navigate('/auth'), 3000);
            return;
          }

          if (data.user) {
            console.log('Code exchange successful:', data.user.id);
            await fetchProfile();
            
            setStatus('success');
            setMessage('Account verified successfully! Redirecting...');
            
            toast({
              title: 'Welcome!',
              description: 'Your account has been verified successfully.',
            });

            setTimeout(() => navigate('/dashboard'), 2000);
            return;
          }
        }

        // 2) Handle legacy OTP token flow
        const token_hash = url.searchParams.get('token_hash');
        const type = url.searchParams.get('type');
        if (token_hash && type) {
          const { data, error } = await supabase.auth.verifyOtp({
            token_hash,
            type: type as any
          });

          if (error) {
            console.error('OTP verification error:', error);
            await logError('verifyOtp', error);

            setStatus('error');
            setMessage(error.message || 'Failed to verify authentication token');
            
            toast({
              title: 'Authentication Error',
              description: error.message || 'Failed to verify your account. Please try again.',
              variant: 'destructive'
            });

            setTimeout(() => navigate('/auth'), 3000);
            return;
          }

          if (data.user) {
            console.log('OTP verification successful:', data.user.id);
            await fetchProfile();
            
            setStatus('success');
            setMessage('Account verified successfully! Redirecting...');
            
            toast({
              title: 'Welcome!',
              description: 'Your account has been verified successfully.',
            });

            setTimeout(() => navigate('/dashboard'), 2000);
            return;
          }
        }

        // 3) Handle legacy hash tokens (older email templates)
        if (window.location.hash.includes('access_token')) {
          const hashParams = new URLSearchParams(window.location.hash.slice(1));
          const access_token = hashParams.get('access_token');
          const refresh_token = hashParams.get('refresh_token');
          
          if (access_token && refresh_token) {
            const { data, error } = await supabase.auth.setSession({
              access_token,
              refresh_token
            });

            if (error) {
              console.error('Session creation error:', error);
              await logError('setSession', error);
              
              setStatus('error');
              setMessage('Failed to create session');
              setTimeout(() => navigate('/auth'), 3000);
              return;
            }

            if (data.user) {
              console.log('Session creation successful:', data.user.id);
              await fetchProfile();
              setStatus('success');
              setMessage('Logged in successfully! Redirecting...');
              setTimeout(() => navigate('/dashboard'), 2000);
              return;
            }
          }
        }

        // No valid auth parameters found
        console.warn('No valid auth parameters found in callback URL');
        await logError('auth_callback_no_params', {
          message: 'Auth callback with no valid parameters',
          search_params: Object.fromEntries(url.searchParams.entries()),
          hash: window.location.hash
        });

        setStatus('error');
        setMessage('Invalid authentication link. Please try signing in again.');
        setTimeout(() => navigate('/auth'), 3000);

      } catch (error) {
        console.error('Unexpected auth callback error:', error);
        await logError('auth_callback_unexpected', error);

        setStatus('error');
        setMessage('An unexpected error occurred. Please try again.');
        setTimeout(() => navigate('/auth'), 3000);
      }
    };

    // Helper function to log errors consistently
    const logError = async (operation: string, error: any) => {
      try {
        await supabase.from('error_logs').insert({
          error_message: `Auth callback ${operation}: ${error?.message || 'Unknown error'}`,
          component: 'AuthCallback',
          severity: 'error',
          additional_data: {
            operation,
            error_code: error?.status,
            error_stack: error instanceof Error ? error.stack : undefined,
            url: window.location.href
          }
        });
      } catch (logError) {
        console.warn('Failed to log error:', logError);
      }
    };

    handleAuthCallback();
  }, [searchParams, navigate, toast, fetchProfile]);

  const StatusIcon = () => {
    switch (status) {
      case 'loading':
        return <Loader2 className="w-8 h-8 animate-spin text-primary" />;
      case 'success':
        return <CheckCircle className="w-8 h-8 text-green-500" />;
      case 'error':
        return <XCircle className="w-8 h-8 text-red-500" />;
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md glass-card">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <StatusIcon />
          </div>
          <CardTitle className="text-2xl font-bold">
            {status === 'loading' && 'Verifying Account'}
            {status === 'success' && 'Success!'}
            {status === 'error' && 'Verification Failed'}
          </CardTitle>
          <CardDescription>
            {message}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center text-sm text-muted-foreground">
          {status === 'loading' && 'Please wait while we verify your account...'}
          {status === 'success' && 'You will be redirected to your dashboard shortly.'}
          {status === 'error' && 'You will be redirected to the login page.'}
        </CardContent>
      </Card>
    </div>
  );
}