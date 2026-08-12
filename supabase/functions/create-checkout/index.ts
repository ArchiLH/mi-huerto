import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const urlParams = new URL(req.url).searchParams
    
    // Manejo de redirección cuando Stripe regresa
    if (urlParams.get('success') === 'true') {
      const successUserId = urlParams.get('user_id')
      const isNative = urlParams.get('is_native') === 'true'

      if (isNative) {
        // Solo para Android / Nox / App nativa
        return Response.redirect(`com.mihuerto.app://success?user_id=${successUserId}`, 303)
      } else {
        // Para web normal / PC
        const appUrl = Deno.env.get("APP_URL") || "https://fdayefjmebnsrxbkuetq.supabase.co"
        return Response.redirect(`${appUrl}/success?user_id=${successUserId}`, 303)
      }
    }

    if (urlParams.get('cancel') === 'true') {
      const isNative = urlParams.get('is_native') === 'true'
      if (isNative) {
        return Response.redirect(`com.mihuerto.app://configuracion`, 303)
      } else {
        const appUrl = Deno.env.get("APP_URL") || "https://fdayefjmebnsrxbkuetq.supabase.co"
        return Response.redirect(`${appUrl}/configuracion`, 303)
      }
    }

    const { user_id, email, platform } = await req.json()

    if (!user_id || !email) {
      return new Response(
        JSON.stringify({ error: 'Faltan datos obligatorios (user_id o email)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY")
    const priceId = Deno.env.get("STRIPE_PRICE_ID")
    const appUrl = Deno.env.get("APP_URL") || "https://fdayefjmebnsrxbkuetq.supabase.co"

    if (!stripeSecretKey || !priceId) {
      throw new Error("Faltan configurar las variables de entorno de Stripe en Supabase.")
    }

    const isNativePlatform = platform === 'android' || platform === 'ios'

    // Definimos las URLs de retorno dependiendo de si es la app o la web
    const successUrl = isNativePlatform
      ? `${appUrl}/functions/v1/create-checkout?success=true&user_id=${user_id}&is_native=true`
      : `${appUrl}/success?user_id=${user_id}&is_native=false`

    const cancelUrl = isNativePlatform
      ? `${appUrl}/functions/v1/create-checkout?cancel=true&is_native=true`
      : `${appUrl}/configuracion?is_native=false`

    const bodyParams = new URLSearchParams({
      'mode': 'subscription',
      'customer_email': email,
      'line_items[0][price]': priceId,
      'line_items[0][quantity]': '1',
      'success_url': successUrl,
      'cancel_url': cancelUrl,
      'metadata[user_id]': user_id,
      'subscription_data[metadata[user_id]]': user_id,
    })

    const stripeResponse = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeSecretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: bodyParams.toString(),
    })

    const session = await stripeResponse.json()

    if (!stripeResponse.ok) {
      throw new Error(session.error?.message || 'Error al conectar con la API de Stripe')
    }

    return new Response(
      JSON.stringify({ url: session.url }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error: any) {
    console.error("Error en create-checkout:", error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})