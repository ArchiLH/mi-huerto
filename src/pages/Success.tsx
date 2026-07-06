import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Success() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [counting, setCounting] = useState(5)

  useEffect(() => {
    const userId = searchParams.get('user_id')
    if (userId) activatePremium(userId)

    const countdown = setInterval(() => {
      setCounting(prev => {
        if (prev <= 1) {
          clearInterval(countdown)
          navigate('/')
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(countdown)
  }, [])

  const activatePremium = async (userId: string) => {
    await supabase
      .from('user_settings')
      .upsert({
        id: userId,
        is_premium: true,
      })
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-6 text-center"
      style={{ backgroundColor: '#0a1a0f' }}
    >
      {/* ICONO ÉXITO */}
      <div
        className="w-28 h-28 rounded-full flex items-center justify-center text-6xl mb-6 shadow-lg"
        style={{ backgroundColor: '#0f2317', border: '2px solid #2d6a35' }}
      >
        ⭐
      </div>

      {/* TÍTULO */}
      <h1 className="text-3xl font-bold text-white mb-2">
        ¡Bienvenido a Premium!
      </h1>
      <p className="text-lg mb-6" style={{ color: '#a3d9a5' }}>
        Tu compra fue exitosa 🎉
      </p>

      {/* BENEFICIOS */}
      <div
        className="rounded-2xl p-5 w-full max-w-sm mb-6 space-y-3 text-left"
        style={{ backgroundColor: '#0f2317', border: '1px solid #1a3a20' }}
      >
        <p className="font-semibold text-white mb-2">✨ Ahora tienes acceso a:</p>
        {[
          '🏡 8 espacios de cultivo',
          '📡 Sensores ilimitados',
          '📊 Historial completo',
          '🔔 Alertas en Telegram',
          '🤖 Asistente IA HuertoBot',
          '🧪 Simulador avanzado',
        ].map((item, i) => (
          <div key={i} className="flex items-center gap-2 text-sm" style={{ color: '#a3d9a5' }}>
            <span className="text-green-400">✓</span>
            {item}
          </div>
        ))}
      </div>

      {/* COUNTDOWN */}
      <p className="text-sm mb-4" style={{ color: '#6b9e6e' }}>
        Redirigiendo al inicio en <span className="text-white font-bold">{counting}</span> segundos...
      </p>

      <button
        onClick={() => navigate('/')}
        className="w-full max-w-sm text-white font-bold py-4 rounded-2xl transition"
        style={{ backgroundColor: '#2d6a35' }}
      >
        Ir a Mi Huerto ahora 🌿
      </button>
    </div>
  )
}