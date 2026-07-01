import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

type Alert = {
  id: number
  type: string
  value: number
  threshold: number
  care_message: string | null
  created_at: string
  sensor_id: number
}

const alertTypeTitle: Record<string, string> = {
  temp_high: '🌡️ Temperatura muy alta',
  temp_low: '🥶 Temperatura muy baja',
  humidity_high: '💧 Exceso de humedad',
  humidity_low: '🏜️ Poca humedad',
}

function playAlertSound() {
  const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
  const notes = [440, 550, 660, 880]
  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.value = freq
    osc.type = 'sine'
    gain.gain.setValueAtTime(0.3, ctx.currentTime + i * 0.15)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.15 + 0.3)
    osc.start(ctx.currentTime + i * 0.15)
    osc.stop(ctx.currentTime + i * 0.15 + 0.3)
  })
}

export default function AlertPopup() {
  const { user } = useAuth()
  const [popup, setPopup] = useState<Alert | null>(null)
  const [dismissing, setDismissing] = useState(false)
  const lastChecked = useRef<string>(new Date().toISOString())
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!user) return
    checkNewAlerts()
    intervalRef.current = setInterval(checkNewAlerts, 30000)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [user])

  const checkNewAlerts = async () => {
    if (!user) return

    // Obtener espacios del usuario
    const { data: spaces } = await supabase
      .from('spaces')
      .select('id')
      .eq('user_id', user.id)

    if (!spaces || spaces.length === 0) return

    const spaceIds = spaces.map(s => s.id)

    // Obtener sensores
    const { data: sensors } = await supabase
      .from('sensors')
      .select('id')
      .in('space_id', spaceIds)

    if (!sensors || sensors.length === 0) return

    const sensorIds = sensors.map(s => s.id)

    // Buscar alertas nuevas no reconocidas
    const { data: alerts } = await supabase
      .from('alerts')
      .select('*')
      .in('sensor_id', sensorIds)
      .eq('acknowledged', false)
      .gt('created_at', lastChecked.current)
      .order('created_at', { ascending: false })
      .limit(1)

    if (alerts && alerts.length > 0) {
      lastChecked.current = new Date().toISOString()
      setPopup(alerts[0] as Alert)
      playAlertSound()
    }
  }

  const dismiss = async () => {
    if (!popup) return
    setDismissing(true)

    await supabase
      .from('alerts')
      .update({ acknowledged: true })
      .eq('id', popup.id)

    setTimeout(() => {
      setPopup(null)
      setDismissing(false)
    }, 300)
  }

  if (!popup) return null

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all ${
      dismissing ? 'opacity-0' : 'opacity-100'
    }`}>
      {/* OVERLAY */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={dismiss} />

      {/* POPUP */}
      <div className={`relative bg-slate-900 border-2 border-amber-500/50 rounded-3xl p-6 w-full max-w-sm shadow-2xl shadow-amber-500/20 transition-all ${
        dismissing ? 'scale-95' : 'scale-100'
      }`}>

        {/* ICONO ALERTA */}
        <div className="flex justify-center mb-4">
          <div className="w-20 h-20 rounded-full bg-amber-500/20 border-2 border-amber-500/50 flex items-center justify-center animate-pulse">
            <span className="text-4xl">⚠️</span>
          </div>
        </div>

        {/* TÍTULO */}
        <h2 className="text-xl font-bold text-center text-amber-400 mb-1">
          ¡Alerta en tu huerto!
        </h2>
        <p className="text-center text-white font-semibold mb-4">
          {alertTypeTitle[popup.type] ?? '⚠️ Alerta'}
        </p>

        {/* VALORES */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <div className="bg-slate-800 rounded-xl p-3 text-center">
            <p className="text-xs text-slate-400 mb-1">Valor detectado</p>
            <p className="font-bold text-red-400 text-lg">
              {popup.value.toFixed(1)}{popup.type.includes('temp') ? '°C' : '%'}
            </p>
          </div>
          <div className="bg-slate-800 rounded-xl p-3 text-center">
            <p className="text-xs text-slate-400 mb-1">Umbral normal</p>
            <p className="font-bold text-green-400 text-lg">
              {popup.threshold.toFixed(1)}{popup.type.includes('temp') ? '°C' : '%'}
            </p>
          </div>
        </div>

        {/* RECOMENDACIÓN */}
        {popup.care_message && (
          <div className="bg-green-900/30 border border-green-500/30 rounded-xl p-4 mb-4">
            <p className="text-xs text-green-400 font-semibold mb-1">💡 ¿Qué hacer?</p>
            <p className="text-sm text-slate-300">{popup.care_message}</p>
          </div>
        )}

        {/* BOTÓN */}
        <button
          onClick={dismiss}
          className="w-full bg-amber-500 hover:bg-amber-400 text-black font-bold py-3 rounded-xl transition text-sm"
        >
          ✅ Entendido — Apagar alerta
        </button>

        <p className="text-xs text-slate-500 text-center mt-3">
          {new Date(popup.created_at).toLocaleString('es-PE', {
            day: '2-digit', month: '2-digit',
            hour: '2-digit', minute: '2-digit'
          })}
        </p>
      </div>
    </div>
  )
}