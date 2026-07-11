import { supabase } from "./supabase"


export async function handlePurchase(
  userId: string,
  email: string
) {

  const {
    data: {
      session
    }
  } = await supabase.auth.getSession()


  const response = await fetch(
    "https://fdayefjmebnsrxbkuetq.supabase.co/functions/v1/create-checkout",
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json",

        Authorization:
          `Bearer ${session?.access_token}`,

        apikey:
          import.meta.env.VITE_SUPABASE_ANON_KEY
      },

      body: JSON.stringify({
        user_id: userId,
        email
      })
    }
  )


  const data = await response.json()


  if (data.error) {

    throw new Error(data.error)

  }


  if (data.url) {

    window.location.href = data.url

    return {
      success: true
    }

  }


  return {
    success: false
  }

}