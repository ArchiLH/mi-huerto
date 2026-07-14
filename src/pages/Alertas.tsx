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

  useEffect(() => { loadAlerts() }, [])

  const loadAlerts = async () => {
    if (!user) return

    const { data: spacesData } = await supabase
      .from('spaces')
      .select('id, name, plant_catalog(name, emoji)')
      .eq('user_id', user.id)

    if (!spacesData) { setLoading(false); return }

    const spaceIds = spacesData.map(s => s.id)

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

    const { data: alertsData, error } = await supabase
      .from('alerts')
      .select('*')
      .in('sensor_id', sensorIds)
      .order('created_at', { ascending: false })

    if (error) { setLoading(false); return }

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

  const acknowledge = async (id: number) => {
    await supabase.from('alerts').update({ acknowledged: true }).eq('id', id)
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, acknowledged: true } : a))
  }

  const acknowledgeAll = async () => {
    const pendingIds = alerts.filter(a => !a.acknowledged).map(a => a.id)
    if (pendingIds.length === 0) return
    await supabase.from('alerts').update({ acknowledged: true }).in('id', pendingIds)
    setAlerts(prev => prev.map(a => ({ ...a, acknowledged: true })))
  }

  const pending = alerts.filter(a => !a.acknowledged)
  const displayed = tab === 'pending' ? pending : alerts

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-28 rounded-2xl animate-pulse" style={{ backgroundColor: '#0d2318' }} />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-5">

      {/* HEADER */}
      <div
        className="rounded-2xl p-5"
        style={{ backgroundColor: '#0d2318', border: '1px solid #1a3a20' }}
      >
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs font-mono uppercase tracking-widest" style={{ color: '#4a6a4a' }}>
              Sistema de alertas
            </span>
            <h1 className="text-xl font-bold text-white mt-1">🔔 Alertas</h1>
            <p className="text-sm mt-0.5" style={{ color: '#6b9e6e' }}>
              {pending.length > 0
                ? `${pending.length} alerta${pending.length !== 1 ? 's' : ''} pendiente${pending.length !== 1 ? 's' : ''}`
                : 'Todo al día ✅'}
            </p>
          </div>
          {pending.length > 0 && (
            <button
              onClick={acknowledgeAll}
              className="text-xs px-3 py-2 rounded-xl transition"
              style={{ backgroundColor: '#1a3a20', color: '#4ade80' }}
            >
              ✓ Todas
            </button>
          )}
        </div>
      </div>

      {/* TABS */}
      <div
        className="flex rounded-xl p-1 gap-1"
        style={{ backgroundColor: '#0d2318' }}
      >
        <button
          onClick={() => setTab('pending')}
          className="flex-1 py-2 rounded-lg text-xs font-medium transition"
          style={{
            backgroundColor: tab === 'pending' ? '#2d6a35' : 'transparent',
            color: tab === 'pending' ? 'white' : '#6b9e6e',
          }}
        >
          Pendientes
          {pending.length > 0 && (
            <span
              className="ml-2 text-xs rounded-full px-1.5 py-0.5"
              style={{ backgroundColor: '#f87171', color: 'white' }}
            >
              {pending.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab('all')}
          className="flex-1 py-2 rounded-lg text-xs font-medium transition"
          style={{
            backgroundColor: tab === 'all' ? '#2d6a35' : 'transparent',
            color: tab === 'all' ? 'white' : '#6b9e6e',
          }}
        >
          Todas ({alerts.length})
        </button>
      </div>

      {/* LISTA */}
      {displayed.length === 0 ? (
        <div
          className="rounded-2xl p-10 text-center"
          style={{ backgroundColor: '#0d2318', border: '1px solid #1a3a20' }}
        >
          <p className="text-4xl mb-3">✅</p>
          <p className="font-medium text-white">¡Todo al día!</p>
          <p className="text-sm mt-1" style={{ color: '#6b9e6e' }}>
            {tab === 'pending' ? 'No tienes alertas pendientes' : 'No hay alertas registradas'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayed.map(alert => (
            <div
              key={alert.id}
              className="rounded-2xl p-4 transition"
              style={{
                backgroundColor: !alert.acknowledged ? '#1a0808' : '#0d2318',
                border: `1px solid ${!alert.acknowledged ? '#5a1a1a' : '#1a3a20'}`,
                opacity: alert.acknowledged ? 0.6 : 1
              }}
            >
              <div className="flex gap-3">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0"
                  style={{ backgroundColor: !alert.acknowledged ? '#3a1010' : '#1a3a20' }}
                >
                  {alert.plant_emoji ?? alertTypeIcon[alert.type] ?? '⚠️'}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-bold text-sm text-white">
                      {alert.plant_name ?? alert.sensor_name}
                    </span>
                    {!alert.acknowledged && (
                      <span
                        className="text-xs rounded-full px-2 py-0.5"
                        style={{ backgroundColor: '#3a1010', color: '#f87171' }}
                      >
                        Nueva
                      </span>
                    )}
                  </div>

                  <p className="text-sm text-white mb-1">
                    {alertTypeIcon[alert.type]} {alertTypeTitle[alert.type] ?? alert.type}
                  </p>

                  {alert.care_message && (
                    <p className="text-xs mb-2" style={{ color: '#a3d9a5' }}>
                      💡 {alert.care_message}
                    </p>
                  )}

                  <div className="flex items-center gap-3 text-xs" style={{ color: '#4a6a4a' }}>
                    <span>
                      {alert.value.toFixed(1)}{alert.type.includes('temp') ? '°C' : '%'}
                    </span>
                    <span>·</span>
                    <span>📍 {alert.space_name}</span>
                    <span>·</span>
                    <span>
                      {new Date(alert.created_at).toLocaleString('es-PE', {
                        day: '2-digit', month: '2-digit',
                        hour: '2-digit', minute: '2-digit'
                      })}
                    </span>
                  </div>
                </div>

                <div className="shrink-0">
                  {!alert.acknowledged ? (
                    <button
                      onClick={() => acknowledge(alert.id)}
                      className="text-xs px-3 py-1.5 rounded-xl transition"
                      style={{ backgroundColor: '#1a3a20', color: '#4ade80' }}
                    >
                      ✓ Listo
                    </button>
                  ) : (
                    <span
                      className="text-xs px-2 py-1 rounded-lg"
                      style={{ backgroundColor: '#0a1a0f', color: '#4a6a4a' }}
                    >
                      ✅
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