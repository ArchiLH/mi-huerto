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
      <div className="w-full bg-white px-5 pt-6 space-y-4">
        <div className="h-6 w-1/3 bg-slate-100 rounded-lg animate-pulse" />
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 bg-slate-50 rounded-2xl animate-pulse border border-slate-100" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="w-full bg-white text-slate-800 font-sans px-5 pt-6 space-y-5 max-w-md mx-auto pb-10">

      {/* HEADER (Estilo e instrucciones exactas de la imagen) */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-black text-[#1e293b] tracking-tight">
            Alertas de tus plantas
          </h1>
          {pending.length > 0 && (
            <button
              onClick={acknowledgeAll}
              className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition"
            >
              ✓ Marcar todo
            </button>
          )}
        </div>
        <p className="text-xs text-slate-400 font-medium leading-relaxed">
          Cuando una planta necesita cuidado, te avisamos aquí con instrucciones
        </p>
      </div>

      {/* TABS SELECTORES DE VISTA MÍNIMALISTAS */}
      <div className="flex bg-slate-100/70 p-1 rounded-xl border border-slate-200/30">
        <button
          onClick={() => setTab('pending')}
          className={`flex-1 text-center py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            tab === 'pending'
              ? 'bg-white text-[#008f51] shadow-2xs'
              : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          Pendientes
          {pending.length > 0 && (
            <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.2 rounded-full font-black">
              {pending.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab('all')}
          className={`flex-1 text-center py-2 rounded-lg text-xs font-bold transition-all ${
            tab === 'all'
              ? 'bg-white text-[#008f51] shadow-2xs'
              : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          Historial ({alerts.length})
        </button>
      </div>

      {/* DETECCIÓN DE PANTALLA VACÍA (Mismo diseño, textos y colores de tu captura) */}
      {displayed.length === 0 ? (
        <div className="bg-white rounded-[2rem] border-2 border-dashed border-slate-200 p-10 flex flex-col items-center justify-center text-center shadow-3xs my-4 py-14">
          <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center text-5xl mb-6 relative">
            🌱
            <span className="absolute bottom-0 right-1 text-xl">🧡</span>
          </div>
          <h2 className="text-lg font-black text-slate-800 tracking-tight">
            ¡Todo está bien!
          </h2>
          <p className="text-xs text-slate-400 mt-2 max-w-[240px] font-medium leading-relaxed">
            No hay alertas por el momento. Tus plantas están felices.
          </p>
        </div>
      ) : (
        /* LISTADO DE RECUADROS CON ALERTAS REALES */
        <div className="space-y-3.5">
          {displayed.map(alert => {
            const isNew = !alert.acknowledged
            return (
              <div
                key={alert.id}
                className={`bg-white rounded-2xl p-4 border transition-all ${
                  isNew 
                    ? 'border-red-200 shadow-xs bg-red-50/5' 
                    : 'border-slate-100 opacity-60'
                }`}
              >
                <div className="flex gap-3 items-start">
                  {/* Icono de brote o tipo de problema */}
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0 ${
                    isNew ? 'bg-red-50 text-red-500' : 'bg-slate-50'
                  }`}>
                    {alert.plant_emoji ?? alertTypeIcon[alert.type] ?? '⚠️'}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <span className="font-bold text-xs text-slate-800 truncate">
                        {alert.plant_name ?? alert.sensor_name}
                      </span>
                      {isNew && (
                        <span className="text-[9px] bg-red-100 text-red-600 font-extrabold rounded-full px-2 py-0.2">
                          Crítico
                        </span>
                      )}
                    </div>

                    <p className="text-xs font-bold text-slate-700 mb-1">
                      {alertTypeTitle[alert.type] ?? alert.type}
                    </p>

                    {alert.care_message && (
                      <p className="text-[11px] text-emerald-600 font-medium mb-2 leading-relaxed bg-emerald-50/30 p-2 rounded-xl border border-emerald-100/50">
                        💡 {alert.care_message}
                      </p>
                    )}

                    {/* Meta datos inferiores */}
                    <div className="flex items-center gap-2 text-[10px] text-slate-400 font-medium flex-wrap">
                      <span className="font-bold text-slate-500">
                        Valor: {alert.value.toFixed(1)}{alert.type.includes('temp') ? '°C' : '%'}
                      </span>
                      <span>•</span>
                      <span>📍 {alert.space_name}</span>
                      <span>•</span>
                      <span>
                        {new Date(alert.created_at).toLocaleString('es-PE', {
                          day: '2-digit', month: '2-digit',
                          hour: '2-digit', minute: '2-digit'
                        })}
                      </span>
                    </div>
                  </div>

                  {/* Acción individual */}
                  <div className="shrink-0 pl-1">
                    {isNew ? (
                      <button
                        onClick={() => acknowledge(alert.id)}
                        className="text-[10px] font-bold px-2.5 py-1.5 rounded-lg bg-[#e2faee] text-[#008f51] hover:bg-[#cbf3de] transition-colors"
                      >
                        Entendido
                      </button>
                    ) : (
                      <span className="text-xs block text-center pt-1">✅</span>
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