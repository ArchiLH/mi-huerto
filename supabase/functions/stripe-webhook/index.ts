import Stripe from "https://esm.sh/stripe@14.21.0"

import {
 createClient
} from "https://esm.sh/@supabase/supabase-js@2"



const stripe =
new Stripe(

 Deno.env.get(
  "STRIPE_SECRET_KEY"
 )!,

 {
  apiVersion:"2023-10-16"
 }

)



const supabase =
createClient(

 Deno.env.get(
  "SUPABASE_URL"
 )!,

 Deno.env.get(
  "SUPABASE_SERVICE_ROLE_KEY"
 )!

)




Deno.serve(async(req)=>{


const signature =
req.headers.get(
 "stripe-signature"
)



const body =
await req.text()



let event:Stripe.Event



try{


event =
stripe.webhooks.constructEvent(

 body,

 signature!,

 Deno.env.get(
  "STRIPE_WEBHOOK_SECRET"
 )!

)



}catch(error){


return new Response(

"Webhook inválido",

{
status:400
}

)

}





// CREAR O ACTUALIZAR SUSCRIPCIÓN

if(

event.type ===
"customer.subscription.created"

||

event.type ===
"customer.subscription.updated"

){



const subscription =
event.data.object
as Stripe.Subscription




const user_id =
subscription.metadata.user_id




if(user_id){



await supabase

.from(
 "user_settings"
)

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

subscription.current_period_end
*1000

)
.toISOString()



})



}



}






// CANCELACIÓN

if(

event.type ===
"customer.subscription.deleted"

){


const subscription =
event.data.object
as Stripe.Subscription



const user_id =
subscription.metadata.user_id




if(user_id){


await supabase

.from(
 "user_settings"
)

.update({

is_premium:false,

subscription_status:
"canceled"

})

.eq(
"id",
user_id
)


}


}




// PAGO FALLIDO

if(

event.type ===
"invoice.payment_failed"

){


const invoice =
event.data.object
as Stripe.Invoice



const subscriptionId =
invoice.subscription



if(subscriptionId){



await supabase

.from(
"user_settings"
)

.update({

subscription_status:
"past_due"

})

.eq(
"stripe_subscription_id",
subscriptionId
)


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