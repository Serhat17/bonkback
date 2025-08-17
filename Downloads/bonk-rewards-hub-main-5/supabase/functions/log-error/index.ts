import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ErrorReport {
  message: string;
  stack?: string;
  url: string;
  userAgent: string;
  timestamp: string;
  userId?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  context?: Record<string, any>;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const errorReport: ErrorReport = await req.json();

    // Log to console for development
    console.error('[ERROR LOGGED]:', {
      severity: errorReport.severity,
      message: errorReport.message,
      url: errorReport.url,
      userId: errorReport.userId,
      timestamp: errorReport.timestamp
    });

    // Store in database for production tracking
    const { error } = await supabase
      .from('error_logs')
      .insert({
        user_id: errorReport.userId || null,
        error_message: errorReport.message,
        stack_trace: errorReport.stack || null,
        component: errorReport.url,
        severity: errorReport.severity,
        metadata: {
          userAgent: errorReport.userAgent,
          context: errorReport.context,
          timestamp: errorReport.timestamp
        }
      });

    if (error) {
      console.error('Failed to store error log:', error);
      // Don't fail the request, just log locally
    }

    return new Response(
      JSON.stringify({ success: true, logged: true }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in log-error function:', error);
    
    return new Response(
      JSON.stringify({ success: false, error: 'Failed to log error' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});