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
  sensor_name?: string
  space_name?: string
  plant_emoji?: string
  plant_name?: string
}

const alertTypeTitle: Record<string, string> = {
  temp_high: 'Temperatura muy alta',
  temp_low: 'Temperatura muy baja',
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

  const loadAlerts = async () => {
    if (!user) return

    // 1. Traer espacios del usuario
    const { data: spacesData } = await supabase
      .from('spaces')
      .select('id, name, plant_catalog(name, emoji)')
      .eq('user_id', user.id)

    if (!spacesData) { setLoading(false); return }

    const spaceIds = spacesData.map(s => s.id)

    // 2. Traer sensores de esos espacios
    const { data: sensorsData } = await supabase
      .from('sensors')
      .select('id, name, space_id')
      .in('space_id', spaceIds)

    if (!sensorsData || sensorsData.length === 0) {
      setAlerts([])
      setLoading(false)
      return
    }

    const sensorIds = sensorsData.map(s => s.id)

    // 3. Traer alertas de esos sensores
    const { data: alertsData, error } = await supabase
      .from('alerts')
      .select('*')
      .in('sensor_id', sensorIds)
      .order('created_at', { ascending: false })

    if (error) { console.error(error); setLoading(false); return }

    // 4. Enriquecer alertas con info de sensor y espacio
    const enriched = (alertsData ?? []).map(alert => {
      const sensor = sensorsData.find(s => s.id === alert.sensor_id)
      const space = spacesData.find(s => s.id === sensor?.space_id) as any
      return {
        ...alert,
        sensor_name: sensor?.name ?? 'Sensor',
        space_name: space?.name ?? 'Espacio',
        plant_name: space?.plant_catalog?.name ?? null,
        plant_emoji: space?.plant_catalog?.emoji ?? null,
      }
    })

    setAlerts(enriched)
    setLoading(false)
  }

  useEffect(() => { loadAlerts() }, [])

  const acknowledge = async (id: number) => {
    await supabase
      .from('alerts')
      .update({ acknowledged: true })
      .eq('id', id)

    setAlerts(prev =>
      prev.map(a => a.id === id ? { ...a, acknowledged: true } : a)
    )
  }

  const acknowledgeAll = async () => {
    const pendingIds = alerts.filter(a => !a.acknowledged).map(a => a.id)
    if (pendingIds.length === 0) return

    await supabase
      .from('alerts')
      .update({ acknowledged: true })
      .in('id', pendingIds)

    setAlerts(prev => prev.map(a => ({ ...a, acknowledged: true })))
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">🔔 Alertas</h1>
          <p className="text-slate-400 text-sm mt-1">
            {pending.length > 0
              ? `Tienes ${pending.length} alerta${pending.length !== 1 ? 's' : ''} pendiente${pending.length !== 1 ? 's' : ''}`
              : 'Todo al día ✅'}
          </p>
        </div>
        {pending.length > 0 && (
          <button
            onClick={acknowledgeAll}
            className="text-xs bg-slate-700 hover:bg-slate-600 text-white px-3 py-2 rounded-xl transition"
          >
            ✓ Marcar todas
          </button>
        )}
      </div>

      {/* TABS */}
      <div className="flex gap-2 bg-slate-900 p-1 rounded-xl">
        <button
          onClick={() => setTab('pending')}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
            tab === 'pending' ? 'bg-green-600 text-white' : 'text-slate-400 hover:text-white'
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
            tab === 'all' ? 'bg-green-600 text-white' : 'text-slate-400 hover:text-white'
          }`}
        >
          Todas ({alerts.length})
        </button>
      </div>

      {/* LISTA */}
      {displayed.length === 0 ? (
        <div className="bg-slate-900 rounded-2xl p-10 text-center">
          <p className="text-4xl mb-3">
            {tab === 'pending' ? '✅' : '📭'}
          </p>
          <p className="font-medium">
            {tab === 'pending' ? '¡Todo al día!' : 'No hay alertas registradas'}
          </p>
          <p className="text-slate-400 text-sm mt-1">
            {tab === 'pending'
              ? 'No tienes alertas pendientes'
              : 'Usa el simulador para generar alertas de prueba'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayed.map(alert => (
            <div
              key={alert.id}
              className={`rounded-2xl p-4 border transition ${
                !alert.acknowledged
                  ? 'border-l-4 border-l-amber-500 border-amber-500/20 bg-amber-500/5'
                  : 'border-slate-800 bg-slate-900 opacity-60'
              }`}
            >
              <div className="flex gap-3">
                <div className="text-3xl shrink-0">
                  {alert.plant_emoji ?? alertTypeIcon[alert.type] ?? '⚠️'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-bold text-sm">
                      {alert.plant_name ?? alert.sensor_name}
                    </span>
                    {!alert.acknowledged && (
                      <span className="bg-red-500 text-white text-xs rounded-full px-2 py-0.5">
                        Nueva
                      </span>
                    )}
                  </div>

                  <p className="text-sm text-white mb-1">
                    {alertTypeIcon[alert.type]} {alertTypeTitle[alert.type] ?? alert.type}
                  </p>

                  {alert.care_message && (
                    <p className="text-sm text-slate-300 mb-2">
                      💡 {alert.care_message}
                    </p>
                  )}

                  <p className="text-xs text-slate-400">
                    Valor: <span className="text-white">
                      {alert.value.toFixed(1)}{alert.type.includes('temp') ? '°C' : '%'}
                    </span>
                    {' · '}Umbral: <span className="text-white">
                      {alert.threshold.toFixed(1)}{alert.type.includes('temp') ? '°C' : '%'}
                    </span>
                  </p>

                  <p className="text-xs text-slate-500 mt-1">
                    📍 {alert.space_name} · {alert.sensor_name} ·{' '}
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
          ))}
        </div>
      )}
    </div>
  )
}