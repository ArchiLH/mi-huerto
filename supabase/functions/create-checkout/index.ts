import Stripe from 'https://esm.sh/stripe@14.21.0'


const stripe = new Stripe(
  Deno.env.get('STRIPE_SECRET_KEY')!,
  {
    apiVersion:'2023-10-16'
  }
)


const corsHeaders = {
  'Access-Control-Allow-Origin':'*',
  'Access-Control-Allow-Headers':
  'authorization, x-client-info, apikey, content-type'
}


Deno.serve(async(req)=>{


if(req.method==="OPTIONS"){
 return new Response(
  "ok",
  {
   headers:corsHeaders
  }
 )
}


try{


const {
user_id,
email
}=await req.json()



const session =
await stripe.checkout.sessions.create({

mode:'subscription',


customer_email:
email,


line_items:[

{
price:
Deno.env.get('STRIPE_PRICE_ID')!,
quantity:1
}

],


subscription_data:{

metadata:{
user_id
}

},


metadata:{
user_id
},


success_url:
`${Deno.env.get('APP_URL')}/premium-success`,


cancel_url:
`${Deno.env.get('APP_URL')}/premium`


})



return new Response(

JSON.stringify({
url:session.url
}),

{
headers:{
...corsHeaders,
'Content-Type':'application/json'
}
}

)


}catch(error){


return new Response(

JSON.stringify({
error:error.message
}),

{
status:500,
headers:{
...corsHeaders,
'Content-Type':'application/json'
}
}

)

}


})