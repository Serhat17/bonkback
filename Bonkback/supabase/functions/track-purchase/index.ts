import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
    )

    const { 
      merchant, 
      amount, 
      orderId,
      userToken,
      affiliateId,
      url 
    } = await req.json()

    console.log('Tracking purchase:', { merchant, amount, orderId })

    // Verify user token and get user ID
    const { data: { user }, error: authError } = await supabase.auth.getUser(userToken)
    
    if (authError || !user) {
      console.error('Auth error:', authError)
      return new Response(
        JSON.stringify({ error: 'Invalid user token' }),
        { 
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Proceed to compute cashback against active offers

    // Server-side cashback calculation
    if (!amount || amount <= 0) {
      return new Response(
        JSON.stringify({ error: 'Invalid amount' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get active offer (case-insensitive match)
    const { data: offers, error: offerErr } = await supabase
      .from('cashback_offers')
      .select('*')
      .eq('status', 'active')

    if (offerErr || !offers) {
      console.error('Offer lookup failed:', offerErr)
      return new Response(
        JSON.stringify({ error: 'Offer lookup failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const offer = offers.find((o: any) => o.merchant_name.toLowerCase() === merchant.toLowerCase())
      || offers.find((o: any) => merchant.toLowerCase().includes(o.merchant_name.toLowerCase()))

    if (!offer) {
      return new Response(
        JSON.stringify({ error: 'Merchant offer not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const computedCashback = Math.min(
      amount * (Number(offer.cashback_percentage) / 100),
      offer.max_cashback ?? Infinity
    )

    // Let DB calculate BONK amount to keep parity with server defaults
    const { data: bonkCalc, error: bonkErr } = await supabase.rpc('calculate_bonk_amount', {
      p_cashback_amount: computedCashback
    })

    if (bonkErr) {
      console.error('BONK calc failed:', bonkErr)
    }

    const bonkAmount = Number(bonkCalc) || 0

    // Create transaction securely
    const { data: transaction, error: transactionError } = await supabase
      .from('cashback_transactions')
      .insert({
        user_id: user.id,
        offer_id: offer.id,
        purchase_amount: amount,
        cashback_amount: computedCashback,
        bonk_amount: bonkAmount,
        status: 'pending',
        order_id: orderId,
        metadata: {
          affiliateId,
          trackingUrl: url,
          trackedAt: new Date().toISOString(),
          manual_review_required: false
        }
      })
      .select()
      .single()

    if (transactionError) {
      console.error('Transaction creation error:', transactionError)
      return new Response(
        JSON.stringify({ error: 'Failed to create transaction' }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('Transaction created successfully:', transaction.id)

    return new Response(
      JSON.stringify({ 
        success: true, 
        transactionId: transaction.id,
        bonkAmount,
        cashbackAmount: computedCashback 
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error in track-purchase function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})