import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

type Reading = {
  id: number
  temperature: number
  humidity: number
  recorded_at: string
  sensors?: {
    name: string
    spaces?: { name: string } | null
  } | null
}

export default function Historial() {
  const { user } = useAuth()
  const [readings, setReadings] = useState<Reading[]>([])
  const [loading, setLoading] = useState(true)

  const loadReadings = async () => {
    if (!user) return

    const { data } = await supabase
      .from('readings')
      .select(`
        *,
        sensors (
          name,
          spaces ( name )
        )
      `)
      .order('recorded_at', { ascending: false })
      .limit(50)

    setReadings((data as Reading[]) ?? [])
    setLoading(false)
  }

  useEffect(() => { loadReadings() }, [])

  return (
    <div className="space-y-5">

      <div>
        <h1 className="text-2xl font-bold">📊 Historial</h1>
        <p className="text-slate-400 text-sm mt-1">
          Últimas 50 lecturas de tus sensores
        </p>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-16 bg-slate-800 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : readings.length === 0 ? (
        <div className="bg-slate-900 rounded-2xl p-10 text-center">
          <p className="text-4xl mb-3">📊</p>
          <p className="text-slate-400">No hay lecturas aún</p>
          <p className="text-slate-500 text-sm mt-1">
            Las lecturas aparecerán cuando tus sensores envíen datos
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {readings.map(reading => (
            <div
              key={reading.id}
              className="bg-slate-900 rounded-2xl px-4 py-3 flex items-center justify-between"
            >
              <div>
                <p className="text-sm font-medium">
                  {reading.sensors?.spaces?.name ?? 'Espacio'}
                </p>
                <p className="text-xs text-slate-400">
                  {reading.sensors?.name} ·{' '}
                  {new Date(reading.recorded_at).toLocaleString('es-PE', {
                    day: '2-digit', month: '2-digit',
                    hour: '2-digit', minute: '2-digit'
                  })}
                </p>
              </div>
              <div className="flex gap-3 text-sm">
                <span className="text-orange-400">
                  🌡️ {reading.temperature.toFixed(1)}°C
                </span>
                <span className="text-blue-400">
                  💧 {reading.humidity.toFixed(1)}%
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}