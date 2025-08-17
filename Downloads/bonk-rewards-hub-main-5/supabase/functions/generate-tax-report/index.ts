import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TaxReportRequest {
  tax_year: number;
  country_code?: string;
  report_type?: 'annual' | 'quarterly' | 'monthly';
  format?: 'json' | 'csv' | 'pdf';
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { tax_year, country_code = 'DE', report_type = 'annual', format = 'json' }: TaxReportRequest = await req.json();

    // Get user from JWT
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      throw new Error('Authorization header required');
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (authError || !user) {
      throw new Error('Invalid authorization');
    }

    console.log("Generating tax report:", { user_id: user.id, tax_year, country_code, report_type });

    // Get existing report or create new one
    const { data: existingReport } = await supabase
      .from('tax_reports')
      .select('*')
      .eq('user_id', user.id)
      .eq('tax_year', tax_year)
      .eq('country_code', country_code)
      .eq('report_type', report_type)
      .single();

    if (existingReport && existingReport.status === 'generated') {
      return new Response(JSON.stringify({
        success: true,
        report: existingReport
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Get all tax transactions for the year
    const { data: transactions, error: transError } = await supabase
      .from('tax_transactions')
      .select('*')
      .eq('user_id', user.id)
      .eq('tax_year', tax_year)
      .order('transaction_date', { ascending: true });

    if (transError) throw transError;

    // Calculate totals
    const totals = transactions?.reduce((acc, tx) => {
      switch (tx.transaction_type) {
        case 'cashback':
          acc.total_cashback_eur += parseFloat(tx.amount_eur);
          break;
        case 'referral':
          acc.total_referral_eur += parseFloat(tx.amount_eur);
          break;
        case 'withdrawal':
        case 'gift_card':
          acc.total_withdrawals_eur += parseFloat(tx.amount_eur);
          break;
      }
      return acc;
    }, {
      total_cashback_eur: 0,
      total_referral_eur: 0,
      total_withdrawals_eur: 0
    }) || { total_cashback_eur: 0, total_referral_eur: 0, total_withdrawals_eur: 0 };

    // Calculate German tax liability
    const { data: taxLiability, error: taxError } = await supabase
      .rpc('calculate_german_tax_liability', {
        user_id: user.id,
        tax_year
      });

    if (taxError) {
      console.warn("Failed to calculate tax liability:", taxError);
    }

    const taxableAmount = taxLiability || 0;

    // Prepare report data
    const reportData = {
      tax_year,
      country_code,
      report_type,
      user_id: user.id,
      transactions: transactions || [],
      summary: {
        ...totals,
        total_income_eur: totals.total_cashback_eur + totals.total_referral_eur,
        tax_free_allowance_eur: 801, // German allowance for 2024
        taxable_amount_eur: taxableAmount,
        transaction_count: transactions?.length || 0
      },
      generated_at: new Date().toISOString(),
      disclaimer: "This report is for informational purposes only. Please consult a tax professional for official tax advice."
    };

    // Create or update report record
    const reportRecord = {
      user_id: user.id,
      tax_year,
      country_code,
      report_type,
      total_cashback_eur: totals.total_cashback_eur,
      total_referral_eur: totals.total_referral_eur,
      total_withdrawals_eur: totals.total_withdrawals_eur,
      taxable_amount_eur: taxableAmount,
      report_data: reportData,
      status: 'generated',
      generated_at: new Date().toISOString()
    };

    const { data: report, error: reportError } = existingReport
      ? await supabase
          .from('tax_reports')
          .update(reportRecord)
          .eq('id', existingReport.id)
          .select()
          .single()
      : await supabase
          .from('tax_reports')
          .insert(reportRecord)
          .select()
          .single();

    if (reportError) throw reportError;

    // Format response based on requested format
    let responseData;
    let contentType = "application/json";

    switch (format) {
      case 'csv':
        const csvHeaders = 'Date,Type,Amount BONK,Amount EUR,Exchange Rate,Description\n';
        const csvRows = transactions?.map(tx => 
          `${tx.transaction_date},${tx.transaction_type},${tx.amount_bonk},${tx.amount_eur},${tx.exchange_rate},"${tx.metadata?.description || ''}"`
        ).join('\n') || '';
        responseData = csvHeaders + csvRows;
        contentType = "text/csv";
        break;
      
      case 'json':
      default:
        responseData = JSON.stringify({
          success: true,
          report,
          data: reportData
        });
        break;
    }

    return new Response(responseData, {
      status: 200,
      headers: { 
        "Content-Type": contentType, 
        ...corsHeaders,
        ...(format === 'csv' ? {
          "Content-Disposition": `attachment; filename="bonkback-tax-report-${tax_year}.csv"`
        } : {})
      },
    });

  } catch (error: any) {
    console.error("Error in generate-tax-report function:", error);
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

serve(handler);