import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface Database {
  public: {
    Tables: {
      cashback_offers: {
        Row: {
          id: string
          title: string
          affiliate_network: string | null
          program_id: string | null
          affiliate_id: string | null
          deeplink: string | null
          tracking_template: string | null
          status: string
        }
      }
    }
    Functions: {
      record_offer_click: {
        Args: {
          p_user_id: string
          p_offer_id: string
          p_ip: string
          p_user_agent: string
          p_referrer: string
        }
        Returns: {
          click_id: string
        }[]
      }
      build_tracking_url: {
        Args: {
          p_network: string
          p_program_id: string
          p_affiliate_id: string
          p_user_id: string
          p_click_id: string
          p_deeplink: string
          p_offer_id: string
        }
        Returns: string
      }
    }
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const offerId = url.searchParams.get('offer_id')
    const userId = url.searchParams.get('user_id')

    // Validate required parameters
    if (!offerId) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameter: offer_id' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey)

    console.log(`Processing redirect for offer: ${offerId}, user: ${userId || 'anonymous'}`)

    // Look up the offer
    const { data: offer, error: offerError } = await supabase
      .from('cashback_offers')
      .select('id, title, affiliate_network, program_id, affiliate_id, deeplink, tracking_template, status')
      .eq('id', offerId)
      .eq('status', 'active')
      .single()

    if (offerError || !offer) {
      console.error('Offer not found or inactive:', offerError)
      return new Response(
        JSON.stringify({ error: 'Offer not found or inactive' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Validate required offer fields
    if (!offer.affiliate_network || !offer.deeplink) {
      console.error('Offer missing required tracking data:', offer)
      return new Response(
        JSON.stringify({ error: 'Offer tracking data incomplete' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    let clickId: string | null = null

    // Record click if user_id is provided
    if (userId) {
      try {
        const clientIp = req.headers.get('cf-connecting-ip') || 
                        req.headers.get('x-forwarded-for') || 
                        req.headers.get('x-real-ip') || 
                        'unknown'
        const userAgent = req.headers.get('user-agent') || 'unknown'
        const referrer = req.headers.get('referer') || 'direct'

        const { data: clickData, error: clickError } = await supabase
          .rpc('record_offer_click', {
            p_user_id: userId,
            p_offer_id: offerId,
            p_ip: clientIp,
            p_user_agent: userAgent,
            p_referrer: referrer
          })

        if (clickError) {
          console.error('Error recording click:', clickError)
        } else if (clickData && clickData.length > 0) {
          clickId = clickData[0].click_id
          console.log(`Recorded click: ${clickId}`)
        }
      } catch (error) {
        console.error('Error in click recording:', error)
        // Continue with redirect even if click recording fails
      }
    }

    // Build tracking URL
    try {
      const { data: trackingUrl, error: urlError } = await supabase
        .rpc('build_tracking_url', {
          p_network: offer.affiliate_network,
          p_program_id: offer.program_id || '',
          p_affiliate_id: offer.affiliate_id || '',
          p_user_id: userId || '',
          p_click_id: clickId || '',
          p_deeplink: offer.deeplink,
          p_offer_id: offerId
        })

      if (urlError) {
        console.error('Error building tracking URL:', urlError)
        return new Response(
          JSON.stringify({ error: 'Failed to build tracking URL' }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      console.log(`Redirecting to: ${trackingUrl}`)

      // Return 302 redirect
      return new Response(null, {
        status: 302,
        headers: {
          ...corsHeaders,
          'Location': trackingUrl
        }
      })

    } catch (error) {
      console.error('Error in URL building:', error)
      return new Response(
        JSON.stringify({ error: 'Failed to process redirect' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})