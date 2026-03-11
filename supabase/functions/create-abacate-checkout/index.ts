import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { restaurantId, returnUrl, completionUrl } = await req.json()

    if (!restaurantId) {
      throw new Error('Restaurant ID is required')
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Fetch restaurant info to pre-fill or validate
    const { data: restaurant, error: fetchError } = await supabaseClient
      .from('restaurants')
      .select('name, slug')
      .eq('id', restaurantId)
      .single()

    if (fetchError || !restaurant) {
      throw new Error('Restaurant not found')
    }

    const apiKey = Deno.env.get('ABACATE_PAY_API_KEY')
    if (!apiKey) {
      throw new Error('Abacate Pay API Key not configured')
    }

    // Create Checkout in Abacate Pay
    // Using v2 API as researched
    const response = await fetch('https://api.abacatepay.com/v2/checkouts/create', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        externalId: restaurantId, // Link this checkout to our restaurant
        methods: ["PIX"], // Only PIX as requested
        items: [
          {
            id: "monthly_subscription",
            name: "Assinatura Mensal - Smart Menu",
            quantity: 1,
            price: 5990, // Amount in cents (R$ 59,90) - Adjust if needed
          }
        ],
        returnUrl: returnUrl || `https://${req.headers.get('host')}/settings`,
        completionUrl: completionUrl || `https://${req.headers.get('host')}/dashboard?payment=success`,
        metadata: {
          restaurantId: restaurantId,
          restaurantName: restaurant.name
        }
      }),
    })

    const result = await response.json()

    if (!response.ok) {
      console.error('Abacate Pay Error:', result)
      throw new Error(result.message || 'Failed to create checkout')
    }

    return new Response(
      JSON.stringify({ url: result.data.url }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    )
  }
})
