import Stripe from "https://esm.sh/stripe@14.21.0"



const stripe = new Stripe(

  Deno.env.get("STRIPE_SECRET_KEY")!,

  {
    apiVersion: "2023-10-16"
  }

)





const corsHeaders = {

  "Access-Control-Allow-Origin":"*",

  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type"

}





Deno.serve(async(req)=>{



  // CORS

  if(req.method === "OPTIONS"){


    return new Response(

      "ok",

      {
        headers:corsHeaders
      }

    )

  }





  try{



    const body = await req.json()



    const user_id = body.user_id

    const email = body.email





    console.log(
      "Checkout usuario:",
      user_id
    )





    if(!user_id || !email){


      return new Response(

        JSON.stringify({

          error:
          "Falta user_id o email"

        }),

        {

          status:400,

          headers:{

            ...corsHeaders,

            "Content-Type":
              "application/json"

          }

        }

      )


    }







    const session =

    await stripe.checkout.sessions.create({



      mode:"subscription",





      customer_email:

        email,





      line_items:[


        {

          price:

          Deno.env.get(
            "STRIPE_PRICE_ID"
          )!,


          quantity:1

        }


      ],





      // Metadata del checkout

      metadata:{


        user_id:user_id


      },





      // Metadata que llegará al webhook

      subscription_data:{


        metadata:{


          user_id:user_id


        }


      },







      success_url:

        `${Deno.env.get(
          "APP_URL"
        )}/premium-success`,





      cancel_url:

        `${Deno.env.get(
          "APP_URL"
        )}/premium`



    })








    console.log(

      "Checkout creado:",

      session.id

    )








    return new Response(



      JSON.stringify({


        url:
        session.url


      }),



      {


        status:200,


        headers:{


          ...corsHeaders,


          "Content-Type":
          "application/json"


        }


      }



    )







  }catch(error){



    console.log(
      "ERROR CHECKOUT:",
      error
    )



    return new Response(



      JSON.stringify({


        error:
        error instanceof Error
        ? error.message
        : "Error desconocido"



      }),



      {


        status:500,


        headers:{


          ...corsHeaders,


          "Content-Type":
          "application/json"


        }


      }



    )



  }



})