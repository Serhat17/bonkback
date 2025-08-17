import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DataExportRequest {
  request_type?: 'full_export' | 'partial_export' | 'specific_data';
  data_categories?: string[];
  export_format?: 'json' | 'csv' | 'pdf';
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      request_type = 'full_export', 
      data_categories = ['profile', 'transactions', 'referrals', 'support'],
      export_format = 'json' 
    }: DataExportRequest = await req.json();

    // Get user from JWT
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      throw new Error('Authorization header required');
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (authError || !user) {
      throw new Error('Invalid authorization');
    }

    console.log("Processing GDPR data export:", { user_id: user.id, request_type, data_categories });

    // Create export request record
    const { data: exportRequest, error: requestError } = await supabase
      .from('data_export_requests')
      .insert({
        user_id: user.id,
        request_type,
        data_categories,
        export_format,
        status: 'processing'
      })
      .select()
      .single();

    if (requestError) throw requestError;

    // Collect user data based on categories
    const exportData: any = {
      user_id: user.id,
      export_timestamp: new Date().toISOString(),
      request_id: exportRequest.id,
      data: {}
    };

    try {
      // Profile data
      if (data_categories.includes('profile')) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .single();
        
        exportData.data.profile = profile;
      }

      // Transaction data
      if (data_categories.includes('transactions')) {
        const { data: cashbackTx } = await supabase
          .from('cashback_transactions')
          .select('*')
          .eq('user_id', user.id);

        const { data: payoutRequests } = await supabase
          .from('payout_requests')
          .select('*')
          .eq('user_id', user.id);

        const { data: giftCardRedemptions } = await supabase
          .from('gift_card_redemptions')
          .select('*')
          .eq('user_id', user.id);

        const { data: bonkTransfers } = await supabase
          .from('bonk_transfers')
          .select('*')
          .eq('user_id', user.id);

        exportData.data.transactions = {
          cashback_transactions: cashbackTx || [],
          payout_requests: payoutRequests || [],
          gift_card_redemptions: giftCardRedemptions || [],
          bonk_transfers: bonkTransfers || []
        };
      }

      // Referral data
      if (data_categories.includes('referrals')) {
        const { data: referrals } = await supabase
          .from('referrals')
          .select('*')
          .or(`referrer_id.eq.${user.id},referred_id.eq.${user.id}`);

        const { data: referralPayouts } = await supabase
          .from('referral_payouts')
          .select('*')
          .or(`referrer_id.eq.${user.id},referred_user_id.eq.${user.id},beneficiary_id.eq.${user.id}`);

        exportData.data.referrals = {
          referrals: referrals || [],
          referral_payouts: referralPayouts || []
        };
      }

      // Support data
      if (data_categories.includes('support')) {
        const { data: supportTickets } = await supabase
          .from('support_tickets')
          .select(`
            *,
            support_ticket_messages (*)
          `)
          .eq('user_id', user.id);

        exportData.data.support = {
          support_tickets: supportTickets || []
        };
      }

      // Consent records
      if (data_categories.includes('consent') || request_type === 'full_export') {
        const { data: consentRecords } = await supabase
          .from('consent_records')
          .select('*')
          .eq('user_id', user.id);

        exportData.data.consent_records = consentRecords || [];
      }

      // Email notifications
      if (data_categories.includes('emails') || request_type === 'full_export') {
        const { data: emailNotifications } = await supabase
          .from('email_notifications')
          .select('*')
          .eq('user_id', user.id);

        exportData.data.email_notifications = emailNotifications || [];
      }

      // Calculate file size
      const exportJson = JSON.stringify(exportData, null, 2);
      const fileSize = new Blob([exportJson]).size;

      // Update export request with completion
      await supabase
        .from('data_export_requests')
        .update({
          status: 'completed',
          file_size: fileSize,
          processed_at: new Date().toISOString()
        })
        .eq('id', exportRequest.id);

      // Format response based on requested format
      let responseData;
      let contentType = "application/json";
      let filename = `bonkback-data-export-${user.id}-${new Date().getTime()}`;

      switch (export_format) {
        case 'csv':
          // Convert to CSV (simplified)
          const csvData = convertToCSV(exportData.data);
          responseData = csvData;
          contentType = "text/csv";
          filename += ".csv";
          break;
        
        case 'json':
        default:
          responseData = JSON.stringify({
            success: true,
            export_request_id: exportRequest.id,
            data: exportData
          }, null, 2);
          filename += ".json";
          break;
      }

      return new Response(responseData, {
        status: 200,
        headers: { 
          "Content-Type": contentType, 
          ...corsHeaders,
          "Content-Disposition": `attachment; filename="${filename}"`
        },
      });

    } catch (dataError: any) {
      console.error("Error collecting user data:", dataError);
      
      // Update export request with error
      await supabase
        .from('data_export_requests')
        .update({
          status: 'failed',
          processed_at: new Date().toISOString()
        })
        .eq('id', exportRequest.id);

      throw dataError;
    }

  } catch (error: any) {
    console.error("Error in export-user-data function:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

function convertToCSV(data: any): string {
  const rows: string[] = [];
  
  // Add profile data
  if (data.profile) {
    rows.push("Profile Data");
    rows.push("Field,Value");
    for (const [key, value] of Object.entries(data.profile)) {
      rows.push(`${key},"${value}"`);
    }
    rows.push("");
  }

  // Add transaction data
  if (data.transactions?.cashback_transactions?.length) {
    rows.push("Cashback Transactions");
    rows.push("Date,Merchant,Amount,Status");
    data.transactions.cashback_transactions.forEach((tx: any) => {
      rows.push(`${tx.purchase_date},"${tx.offer_id}",${tx.cashback_amount},${tx.status}`);
    });
    rows.push("");
  }

  return rows.join('\n');
}

serve(handler);