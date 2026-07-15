import Stripe from "https://esm.sh/stripe@14.21.0"

import {
  createClient
} from "https://esm.sh/@supabase/supabase-js@2"



const stripe = new Stripe(

  Deno.env.get("STRIPE_SECRET_KEY")!,

  {
    apiVersion: "2023-10-16"
  }

)



const supabase = createClient(

  Deno.env.get("SUPABASE_URL")!,

  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!

)





Deno.serve(async (req)=>{


  const signature = req.headers.get(
    "stripe-signature"
  )



  const body = await req.text()



  let event



  try{


    event = await stripe.webhooks.constructEventAsync(

  body,

  signature!,

  Deno.env.get(
    "STRIPE_WEBHOOK_SECRET"
  )!

)


  }catch(error){


    console.log(
      "Webhook inválido",
      error
    )


    return new Response(

      "Webhook inválido",

      {
        status:400
      }

    )

  }





  console.log(
    "Evento recibido:",
    event.type
  )







  // CREAR O ACTUALIZAR SUSCRIPCIÓN

  if(

    event.type === "customer.subscription.created"

    ||

    event.type === "customer.subscription.updated"

  ){



    const subscription =
      event.data.object



    const user_id =
      subscription.metadata?.user_id





    console.log(
      "Usuario:",
      user_id
    )





    if(user_id){



      const {error} = await supabase

      .from("user_settings")

      .upsert({


        id:user_id,


        is_premium:
          subscription.status === "active",



        stripe_customer_id:
          subscription.customer,



        stripe_subscription_id:
          subscription.id,



        subscription_status:
          subscription.status,



        subscription_end:

          new Date(

            subscription.current_period_end * 1000

          ).toISOString()


      })



      if(error){

        console.log(
          "Error actualizando usuario:",
          error
        )

      }



    }



  }







  // CANCELACIÓN

  if(

    event.type === "customer.subscription.deleted"

  ){



    const subscription =
      event.data.object



    const user_id =
      subscription.metadata?.user_id





    if(user_id){



      const {error} = await supabase

      .from("user_settings")

      .update({


        is_premium:false,


        subscription_status:"canceled"


      })

      .eq(
        "id",
        user_id
      )



      if(error){

        console.log(
          error
        )

      }


    }



  }









  // PAGO FALLIDO

  if(

    event.type === "invoice.payment_failed"

  ){



    const invoice =
      event.data.object



    const subscriptionId =
      invoice.subscription





    if(subscriptionId){



      const {error} = await supabase

      .from("user_settings")

      .update({


        subscription_status:
          "past_due"


      })

      .eq(

        "stripe_subscription_id",

        subscriptionId

      )



      if(error){

        console.log(error)

      }



    }



  }









  return new Response(

    JSON.stringify({

      received:true

    }),

    {

      headers:{

        "Content-Type":
          "application/json"

      }

    }

  )



})