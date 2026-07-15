import Stripe from "https://esm.sh/stripe@14.21.0"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"


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


  const signature =
    req.headers.get("stripe-signature")


  const body =
    await req.text()


  let event



  try {


    event =
      await stripe.webhooks.constructEventAsync(
        body,
        signature!,
        Deno.env.get("STRIPE_WEBHOOK_SECRET")!
      )


  } catch(error){


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





  console.log("==============================")
  console.log(
    "Evento recibido:",
    event.type
  )
  console.log("==============================")






  // ======================================
  // CREAR / ACTUALIZAR SUSCRIPCIÓN
  // ======================================


  if(

    event.type === "customer.subscription.created" ||

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


    console.log(
      "Estado Stripe:",
      subscription.status
    )


    console.log(
      "Subscription:",
      subscription.id
    )



    if(user_id){



      const {error}=

      await supabase

      .from("user_settings")

      .upsert({



        id:user_id,



        // Solo Premium si Stripe confirma

        is_premium:

          subscription.status === "active" ||

          subscription.status === "trialing",




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
          "❌ Error actualizando usuario:",
          error
        )


      }else{


        console.log(
          "✅ Suscripción guardada"
        )


      }



    }


  }









  // ======================================
  // PAGO CONFIRMADO
  // ======================================


  if(

    event.type === "invoice.paid" ||

    event.type === "invoice.payment_succeeded"

  ){



    const invoice =
      event.data.object



    const subscriptionId =
      invoice.subscription




    console.log(
      "Pago confirmado"
    )


    console.log(
      "Subscription:",
      subscriptionId
    )





    if(subscriptionId){



      const {error}=

      await supabase

      .from("user_settings")

      .update({


        is_premium:true,


        subscription_status:"active"



      })

      .eq(

        "stripe_subscription_id",

        subscriptionId

      )





      if(error){


        console.log(
          "❌ Error activando Premium:",
          error
        )


      }else{


        console.log(
          "✅ Premium activado correctamente"
        )


      }



    }



  }









  // ======================================
  // CANCELACIÓN
  // ======================================


  if(

    event.type === "customer.subscription.deleted"

  ){



    const subscription =
      event.data.object



    const user_id =
      subscription.metadata?.user_id





    console.log(
      "Cancelación usuario:",
      user_id
    )





    if(user_id){



      const {error}=

      await supabase

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
          "❌ Error cancelando:",
          error
        )


      }else{


        console.log(
          "✅ Usuario cambiado a Free"
        )


      }



    }



  }









  // ======================================
  // PAGO FALLIDO
  // ======================================


  if(

    event.type === "invoice.payment_failed"

  ){



    const invoice =
      event.data.object



    const subscriptionId =
      invoice.subscription




    console.log(
      "Pago fallido:",
      subscriptionId
    )





    if(subscriptionId){



      const {error}=

      await supabase

      .from("user_settings")

      .update({



        subscription_status:"past_due"



      })

      .eq(

        "stripe_subscription_id",

        subscriptionId

      )





      if(error){


        console.log(
          "❌ Error pago fallido:",
          error
        )


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