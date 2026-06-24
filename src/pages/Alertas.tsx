import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

type Alert = {
  id: number
  sensor_id: number
  type: string
  value: number
  threshold: number
  care_message: string | null
  acknowledged: boolean
  created_at: string
  sensors?: {
    spaces?: {
      name: string
      plant_catalog?: { name: string; emoji: string } | null
    } | null
  } | null
}

const alertTypeTitle: Record<string, string> = {
  temp_high: 'Demasiado calor',
  temp_low: 'Demasiado frío',
  humidity_high: 'Exceso de humedad',
  humidity_low: 'Poca humedad',
}

const alertTypeIcon: Record<string, string> = {
  temp_high: '🌡️',
  temp_low: '🥶',
  humidity_high: '💧',
  humidity_low: '🏜️',
}

export default function Alertas() {
  const { user } = useAuth()
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'pending' | 'all'>('pending')

  useEffect(() => {
    loadAlerts()
  }, [])

  const loadAlerts = async () => {
    if (!user) return

    const { data, error } = await supabase
      .from('alerts')
      .select(`
        *,
        sensors (
          spaces (
            name,
            plant_catalog (name, emoji)
          )
        )
      `)
      .order('created_at', { ascending: false })

    if (error) { console.error(error); return }
    setAlerts((data as Alert[]) ?? [])
    setLoading(false)
  }

  const acknowledge = async (id: number) => {
    await supabase
      .from('alerts')
      .update({ acknowledged: true })
      .eq('id', id)

    setAlerts(prev =>
      prev.map(a => a.id === id ? { ...a, acknowledged: true } : a)
    )
  }

  const pending = alerts.filter(a => !a.acknowledged)
  const displayed = tab === 'pending' ? pending : alerts

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-28 bg-slate-800 rounded-2xl animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-5">

      {/* HEADER */}
      <div>
        <h1 className="text-2xl font-bold">🔔 Alertas</h1>
        <p className="text-slate-400 text-sm mt-1">
          Cuando una planta necesita cuidado, te avisamos aquí
        </p>
      </div>

      {/* TABS */}
      <div className="flex gap-2 bg-slate-900 p-1 rounded-xl">
        <button
          onClick={() => setTab('pending')}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
            tab === 'pending' ? 'bg-green-600 text-white' : 'text-slate-400'
          }`}
        >
          Pendientes
          {pending.length > 0 && (
            <span className="ml-2 bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5">
              {pending.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab('all')}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
            tab === 'all' ? 'bg-green-600 text-white' : 'text-slate-400'
          }`}
        >
          Todas ({alerts.length})
        </button>
      </div>

      {/* LISTA */}
      {displayed.length === 0 ? (
        <div className="bg-slate-900 rounded-2xl p-10 text-center">
          <p className="text-4xl mb-3">✅</p>
          <p className="font-medium">¡Todo al día!</p>
          <p className="text-slate-400 text-sm mt-1">
            {tab === 'pending' ? 'No tienes alertas pendientes' : 'No hay alertas registradas'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayed.map(alert => {
            const space = alert.sensors?.spaces
            const plant = space?.plant_catalog
            return (
              <div
                key={alert.id}
                className={`rounded-2xl p-4 border ${
                  !alert.acknowledged
                    ? 'border-l-4 border-l-amber-500 border-amber-500/20 bg-amber-500/5'
                    : 'border-slate-800 bg-slate-900'
                }`}
              >
                <div className="flex gap-3">
                  <div className="text-3xl shrink-0">
                    {plant?.emoji ?? alertTypeIcon[alert.type] ?? '⚠️'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-bold text-sm">
                        {plant?.name ?? 'Planta'}
                      </span>
                      <span className="text-slate-500">—</span>
                      <span className="text-sm">
                        {alertTypeTitle[alert.type] ?? alert.type}
                      </span>
                      {!alert.acknowledged && (
                        <span className="bg-red-500 text-white text-xs rounded-full px-2 py-0.5">
                          Nueva
                        </span>
                      )}
                    </div>

                    {alert.care_message ? (
                      <p className="text-sm text-slate-300 mb-2">
                        💡 {alert.care_message}
                      </p>
                    ) : (
                      <p className="text-sm text-slate-400 mb-2">
                        Valor: {alert.value.toFixed(1)}
                        {alert.type.includes('temp') ? '°C' : '%'} — umbral:{' '}
                        {alert.threshold.toFixed(1)}
                        {alert.type.includes('temp') ? '°C' : '%'}
                      </p>
                    )}

                    <p className="text-xs text-slate-500">
                      {space?.name} ·{' '}
                      {new Date(alert.created_at).toLocaleString('es-PE', {
                        day: '2-digit', month: '2-digit',
                        hour: '2-digit', minute: '2-digit'
                      })}
                    </p>
                  </div>

                  <div className="shrink-0">
                    {!alert.acknowledged ? (
                      <button
                        onClick={() => acknowledge(alert.id)}
                        className="bg-slate-700 hover:bg-green-600 text-white text-xs px-3 py-1.5 rounded-xl transition"
                      >
                        ✓ Listo
                      </button>
                    ) : (
                      <span className="text-xs text-slate-500 bg-slate-800 px-2 py-1 rounded-lg">
                        ✅ Atendida
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}