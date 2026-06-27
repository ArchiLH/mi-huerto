const TOKEN = import.meta.env.VITE_TELEGRAM_TOKEN

export async function sendTelegramAlert(message: string, chatId: string) {
  if (!chatId) return
  try {
    await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML',
      }),
    })
  } catch (error) {
    console.error('Error enviando Telegram:', error)
  }
}