import { useState, useRef, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

type Message = {
  role: 'user' | 'bot'
  text: string
}

const QUICK_TIPS = [
  '💧 ¿Cuándo debo regar?',
  '🍅 Cuidados del tomate',
  '🥬 Hojas amarillas',
  '🌱 Consejos generales',
]

export default function Chatbot({ onClose }: { onClose: () => void }) {
  const { user } = useAuth()

  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'bot',
      text: '¡Hola! 🌿 Soy tu asistente de Secret Garden. ¿En qué te puedo ayudar hoy?'
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

    const { data: spaces, error } = await supabase
      .from('spaces')
      .select(`
        name,
        plant_catalog(name, min_temp, max_temp, min_humidity, max_humidity)
      `)
      .eq('user_id', user.id)
      .not('plant_id', 'is', null)

    if (error || !spaces || spaces.length === 0) {
      return 'El usuario todavía no tiene plantas registradas.'
    }

    return spaces.map((space: any) => {
      const plant = space.plant_catalog
      return `🌱 ${plant?.name ?? 'Planta'} (${space.name}): Temp ${plant?.min_temp ?? '-'}°C-${plant?.max_temp ?? '-'}°C, Hum ${plant?.min_humidity ?? '-'}%-${plant?.max_humidity ?? '100'}%`
    }).join('\n')
  }

  const sendMessage = async (text?: string) => {
    const userMsg = (text ?? input).trim()
    if (!userMsg || loading) return

    setInput('')
    setMessages(prev => [...prev, { role: 'user', text: userMsg }])
    setLoading(true)

    const plantContext = await getPlantContext()
    const systemPrompt = `Eres el Asistente IA de Secret Garden 🌿 experto en agricultura inteligente. Responde de forma clara y en español basándote en:\n${plantContext}`

    try {
      const { data, error } = await supabase.functions.invoke('huerto-bot', {
        body: {
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMsg }
          ]
        }
      })

      if (error) throw error
      const botText = data?.choices?.[0]?.message?.content ?? '🌱 No pude generar una respuesta.'
      setMessages(prev => [...prev, { role: 'bot', text: botText }])
    } catch (error) {
      console.error(error)
      setMessages(prev => [...prev, { role: 'bot', text: '❌ Error conectando con el asistente.' }])
    } finally {
      setLoading(false)
    }
  }

  return (
    /* CUADRO PRINCIPAL (Esquinas redondeadas suaves y bordes limpios como tu app) */
    <div className="w-full bg-white rounded-[1.5rem] overflow-hidden shadow-lg border border-slate-200/60 flex flex-col h-[440px]">
      
      {/* CABECERA VERDE RECTA CON LOGO */}
      <div className="bg-[#00c86f] px-4 py-3 flex items-center justify-between text-white shrink-0">
        <div className="flex items-center gap-2">
          {/* Logo circular */}
          <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center p-0.5 shadow-xs">
            <span className="text-lg">🪴</span>
          </div>
          <div>
            <h3 className="font-bold text-sm tracking-tight">Asistente Secret Garden</h3>
            <p className="text-[10px] text-emerald-100 flex items-center gap-1 font-medium">
              <span className="w-1.5 h-1.5 bg-emerald-300 rounded-full inline-block"></span>
              En línea
            </p>
          </div>
        </div>
        
        {/* Botón cerrar cabecera */}
        <button onClick={onClose} className="text-white/80 hover:text-white transition p-1 text-sm">
          ✕
        </button>
      </div>

      {/* ÁREA DE MENSAJES (Fondo blanco/gris sutil con burbujas de bordes redondeados estándar) */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#fbfdfc]">
        {messages.map((msg, i) => (
          <div key={i} className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] rounded-[1rem] px-4 py-2.5 text-xs font-medium leading-relaxed shadow-3xs border ${
                msg.role === 'user'
                  ? 'bg-[#009660] text-white border-transparent'
                  : 'bg-white text-slate-700 border-slate-100'
              }`}
            >
              {msg.text}
            </div>
          </div>
        ))}

        {loading && (
          <div className="text-[11px] text-emerald-600 font-bold animate-pulse pl-1">
            🌱 Escribiendo...
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* SUGERENCIAS RÁPIDAS */}
      {messages.length === 1 && (
        <div className="px-4 py-1.5 bg-[#fbfdfc] flex flex-wrap gap-1 shrink-0">
          {QUICK_TIPS.map((tip, i) => (
            <button
              key={i}
              onClick={() => sendMessage(tip)}
              className="text-[10px] font-medium px-2.5 py-1 bg-slate-50 border border-slate-200 text-slate-500 rounded-full active:scale-95 transition-all"
            >
              {tip}
            </button>
          ))}
        </div>
      )}

      {/* ENTRADA DE TEXTO Y ENVIAR (IDÉNTICO A LA FOTO 1) */}
      <div className="p-4 bg-white border-t border-slate-100 flex items-center gap-3 shrink-0">
        <input
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && sendMessage()}
          placeholder="Escribe tu pregunta..."
          className="flex-1 bg-[#f4f6f5] border border-slate-200/70 text-slate-800 placeholder-slate-400 rounded-2xl px-4 py-2.5 outline-none text-xs"
        />
        
        {/* Botón circular verde menta claro con avioncito */}
        <button
          disabled={loading}
          onClick={() => sendMessage()}
          className="w-9 h-9 bg-[#8adcb3] text-white rounded-full flex items-center justify-center shadow-2xs active:scale-90 disabled:opacity-50 transition-all shrink-0"
        >
          <svg className="w-4 h-4 text-white transform rotate-45 -translate-x-0.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
          </svg>
        </button>
      </div>

    </div>
  )
}