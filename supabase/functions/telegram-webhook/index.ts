import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const TELEGRAM_TOKEN = Deno.env.get('TELEGRAM_TOKEN')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

Deno.serve(async (req) => {
  const body = await req.json()
  const message = body?.message
  if (!message) return new Response('ok')

  const chatId = String(message.chat.id)
  const text = (message.text ?? '').trim()
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

  if (text.startsWith('/start ')) {
    const code = text.replace('/start ', '').trim()

    const { data: codeData } = await supabase
      .from('telegram_codes')
      .select('*')
      .eq('code', code)
      .eq('used', false)
      .single()

    if (!codeData) {
      await sendMessage(chatId, '❌ Código inválido o ya usado. Genera uno nuevo desde la app.')
      return new Response('ok')
    }

    await supabase
      .from('user_settings')
      .upsert({
        id: codeData.user_id,
        telegram_chat_id: chatId,
        telegram_enabled: true,
      })

    await supabase
      .from('telegram_codes')
      .update({ used: true })
      .eq('code', code)

    await sendMessage(chatId, '✅ <b>¡Mi Huerto conectado!</b>\n\nA partir de ahora recibirás alertas cuando tus plantas necesiten cuidado. 🌿')
    return new Response('ok')
  }

  await sendMessage(chatId, '🌿 <b>Mi Huerto Bot</b>\n\nPara conectar tu cuenta, ve a la app y toca "Conectar Telegram".')
  return new Response('ok')
})

async function sendMessage(chatId: string, text: string) {
  await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
  })
}