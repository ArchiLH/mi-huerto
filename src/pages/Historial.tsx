import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import {
  ResponsiveContainer, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip
} from 'recharts'

type Space = {
  id: number
  name: string
  plant_catalog?: { name: string; emoji: string } | null
}

type Reading = {
  temperature: number
  humidity: number
  recorded_at: string
}

export default function Historial() {
  const { user } = useAuth()
  const [spaces, setSpaces] = useState<Space[]>([])
  const [selectedSpace, setSelectedSpace] = useState<Space | null>(null)
  const [readings, setReadings] = useState<Reading[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingReadings, setLoadingReadings] = useState(false)

  useEffect(() => { 
    loadSpaces() 
  }, [user])

  const loadSpaces = async () => {
    if (!user) return
    const { data } = await supabase
      .from('spaces')
      .select('*, plant_catalog(name, emoji)')
      .eq('user_id', user.id)
      .not('plant_id', 'is', null)
      .order('slot_number')

    setSpaces((data as Space[]) ?? [])
    setLoading(false)
  }

  // CORREGIDO: Manejo de cambio de planta limpio para que no herede lecturas anteriores
  const handleSpaceChange = async (spaceId: string) => {
    if (!spaceId) {
      setSelectedSpace(null)
      setReadings([])
      return
    }

    const space = spaces.find(s => s.id === Number(spaceId))
    if (space) {
      setReadings([]) // Limpieza inmediata antes de pedir nuevos datos
      setSelectedSpace(space)
      setLoadingReadings(true)

      const { data: sensorData } = await supabase
        .from('sensors')
        .select('id')
        .eq('space_id', space.id)
        .maybeSingle() // Cambiado a maybeSingle para evitar crasheos si no hay sensor

      if (!sensorData) { 
        setLoadingReadings(false)
        return 
      }

      const { data: readingData, error } = await supabase
        .from('readings')
        .select('temperature, humidity, recorded_at')
        .eq('sensor_id', sensorData.id)
        .order('recorded_at', { ascending: true })
        .limit(30)

      if (!error && readingData) {
        setReadings(readingData as Reading[])
      }
      setLoadingReadings(false)
    }
  }

  const chartData = readings.map(r => ({
    time: new Date(r.recorded_at).toLocaleString('es-PE', {
      hour: '2-digit', minute: '2-digit'
    }),
    temp: r.temperature,
    hum: r.humidity,
  }))

  const avgTemp = readings.length > 0
    ? (readings.reduce((acc, r) => acc + r.temperature, 0) / readings.length).toFixed(1) : null
  const avgHum = readings.length > 0
    ? (readings.reduce((acc, r) => acc + r.humidity, 0) / readings.length).toFixed(1) : null
  const maxTemp = readings.length > 0
    ? Math.max(...readings.map(r => r.temperature)).toFixed(1) : null
  const minTemp = readings.length > 0
    ? Math.min(...readings.map(r => r.temperature)).toFixed(1) : null

  if (loading) {
    return (
      <div className="w-full bg-white px-5 pt-6 space-y-4">
        <div className="h-6 w-1/3 bg-slate-100 rounded-lg animate-pulse" />
        <div className="h-12 bg-slate-100 rounded-xl animate-pulse" />
        <div className="h-64 bg-slate-100 rounded-2xl animate-pulse" />
      </div>
    )
  }

  return (
    <div className="w-full bg-white text-slate-800 font-sans px-5 pt-6 space-y-5 max-w-md mx-auto pb-10">

      {/* HEADER EXACTO */}
      <div className="space-y-1">
        <h1 className="text-2xl font-black text-[#1e293b] tracking-tight flex items-center gap-2">
          Historial 📈
        </h1>
        <p className="text-xs text-slate-400 font-medium leading-relaxed">
          Revisa cómo han evolucionado la temperatura y humedad de tus plantas
        </p>
      </div>

      {/* DROPDOWN SELECTOR CORREGIDO */}
      <div className="relative">
        <select
          onChange={(e) => handleSpaceChange(e.target.value)}
          value={selectedSpace?.id ?? ''}
          className="w-full bg-white border border-[#4ade80] text-slate-600 rounded-xl px-4 py-3 outline-none text-xs font-semibold appearance-none cursor-pointer"
        >
          <option value="">Selecciona una planta...</option>
          {spaces.map(space => (
            <option key={space.id} value={space.id}>
              {space.plant_catalog?.emoji ?? '🪴'} {space.plant_catalog?.name ?? 'Planta'} ({space.name})
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-slate-400">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        </div>
      </div>

      {/* CONTENIDO PRINCIPAL DINÁMICO */}
      {spaces.length === 0 ? (
        <div className="bg-white rounded-[2rem] border-2 border-dashed border-slate-200 p-10 flex flex-col items-center justify-center text-center py-14">
          <p className="text-4xl mb-3">🌱</p>
          <p className="text-xs text-slate-400 font-bold">No tienes plantas registradas aún</p>
        </div>
      ) : !selectedSpace ? (
        /* PANTALLA INVITACIÓN */
        <div className="bg-white rounded-[2rem] border-2 border-dashed border-slate-200 p-10 flex flex-col items-center justify-center text-center shadow-3xs py-16">
          <div className="w-20 h-20 bg-slate-50 rounded-2xl flex items-center justify-center border border-slate-200/80 text-4xl mb-6 shadow-2xs">
            📈
          </div>
          <p className="text-xs text-slate-500 font-bold max-w-[200px] leading-relaxed">
            Selecciona una planta para ver su historial
          </p>
        </div>
      ) : (
        /* DETALLE ACTIVO */
        <div className="space-y-5">
          {loadingReadings ? (
            <div className="h-64 bg-slate-50 rounded-[2rem] animate-pulse border border-slate-100 flex items-center justify-center text-xs text-slate-400">
              Cargando lecturas...
            </div>
          ) : readings.length === 0 ? (
            <div className="bg-white rounded-[2rem] border border-dashed border-slate-200 p-10 text-center py-14">
              <p className="text-4xl mb-3">📡</p>
              <p className="text-xs text-slate-400 font-bold">Sin lecturas para esta planta</p>
              <p className="text-[10px] text-slate-400 mt-1">Usa el simulador para registrar datos</p>
            </div>
          ) : (
            <>
              {/* TARGETAS DE MÉTRICAS */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: '🌡️ Temp. Promedio', value: `${avgTemp}°C`, color: 'text-orange-500' },
                  { label: '💧 Hum. Promedio', value: `${avgHum}%`, color: 'text-blue-500' },
                  { label: '🔺 Temp. Máxima', value: `${maxTemp}°C`, color: 'text-red-500' },
                  { label: '🔻 Temp. Mínima', value: `${minTemp}°C`, color: 'text-cyan-500' },
                ].map((s, i) => (
                  <div key={i} className="bg-white rounded-2xl p-3 text-center border border-slate-100 shadow-3xs">
                    <p className="text-[10px] text-slate-400 font-bold mb-0.5">{s.label}</p>
                    <p className={`text-sm font-black ${s.color}`}>{s.value}</p>
                  </div>
                ))}
              </div>

              {/* GRÁFICA DE TEMPERATURA */}
              <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-3xs">
                <p className="text-xs font-bold text-slate-700 mb-3">
                  🌡️ Temperatura (últimas {readings.length} lecturas)
                </p>
                <ResponsiveContainer width="100%" height={160}>
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="tempGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f97316" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="time" tick={{ fill: '#94a3b8', fontSize: 8 }} />
                    <YAxis tick={{ fill: '#94a3b8', fontSize: 9 }} />
                    <Tooltip contentStyle={{ borderRadius: '12px', fontSize: '11px' }} />
                    <Area type="monotone" dataKey="temp" stroke="#f97316" fill="url(#tempGrad)" strokeWidth={2.5} name="Temp. °C" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* GRÁFICA DE HUMEDAD */}
              <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-3xs">
                <p className="text-xs font-bold text-slate-700 mb-3">
                  💧 Humedad (últimas {readings.length} lecturas)
                </p>
                <ResponsiveContainer width="100%" height={160}>
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="humGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#38bdf8" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="time" tick={{ fill: '#94a3b8', fontSize: 8 }} />
                    <YAxis tick={{ fill: '#94a3b8', fontSize: 9 }} />
                    <Tooltip contentStyle={{ borderRadius: '12px', fontSize: '11px' }} />
                    <Area type="monotone" dataKey="hum" stroke="#38bdf8" fill="url(#humGrad)" strokeWidth={2.5} name="Hum. %" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* DETALLE TABULAR */}
              <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-3xs">
                <p className="text-xs font-bold text-slate-700 mb-3">📋 Detalle del registro</p>
                <div className="space-y-2 divide-y divide-slate-100">
                  {[...readings].reverse().slice(0, 10).map((r, i) => (
                    <div key={i} className="flex items-center justify-between py-2 text-[11px] font-medium">
                      <span className="text-slate-400">
                        {new Date(r.recorded_at).toLocaleString('es-PE', {
                          day: '2-digit', month: '2-digit',
                          hour: '2-digit', minute: '2-digit'
                        })}
                      </span>
                      <div className="flex gap-3">
                        <span className="text-orange-500 font-bold">🌡️ {r.temperature.toFixed(1)}°C</span>
                        <span className="text-blue-500 font-bold">💧 {r.humidity.toFixed(1)}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}