import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Capacitor } from '@capacitor/core'

export default function Success() {
  const [searchParams] = useSearchParams()
  const [counting, setCounting] = useState(5)
  const [, setActivated] = useState(false)
  const isNative = Capacitor.isNativePlatform()

  useEffect(() => {
    const userId = searchParams.get('user_id')
    if (userId) activatePremium(userId)

    // Si por alguna razón extraña la app nativa llega a abrir esta página web, 
    // forzamos la apertura del deep link inmediatamente.
    if (isNative && userId) {
      window.location.href = `com.mihuerto.app://success?user_id=${userId}`
      return
    }

    const countdown = setInterval(() => {
      setCounting(prev => {
        if (prev <= 1) {
          clearInterval(countdown)
          window.location.href = '/'
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(countdown)
  }, [isNative, searchParams])

  const activatePremium = async (userId: string) => {
    await supabase
      .from('user_settings')
      .upsert({
        id: userId,
        is_premium: true,
      })
    setActivated(true)
  }

  const handleOpenAppManually = () => {
    const userId = searchParams.get('user_id') ?? ''
    window.location.href = `com.mihuerto.app://success?user_id=${userId}`
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-6 text-center"
      style={{ backgroundColor: '#0a1a0f' }}
    >
      <div
        className="w-28 h-28 rounded-full flex items-center justify-center text-6xl mb-6 shadow-lg"
        style={{ backgroundColor: '#0f2317', border: '2px solid #2d6a35' }}
      >
        ⭐
      </div>

      <h1 className="text-3xl font-bold text-white mb-2">
        ¡Bienvenido a Premium!
      </h1>
      <p className="text-lg mb-6" style={{ color: '#a3d9a5' }}>
        Tu suscripción fue activada exitosamente 🎉
      </p>

      {/* Botón visible solo si se quedaron en el navegador web del celular */}
      <div className="w-full max-w-sm space-y-3 mb-6">
        <button
          onClick={handleOpenAppManually}
          className="w-full text-white font-bold py-4 rounded-2xl transition cursor-pointer shadow-lg bg-emerald-600 hover:bg-emerald-700"
        >
          📱 Abrir en la App de Mi Huerto
        </button>
      </div>

      <p className="text-sm mb-4" style={{ color: '#6b9e6e' }}>
        Redirigiendo a tu huerto en <span className="text-white font-bold">{counting}</span> segundos...
      </p>
    </div>
  )
}