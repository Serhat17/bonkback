import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface AwinTransaction {
  id: string;
  transactionId: string;
  orderId: string;
  advertiserName: string;
  saleAmount: string;
  commissionAmount: string;
  transactionDate: string;
  commissionStatus: 'pending' | 'approved' | 'declined';
  clickRef: string;
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

    const { network = 'awin', programId = 'default', userToken } = await req.json()

    // Verify user token
    const { data: { user }, error: authError } = await supabase.auth.getUser(userToken)
    if (authError || !user) {
      console.error('Authentication failed:', authError)
      return new Response(
        JSON.stringify({ error: 'Invalid user token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get affiliate network configuration
    const { data: affiliateNetwork, error: networkError } = await supabase
      .from('affiliate_networks')
      .select('*')
      .eq('network', network)
      .single()

    if (networkError || !affiliateNetwork) {
      return new Response(
        JSON.stringify({ error: 'Affiliate network not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Start background task to monitor affiliate network
    const monitoringTask = monitorAffiliateNetwork(
      supabase,
      user.id,
      affiliateNetwork,
      programId
    )

    // Don't await - run in background
    EdgeRuntime.waitUntil(monitoringTask)

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Affiliate monitoring started',
        network: network,
        programId: programId
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in affiliate-monitor function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

async function monitorAffiliateNetwork(
  supabase: any,
  userId: string,
  network: any,
  programId: string
) {
  console.log(`Starting enhanced affiliate monitoring for user ${userId} on network ${network.network}`)
  
  // More frequent polling for better tracking
  const pollInterval = 2 * 60 * 1000 // 2 minutes
  let consecutiveErrors = 0
  const maxErrors = 5
  
  while (consecutiveErrors < maxErrors) {
    try {
      console.log(`Polling for transactions (attempt ${consecutiveErrors + 1})`)
      
      // Call affiliate network API to check for new transactions
      const transactions = await fetchAffiliateTransactions(network, programId)
      console.log(`Found ${transactions.length} transactions`)
      
      for (const transaction of transactions) {
        try {
          // More robust duplicate checking
          const { data: existing, error: checkError } = await supabase
            .from('cashback_transactions')
            .select('id, status')
            .or(`order_id.eq.${transaction.orderId},metadata->>affiliateTransactionId.eq.${transaction.id}`)
            .eq('user_id', userId)

          if (checkError) {
            console.error('Error checking existing transaction:', checkError)
            continue
          }

          if (existing && existing.length > 0) {
            console.log(`Transaction ${transaction.orderId} already exists`)
            continue
          }

          // Find matching offer with fuzzy merchant matching
          const { data: offers, error: offerError } = await supabase
            .from('cashback_offers')
            .select('*')
            .eq('status', 'active')

          if (offerError) {
            console.error('Error fetching offers:', offerError)
            continue
          }

          // Find best matching offer
          const matchingOffer = offers?.find(offer => 
            offer.merchant_name.toLowerCase() === transaction.merchant.toLowerCase() ||
            transaction.merchant.toLowerCase().includes(offer.merchant_name.toLowerCase()) ||
            offer.merchant_name.toLowerCase().includes(transaction.merchant.toLowerCase())
          )

          if (matchingOffer) {
            // Enhanced cashback calculation
            const cashbackAmount = Math.min(
              transaction.amount * (matchingOffer.cashback_percentage / 100),
              matchingOffer.max_cashback || Infinity
            )
            
            // Get current BONK price from system settings
            const { data: bonkPrice } = await supabase
              .from('system_settings')
              .select('value')
              .eq('key', 'bonk_price_usd')
              .single()
            
            const bonkPriceUsd = bonkPrice?.value?.price || 0.000015
            const bonkAmount = Math.floor(cashbackAmount / bonkPriceUsd)

            // Create transaction record with enhanced metadata
            const { error: insertError } = await supabase
              .from('cashback_transactions')
              .insert({
                user_id: userId,
                offer_id: matchingOffer.id,
                purchase_amount: transaction.amount,
                cashback_amount: cashbackAmount,
                bonk_amount: bonkAmount,
                status: transaction.status === 'approved' ? 'approved' : 'pending',
                order_id: transaction.orderId,
                purchase_date: transaction.date,
                metadata: {
                  source: 'affiliate_network',
                  network: network.network,
                  programId: programId,
                  affiliateTransactionId: transaction.id,
                  commissionAmount: transaction.commissionAmount,
                  clickRef: transaction.clickRef,
                  bonkPriceAtTime: bonkPriceUsd,
                  autoProcessed: true
                }
              })

            if (insertError) {
              console.error('Error inserting transaction:', insertError)
            } else {
              console.log(`✅ Created transaction for user ${userId}: ${transaction.orderId} - ${cashbackAmount} cashback (${bonkAmount} BONK)`)
              
              // Update user's BONK balance if approved
              if (transaction.status === 'approved') {
                const { error: balanceError } = await supabase
                  .from('profiles')
                  .update({ 
                    bonk_balance: supabase.raw(`bonk_balance + ${bonkAmount}`),
                    total_earned: supabase.raw(`total_earned + ${bonkAmount}`)
                  })
                  .eq('user_id', userId)
                
                if (balanceError) {
                  console.error('Error updating user balance:', balanceError)
                }
              }
            }
          } else {
            console.log(`No matching offer found for merchant: ${transaction.merchant}`)
          }
        } catch (transactionError) {
          console.error('Error processing individual transaction:', transactionError)
        }
      }

      // Reset error counter on success
      consecutiveErrors = 0
      
      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, pollInterval))
      
    } catch (error) {
      consecutiveErrors++
      console.error(`Error in affiliate monitoring (attempt ${consecutiveErrors}):`, error)
      
      // Exponential backoff on errors
      const backoffTime = Math.min(pollInterval * Math.pow(2, consecutiveErrors), 30 * 60 * 1000) // Max 30 minutes
      await new Promise(resolve => setTimeout(resolve, backoffTime))
    }
  }
  
  console.error(`Stopping affiliate monitoring after ${maxErrors} consecutive errors`)
}

async function fetchAffiliateTransactions(network: any, programId: string): Promise<any[]> {
  console.log(`Fetching transactions for network: ${network.network}, programId: ${programId}`)
  
  // Get API credentials from environment
  const awinToken = Deno.env.get('AWIN_API_TOKEN')
  const awinPublisherId = Deno.env.get('AWIN_PUBLISHER_ID') ?? Deno.env.get('AWIN_ADVERTISER_ID')
  
  if (network.network === 'awin') {
    if (!awinToken || !awinPublisherId) {
      console.error('Missing Awin credentials')
      return []
    }

    try {
      // Enhanced Awin API integration with better date handling
      const today = new Date()
      const startDate = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
      
      const params = new URLSearchParams({
        startDate: startDate.toISOString().split('T')[0],
        endDate: today.toISOString().split('T')[0],
        timezone: 'UTC',
        dateType: 'transaction'
      })
      
      const endpoint = `https://api.awin.com/publishers/${awinPublisherId}/transactions?${params}`
      
      console.log(`Calling Awin API: ${endpoint}`)
      
      const response = await fetch(endpoint, {
        headers: {
          'Authorization': `Bearer ${awinToken}`,
          'Content-Type': 'application/json',
          'User-Agent': 'BonkBack/1.0'
        }
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('Awin API error:', response.status, response.statusText, errorText)
        return []
      }
      
      const data = await response.json()
      console.log(`Received ${data.length || 0} transactions from Awin`)
      
      // Enhanced transformation with better error handling
      return (data || []).map((transaction: AwinTransaction) => {
        try {
          return {
            id: transaction.id || transaction.transactionId,
            orderId: transaction.orderId || transaction.transactionId,
            merchant: transaction.advertiserName || 'Unknown Merchant',
            amount: parseFloat(transaction.saleAmount) || 0,
            date: transaction.transactionDate,
            status: transaction.commissionStatus || 'pending',
            commissionAmount: parseFloat(transaction.commissionAmount) || 0,
            clickRef: transaction.clickRef,
            source: 'awin'
          }
        } catch (error) {
          console.error('Error transforming transaction:', error, transaction)
          return null
        }
      }).filter(Boolean) // Remove null values
      
    } catch (error) {
      console.error('Error in Awin API call:', error)
      return []
    }
  }
  
  // For other networks, return empty array for now
  console.log(`Network ${network.network} not implemented yet`)
  return []
}