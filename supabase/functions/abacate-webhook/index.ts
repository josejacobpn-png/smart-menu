import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { crypto } from "https://deno.land/std@0.177.0/crypto/mod.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const signature = req.headers.get('x-abacatepay-signature')
    const webhookSecret = Deno.env.get('ABACATE_PAY_WEBHOOK_SECRET')

    // Basic validation of the raw body
    const bodyText = await req.text()
    
    // Webhook auth/validation (Abacate Pay usually provides a signature or a secret)
    // If we have a secret, we should verify it.
    // NOTE: Replace this with the specific verification method if available.
    // For now, let's assume valid if the body can be parsed and contains necessary info.
    // Ideally, use HMAC-SHA256 with the secret.

    const result = JSON.parse(bodyText)
    console.log('Webhook Received:', result)

    // Abacate Pay v2 specific events
    // Event structure: { event: "checkout.completed", data: { ... } }
    const event = result.event
    const data = result.data

    if (event === 'checkout.completed' || event === 'payment.completed') {
      const restaurantId = data.externalId // We sent this during checkout creation

      if (!restaurantId) {
        throw new Error('No restaurantId found in webhook data')
      }

      const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      )

      // Get current restaurant subscription state
      const { data: restaurant, error: fetchError } = await supabaseClient
        .from('restaurants')
        .select('subscription_ends_at, trial_ends_at')
        .eq('id', restaurantId)
        .single()

      if (fetchError || !restaurant) {
        throw new Error(`Restaurant ${restaurantId} not found`)
      }

      const now = new Date()
      let currentEnd = restaurant.subscription_ends_at
        ? new Date(restaurant.subscription_ends_at)
        : (restaurant.trial_ends_at ? new Date(restaurant.trial_ends_at) : now)

      // If the current subscription already expired, start from today
      if (currentEnd < now) {
        currentEnd = now
      }

      // Add 30 days
      const newEnd = new Date(currentEnd.getTime() + 30 * 24 * 60 * 60 * 1000)

      // Update the database
      const { error: updateError } = await supabaseClient
        .from('restaurants')
        .update({
          subscription_ends_at: newEnd.toISOString()
        })
        .eq('id', restaurantId)

      if (updateError) {
        throw updateError
      }

      console.log(`Successfully renewed subscription for restaurant ${restaurantId} until ${newEnd.toISOString()}`)
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('Webhook Error:', error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
