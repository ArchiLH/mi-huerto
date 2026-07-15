import "https://deno.land/x/xhr@0.1.0/mod.ts"

import {
  createClient
} from "https://esm.sh/@supabase/supabase-js@2"



const corsHeaders = {

  "Access-Control-Allow-Origin": "*",

  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",

}






Deno.serve(async (req) => {



  // ==========================
  // CORS
  // ==========================

  if(req.method === "OPTIONS"){

    return new Response(
      "ok",
      {
        headers:corsHeaders
      }
    )

  }





  try{



    // ==========================
    // VALIDAR USUARIO LOGUEADO
    // ==========================


    const authHeader =
      req.headers.get(
        "Authorization"
      )



    if(!authHeader){


      return new Response(

        JSON.stringify({

          error:"Usuario no autenticado"

        }),

        {
          status:401,
          headers:{
            ...corsHeaders,
            "Content-Type":"application/json"
          }
        }

      )

    }




    const supabase =
      createClient(

        Deno.env.get(
          "SUPABASE_URL"
        )!,


        Deno.env.get(
          "SUPABASE_ANON_KEY"
        )!,


        {

          global:{

            headers:{

              Authorization:
              authHeader

            }

          }

        }

      )





    const {
      data:{
        user
      },

      error:userError

    } =
    await supabase.auth.getUser()





    if(userError || !user){


      return new Response(

        JSON.stringify({

          error:"Sesión inválida"

        }),

        {
          status:401,
          headers:{
            ...corsHeaders,
            "Content-Type":"application/json"
          }
        }

      )

    }







    // ==========================
    // RECIBIR MENSAJES
    // ==========================


    const body =
      await req.json()



    const messages =
      body.messages





    if(!messages){


      return new Response(

        JSON.stringify({

          error:"No existen mensajes"

        }),

        {
          status:400,

          headers:{
            ...corsHeaders,
            "Content-Type":"application/json"
          }
        }

      )

    }







    // ==========================
    // GROQ
    // ==========================


    const GROQ_KEY =
      Deno.env.get(
        "GROQ_API_KEY"
      )





    if(!GROQ_KEY){


      throw new Error(
        "No existe GROQ_API_KEY"
      )

    }







    const groqResponse =
      await fetch(

        "https://api.groq.com/openai/v1/chat/completions",

        {


          method:"POST",


          headers:{


            "Content-Type":
            "application/json",


            Authorization:
            `Bearer ${GROQ_KEY}`


          },



          body:JSON.stringify({


            model:
            "llama-3.1-8b-instant",



            messages,



            temperature:
            0.7,



            max_tokens:
            600



          })


        }

      )







    const data =
      await groqResponse.json()





    return new Response(

      JSON.stringify(data),

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



    console.error(
      error
    )



    return new Response(

      JSON.stringify({

        error:
        error.message

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