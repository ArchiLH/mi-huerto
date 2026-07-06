import Stripe from 'https://esm.sh/stripe@14.21.0'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2023-10-16',
})

// 1. Definimos las cabeceras CORS obligatorias
const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // Permite peticiones desde localhost o cualquier dominio
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
  // 2. Respondemos inmediatamente al "Preflight" (OPTIONS) del navegador
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { user_id, email } = await req.json()

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      customer_email: email,
      line_items: [
        {
          price: Deno.env.get('STRIPE_PRICE_ID')!,
          quantity: 1,
        },
      ],
      success_url: `${Deno.env.get('APP_URL')}/success?user_id=${user_id}`,
      cancel_url: `${Deno.env.get('APP_URL')}/`,
      metadata: { user_id },
    })

    // 3. Devolvemos la URL agregando las cabeceras CORS en el éxito
    return new Response(
      JSON.stringify({ url: session.url }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    // 4. Manejo de errores por si Stripe o el JSON fallan
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})