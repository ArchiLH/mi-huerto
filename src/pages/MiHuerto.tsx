import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

type Space = {
  id: number
  slot_number: number
  name: string
  plant_id: number | null
  plant_catalog?: {
    name: string
    emoji: string
  } | null
  sensors?: {
    id: number
    active: boolean
  }[]
  latest_reading?: {
    temperature: number
    humidity: number
  } | null
  unacknowledged_alerts?: number
}

type SpaceStatus = 'ok' | 'warning' | 'no_sensor' | 'empty'

function getStatus(space: Space): SpaceStatus {
  if (!space.plant_id) return 'empty'
  if (!space.sensors || space.sensors.length === 0) return 'no_sensor'
  if (space.unacknowledged_alerts && space.unacknowledged_alerts > 0) return 'warning'
  return 'ok'
}

const statusConfig = {
  ok:        { label: 'Todo bien 🌱',   color: 'text-green-400',  border: 'border-green-500/30' },
  warning:   { label: '¡Atención! ⚠️', color: 'text-amber-400',  border: 'border-amber-500/40' },
  no_sensor: { label: 'Sin sensor',    color: 'text-slate-400',  border: 'border-slate-600/30' },
  empty:     { label: 'Disponible',    color: 'text-slate-500',  border: 'border-dashed border-slate-700' },
}

function SpaceCard({ space, onClick }: { space: Space; onClick: () => void }) {
  const status = getStatus(space)
  const cfg = statusConfig[status]

  if (status === 'empty') {
    return (
      <div
        onClick={onClick}
        className={`border-2 ${cfg.border} rounded-2xl min-h-[180px] flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-green-500/40 transition group`}
      >
        <div className="w-12 h-12 rounded-full border-2 border-dashed border-slate-600 flex items-center justify-center group-hover:border-green-500 transition">
          <span className="text-2xl text-slate-500 group-hover:text-green-400">+</span>
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-slate-400">{space.name}</p>
          <p className="text-xs text-slate-600 mt-0.5">Toca para agregar planta</p>
        </div>
      </div>
    )
  }

  return (
    <div
      className={`border-2 ${cfg.border} rounded-2xl p-4 relative cursor-pointer`}
      onClick={onClick}
    >
      {/* BADGE ALERTAS */}
      {space.unacknowledged_alerts && space.unacknowledged_alerts > 0 ? (
        <div className="absolute top-2 right-2 bg-red-500 text-white text-xs rounded-full px-2 py-0.5 font-bold">
          ⚠️ {space.unacknowledged_alerts}
        </div>
      ) : null}

      {/* PLANTA */}
      <div className="text-center mb-3">
        <div className="text-5xl mb-2">{space.plant_catalog?.emoji ?? '🪴'}</div>
        <p className="font-bold text-base">{space.plant_catalog?.name ?? 'Planta'}</p>
        <p className="text-xs text-slate-400">{space.name}</p>
        <p className={`text-xs font-medium mt-1 ${cfg.color}`}>{cfg.label}</p>
      </div>

      {/* LECTURAS */}
      {status === 'no_sensor' ? (
        <div className="flex items-center justify-center gap-1 text-xs text-slate-500 mt-2">
          <span>📡</span>
          <span>Sensor no conectado</span>
        </div>
      ) : space.latest_reading ? (
        <div className="grid grid-cols-2 gap-2 mt-3">
          <div className="bg-slate-800 rounded-xl px-3 py-2 text-center">
            <p className="text-base">🌡️</p>
            <p className="text-sm font-bold text-orange-400">
              {space.latest_reading.temperature.toFixed(1)}°C
            </p>
            <p className="text-xs text-slate-400">Temp</p>
          </div>
          <div className="bg-slate-800 rounded-xl px-3 py-2 text-center">
            <p className="text-base">💧</p>
            <p className="text-sm font-bold text-blue-400">
              {space.latest_reading.humidity.toFixed(1)}%
            </p>
            <p className="text-xs text-slate-400">Humedad</p>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default function MiHuerto() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [spaces, setSpaces] = useState<Space[]>([])
  const [loading, setLoading] = useState(true)
  const initialized = useRef(false)

  const loadSpaces = async () => {
    if (!user) return

    const { data, error } = await supabase
      .from('spaces')
      .select(`
        *,
        plant_catalog (name, emoji),
        sensors (id, active)
      `)
      .eq('user_id', user.id)
      .order('slot_number')

    if (error) { console.error(error); return }

    // Crear espacios solo si no existen
    if (!data || data.length === 0) {
      const defaultSpaces = Array.from({ length: 8 }, (_, i) => ({
        user_id: user.id,
        slot_number: i + 1,
        name: `Espacio ${i + 1}`,
        plant_id: null,
      }))

      const { error: insertError } = await supabase
        .from('spaces')
        .insert(defaultSpaces)

      if (insertError) { console.error(insertError); return }

      const { data: newData } = await supabase
        .from('spaces')
        .select(`*, plant_catalog (name, emoji), sensors (id, active)`)
        .eq('user_id', user.id)
        .order('slot_number')

      setSpaces((newData as Space[]) ?? [])
      setLoading(false)
      return
    }

    // Enriquecer con lecturas y alertas
    const enriched = await Promise.all(
      (data as Space[]).map(async (space) => {
        if (!space.sensors || space.sensors.length === 0) return space

        const sensorId = space.sensors[0].id

        const { data: reading } = await supabase
          .from('readings')
          .select('temperature, humidity')
          .eq('sensor_id', sensorId)
          .order('recorded_at', { ascending: false })
          .limit(1)
          .single()

        const { count } = await supabase
          .from('alerts')
          .select('*', { count: 'exact', head: true })
          .eq('sensor_id', sensorId)
          .eq('acknowledged', false)

        return {
          ...space,
          latest_reading: reading ?? null,
          unacknowledged_alerts: count ?? 0,
        }
      })
    )

    setSpaces(enriched)
    setLoading(false)
  }

  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true
      loadSpaces()
    }
  }, [])

  const activeCount = spaces.filter(s => s.plant_id !== null).length
  const alertCount = spaces.reduce((acc, s) => acc + (s.unacknowledged_alerts ?? 0), 0)

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-slate-800 rounded-xl animate-pulse w-48" />
        <div className="grid grid-cols-2 gap-3">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-44 bg-slate-800 rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">

      {/* HEADER */}
      <div>
        <h1 className="text-2xl font-bold">
          ¡Hola, {user?.email?.split('@')[0]}! 👋
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          {activeCount > 0
            ? `Tienes ${activeCount} planta${activeCount !== 1 ? 's' : ''} activa${activeCount !== 1 ? 's' : ''} en tu huerto`
            : 'Bienvenido a tu huerto — asigna plantas a los espacios para empezar'}
        </p>

        {/* BANNER ALERTAS */}
        {alertCount > 0 && (
          <button
            onClick={() => navigate('/alertas')}
            className="mt-3 w-full flex items-center gap-2 bg-red-900/30 border border-red-500/30 text-red-400 rounded-xl px-4 py-2 text-sm font-medium hover:bg-red-900/50 transition"
          >
            <span>⚠️</span>
            {alertCount} alerta{alertCount !== 1 ? 's' : ''} necesitan tu atención — toca aquí
          </button>
        )}
      </div>

      {/* GRID 8 ESPACIOS */}
      <div>
        <p className="text-xs font-mono uppercase tracking-widest text-slate-500 mb-4">
          Mis 8 espacios
        </p>
        <div className="grid grid-cols-2 gap-3">
          {spaces.map((space) => (
            <SpaceCard
              key={space.id}
              space={space}
              onClick={() => navigate(`/espacios/${space.id}`)}
            />
          ))}
        </div>
      </div>

    </div>
  )
}