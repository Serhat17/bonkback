import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { emailContent, userToken } = await req.json()

    // Verify user token
    const { data: { user }, error: authError } = await supabase.auth.getUser(userToken)
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid user token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse email content for purchase data
    const purchaseData = await parseEmailReceipt(emailContent)
    if (!purchaseData) {
      return new Response(
        JSON.stringify({ error: 'No purchase data found in email' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Find matching cashback offer
    const { data: offer, error: offerError } = await supabase
      .from('cashback_offers')
      .select('*')
      .eq('merchant_name', purchaseData.merchant)
      .eq('status', 'active')
      .single()

    if (offerError || !offer) {
      return new Response(
        JSON.stringify({ error: 'No active offer found for merchant' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Calculate cashback
    const cashbackAmount = Math.min(
      purchaseData.amount * (offer.cashback_percentage / 100),
      offer.max_cashback || Infinity
    )
    
    const bonkAmount = Math.floor(cashbackAmount * 66667) // 1 USD = 66,667 BONK

    // Create transaction
    const { data: transaction, error: transactionError } = await supabase
      .from('cashback_transactions')
      .insert({
        user_id: user.id,
        offer_id: offer.id,
        purchase_amount: purchaseData.amount,
        cashback_amount: cashbackAmount,
        bonk_amount: bonkAmount,
        status: 'pending',
        order_id: purchaseData.orderId,
        purchase_date: purchaseData.date,
        metadata: {
          source: 'email_parsing',
          emailSubject: purchaseData.subject,
          autoDetected: true
        }
      })
      .select()
      .single()

    if (transactionError) {
      console.error('Transaction creation error:', transactionError)
      return new Response(
        JSON.stringify({ error: 'Failed to create transaction' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        transactionId: transaction.id,
        merchant: purchaseData.merchant,
        amount: purchaseData.amount,
        cashbackAmount,
        bonkAmount
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in email-parser function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

async function parseEmailReceipt(emailContent: string) {
  const text = emailContent.toLowerCase()
  
  // Detect merchant from email content
  const merchants = {
    'amazon': /amazon\.com|amazon\.co\.uk|amazon\.de/i,
    'ebay': /ebay\.com|ebay\.co\.uk|ebay\.de/i,
    'walmart': /walmart\.com|walmart/i,
    'target': /target\.com|target/i,
    'bestbuy': /bestbuy\.com|best buy/i
  }

  let detectedMerchant = null
  for (const [merchant, regex] of Object.entries(merchants)) {
    if (regex.test(emailContent)) {
      detectedMerchant = merchant.charAt(0).toUpperCase() + merchant.slice(1)
      break
    }
  }

  if (!detectedMerchant) return null

  // Extract order amount
  const amountPatterns = [
    /total[:\s]*\$?([0-9,]+\.?[0-9]*)/i,
    /amount[:\s]*\$?([0-9,]+\.?[0-9]*)/i,
    /paid[:\s]*\$?([0-9,]+\.?[0-9]*)/i,
    /charged[:\s]*\$?([0-9,]+\.?[0-9]*)/i
  ]

  let amount = null
  for (const pattern of amountPatterns) {
    const match = emailContent.match(pattern)
    if (match) {
      amount = parseFloat(match[1].replace(/,/g, ''))
      break
    }
  }

  if (!amount || amount <= 0) return null

  // Extract order ID
  const orderIdPatterns = [
    /order[:\s#]*([A-Z0-9\-]{6,})/i,
    /confirmation[:\s#]*([A-Z0-9\-]{6,})/i,
    /transaction[:\s#]*([A-Z0-9\-]{6,})/i
  ]

  let orderId = null
  for (const pattern of orderIdPatterns) {
    const match = emailContent.match(pattern)
    if (match) {
      orderId = match[1]
      break
    }
  }

  // Extract date (try to find purchase date)
  const dateMatch = emailContent.match(/(\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2})/i)
  const date = dateMatch ? new Date(dateMatch[1]) : new Date()

  return {
    merchant: detectedMerchant,
    amount,
    orderId: orderId || `AUTO_${Date.now()}`,
    date: date.toISOString(),
    subject: emailContent.split('\n')[0] || 'Email Receipt'
  }
}