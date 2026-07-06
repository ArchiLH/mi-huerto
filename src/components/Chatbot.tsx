import { useState, useRef, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

type Message = {
  role: 'user' | 'bot'
  text: string
}

const QUICK_TIPS = [
  '💧 ¿Cuándo debo regar?',
  '🌡️ Temperatura ideal para mis plantas',
  '🪲 ¿Cómo combatir plagas?',
  '🌱 Consejos para mi huerto',
  '🍅 Cuidados del tomate',
  '🥬 ¿Por qué se ponen amarillas las hojas?',
]

export default function Chatbot({ onClose }: { onClose: () => void }) {
  const { user } = useAuth()
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'bot',
      text: '¡Hola! 🌿 Soy HuertoBot, tu asistente de jardinería. Conozco tus plantas y puedo ayudarte con consejos personalizados. ¿En qué puedo ayudarte hoy?'
    }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const getPlantContext = async () => {
    if (!user) return 'El usuario no tiene plantas registradas.'

    const { data: spaces } = await supabase
      .from('spaces')
      .select('name, plant_catalog(name, min_temp, max_temp, min_humidity, max_humidity)')
      .eq('user_id', user.id)
      .not('plant_id', 'is', null)

    if (!spaces || spaces.length === 0) {
      return 'El usuario no tiene plantas registradas aún en su huerto.'
    }

    const plantList = spaces.map((s: any) => {
      const p = s.plant_catalog
      return `- ${p?.name ?? 'Planta'} en ${s.name} (temp ideal: ${p?.min_temp}°C-${p?.max_temp}°C, humedad ideal: ${p?.min_humidity}%-${p?.max_humidity}%)`
    }).join('\n')

    return `El usuario tiene estas plantas en su huerto:\n${plantList}`
  }

  const sendMessage = async (text?: string) => {
    const userMsg = (text ?? input).trim()
    if (!userMsg || loading) return

    setInput('')
    setMessages(prev => [...prev, { role: 'user', text: userMsg }])
    setLoading(true)

    const plantContext = await getPlantContext()

    const systemPrompt = `Eres HuertoBot, un asistente experto en huertos urbanos y jardinería.
Ayudas a los usuarios con consejos sobre plantas, riego, temperatura, humedad, plagas y cuidados.
Responde siempre en español, de forma amigable, clara y concisa (máximo 3 párrafos cortos).
Usa emojis ocasionalmente para hacer las respuestas más visuales y amigables.
Si el usuario pregunta sobre sus plantas específicas, usa el contexto que tienes de su huerto.

Contexto actual del huerto del usuario:
${plantContext}`

    try {
      const response = await fetch(
        'https://api.groq.com/openai/v1/chat/completions',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_GROQ_API_KEY}`,
          },
          body: JSON.stringify({
            model: 'llama-3.1-8b-instant',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userMsg }
            ],
            temperature: 0.7,
            max_tokens: 600,
          })
        }
      )

      const data = await response.json()
      const botText = data?.choices?.[0]?.message?.content
        ?? 'Lo siento, no pude procesar tu pregunta. Intenta de nuevo. 🌿'

      setMessages(prev => [...prev, { role: 'bot', text: botText }])
    } catch {
      setMessages(prev => [...prev, {
        role: 'bot',
        text: '❌ Error de conexión. Verifica tu internet e intenta de nuevo.'
      }])
    }

    setLoading(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4">

      {/* OVERLAY */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* CHAT WINDOW */}
      <div
        className="relative w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl"
        style={{ backgroundColor: '#0f2317', border: '1px solid #1a3a20' }}
      >

        {/* HEADER */}
        <div
          className="flex items-center justify-between px-4 py-3"
          style={{ backgroundColor: '#0a1a0f', borderBottom: '1px solid #1a3a20' }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-xl"
              style={{ backgroundColor: '#1a3a20' }}
            >
              🤖
            </div>
            <div>
              <p className="font-bold text-sm" style={{ color: '#a3d9a5' }}>HuertoBot</p>
              <p className="text-xs text-green-400">● Asistente IA activo</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full transition text-slate-400 hover:text-white"
            style={{ backgroundColor: '#1a3a20' }}
          >
            ✕
          </button>
        </div>

        {/* MENSAJES */}
        <div className="h-80 overflow-y-auto p-4 space-y-3">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'bot' && (
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-sm shrink-0 mt-1"
                  style={{ backgroundColor: '#1a3a20' }}
                >
                  🌿
                </div>
              )}
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-green-600 text-white rounded-br-sm'
                    : 'text-slate-200 rounded-bl-sm'
                }`}
                style={msg.role === 'bot' ? { backgroundColor: '#1a3a20' } : {}}
              >
                {msg.text}
              </div>
            </div>
          ))}

          {/* TYPING INDICATOR */}
          {loading && (
            <div className="flex gap-2 justify-start">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-sm shrink-0"
                style={{ backgroundColor: '#1a3a20' }}
              >
                🌿
              </div>
              <div
                className="rounded-2xl rounded-bl-sm px-4 py-3"
                style={{ backgroundColor: '#1a3a20' }}
              >
                <div className="flex gap-1 items-center">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* SUGERENCIAS RÁPIDAS */}
        {messages.length === 1 && (
          <div
            className="px-4 py-2 flex gap-2 flex-wrap"
            style={{ borderTop: '1px solid #1a3a20' }}
          >
            {QUICK_TIPS.map((tip, i) => (
              <button
                key={i}
                onClick={() => sendMessage(tip)}
                className="text-xs px-3 py-1.5 rounded-full transition hover:opacity-80"
                style={{
                  border: '1px solid #2a5a30',
                  color: '#a3d9a5',
                  backgroundColor: '#0a1a0f'
                }}
              >
                {tip}
              </button>
            ))}
          </div>
        )}

        {/* INPUT */}
        <div
          className="p-3 flex gap-2"
          style={{ borderTop: '1px solid #1a3a20' }}
        >
          <input
            ref={inputRef}
            type="text"
            placeholder="Pregunta sobre tus plantas..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendMessage()}
            className="flex-1 text-sm px-4 py-2.5 rounded-xl outline-none text-white placeholder-slate-500"
            style={{
              backgroundColor: '#0a1a0f',
              border: '1px solid #1a3a20'
            }}
          />
          <button
            onClick={() => sendMessage()}
            disabled={loading || !input.trim()}
            className="text-white px-4 py-2.5 rounded-xl transition font-bold disabled:opacity-40"
            style={{ backgroundColor: '#2d6a35' }}
          >
            ↑
          </button>
        </div>

      </div>
    </div>
  )
}