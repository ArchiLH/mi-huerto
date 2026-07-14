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

  useEffect(() => { loadSpaces() }, [])

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

  const loadReadings = async (space: Space) => {
    setSelectedSpace(space)
    setLoadingReadings(true)
    setReadings([])

    const { data: sensorData } = await supabase
      .from('sensors')
      .select('id')
      .eq('space_id', space.id)
      .single()

    if (!sensorData) { setLoadingReadings(false); return }

    const { data: readingData } = await supabase
      .from('readings')
      .select('temperature, humidity, recorded_at')
      .eq('sensor_id', sensorData.id)
      .order('recorded_at', { ascending: true })
      .limit(30)

    setReadings((readingData as Reading[]) ?? [])
    setLoadingReadings(false)
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

  return (
    <div className="space-y-5">

      {/* HEADER */}
      <div
        className="rounded-2xl p-5"
        style={{ backgroundColor: '#0d2318', border: '1px solid #1a3a20' }}
      >
        <span className="text-xs font-mono uppercase tracking-widest" style={{ color: '#4a6a4a' }}>
          Análisis histórico
        </span>
        <h1 className="text-xl font-bold text-white mt-1">📊 Historial</h1>
        <p className="text-sm mt-0.5" style={{ color: '#6b9e6e' }}>
          Evolución de temperatura y humedad
        </p>
      </div>

      {/* SELECTOR */}
      {loading ? (
        <div className="h-16 rounded-2xl animate-pulse" style={{ backgroundColor: '#0d2318' }} />
      ) : spaces.length === 0 ? (
        <div
          className="rounded-2xl p-10 text-center"
          style={{ backgroundColor: '#0d2318', border: '1px solid #1a3a20' }}
        >
          <p className="text-4xl mb-3">🌱</p>
          <p style={{ color: '#6b9e6e' }}>No tienes plantas registradas aún</p>
        </div>
      ) : (
        <>
          <div
            className="rounded-2xl p-4 space-y-2"
            style={{ backgroundColor: '#0d2318', border: '1px solid #1a3a20' }}
          >
            <p className="text-xs font-semibold mb-3" style={{ color: '#6b9e6e' }}>
              Selecciona una planta
            </p>
            {spaces.map(space => (
              <button
                key={space.id}
                onClick={() => loadReadings(space)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition"
                style={{
                  backgroundColor: selectedSpace?.id === space.id ? '#2d6a35' : '#0a1a0f',
                  border: `1px solid ${selectedSpace?.id === space.id ? '#2d6a35' : '#1a3a20'}`
                }}
              >
                <span className="text-2xl">
                  {space.plant_catalog?.emoji ?? '🪴'}
                </span>
                <div>
                  <p className="font-medium text-white text-sm">
                    {space.plant_catalog?.name ?? 'Planta'}
                  </p>
                  <p className="text-xs" style={{ color: selectedSpace?.id === space.id ? '#a3d9a5' : '#6b9e6e' }}>
                    {space.name}
                  </p>
                </div>
              </button>
            ))}
          </div>

          {selectedSpace && (
            <div className="space-y-4">
              {loadingReadings ? (
                <div className="h-48 rounded-2xl animate-pulse" style={{ backgroundColor: '#0d2318' }} />
              ) : readings.length === 0 ? (
                <div
                  className="rounded-2xl p-10 text-center"
                  style={{ backgroundColor: '#0d2318', border: '1px solid #1a3a20' }}
                >
                  <p className="text-4xl mb-3">📡</p>
                  <p style={{ color: '#6b9e6e' }}>Sin lecturas para esta planta</p>
                  <p className="text-xs mt-1" style={{ color: '#4a6a4a' }}>
                    Usa el simulador para generar datos
                  </p>
                </div>
              ) : (
                <>
                  {/* STATS */}
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: '🌡️ Temp. Promedio', value: `${avgTemp}°C`, color: '#f97316' },
                      { label: '💧 Hum. Promedio', value: `${avgHum}%`, color: '#38bdf8' },
                      { label: '🔺 Temp. Máxima', value: `${maxTemp}°C`, color: '#f87171' },
                      { label: '🔻 Temp. Mínima', value: `${minTemp}°C`, color: '#67e8f9' },
                    ].map((s, i) => (
                      <div
                        key={i}
                        className="rounded-2xl p-3 text-center"
                        style={{ backgroundColor: '#0d2318', border: '1px solid #1a3a20' }}
                      >
                        <p className="text-xs mb-1" style={{ color: '#4a6a4a' }}>{s.label}</p>
                        <p className="text-xl font-bold" style={{ color: s.color }}>{s.value}</p>
                      </div>
                    ))}
                  </div>

                  {/* GRÁFICA TEMPERATURA */}
                  <div
                    className="rounded-2xl p-4"
                    style={{ backgroundColor: '#0d2318', border: '1px solid #1a3a20' }}
                  >
                    <p className="text-sm font-semibold text-white mb-4">
                      {selectedSpace.plant_catalog?.emoji} Temperatura — últimas {readings.length} lecturas
                    </p>
                    <ResponsiveContainer width="100%" height={180}>
                      <AreaChart data={chartData}>
                        <defs>
                          <linearGradient id="tempGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1a3a20" />
                        <XAxis dataKey="time" tick={{ fill: '#4a6a4a', fontSize: 9 }} interval="preserveStartEnd" />
                        <YAxis tick={{ fill: '#4a6a4a', fontSize: 10 }} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#0d2318', border: '1px solid #1a3a20',
                            borderRadius: '12px', color: 'white', fontSize: '12px'
                          }}
                        />
                        <Area type="monotone" dataKey="temp" stroke="#f97316"
                          fill="url(#tempGrad)" strokeWidth={2} name="Temperatura °C" dot={false} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>

                  {/* GRÁFICA HUMEDAD */}
                  <div
                    className="rounded-2xl p-4"
                    style={{ backgroundColor: '#0d2318', border: '1px solid #1a3a20' }}
                  >
                    <p className="text-sm font-semibold text-white mb-4">
                      💧 Humedad — últimas {readings.length} lecturas
                    </p>
                    <ResponsiveContainer width="100%" height={180}>
                      <AreaChart data={chartData}>
                        <defs>
                          <linearGradient id="humGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#38bdf8" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1a3a20" />
                        <XAxis dataKey="time" tick={{ fill: '#4a6a4a', fontSize: 9 }} interval="preserveStartEnd" />
                        <YAxis tick={{ fill: '#4a6a4a', fontSize: 10 }} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#0d2318', border: '1px solid #1a3a20',
                            borderRadius: '12px', color: 'white', fontSize: '12px'
                          }}
                        />
                        <Area type="monotone" dataKey="hum" stroke="#38bdf8"
                          fill="url(#humGrad)" strokeWidth={2} name="Humedad %" dot={false} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>

                  {/* TABLA */}
                  <div
                    className="rounded-2xl p-4"
                    style={{ backgroundColor: '#0d2318', border: '1px solid #1a3a20' }}
                  >
                    <p className="text-sm font-semibold text-white mb-3">📋 Detalle</p>
                    <div className="space-y-2">
                      {[...readings].reverse().slice(0, 10).map((r, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between py-2"
                          style={{ borderBottom: i < 9 ? '1px solid #1a3a20' : 'none' }}
                        >
                          <span className="text-xs" style={{ color: '#4a6a4a' }}>
                            {new Date(r.recorded_at).toLocaleString('es-PE', {
                              day: '2-digit', month: '2-digit',
                              hour: '2-digit', minute: '2-digit'
                            })}
                          </span>
                          <div className="flex gap-3 text-xs">
                            <span style={{ color: '#f97316' }}>🌡️ {r.temperature.toFixed(1)}°C</span>
                            <span style={{ color: '#38bdf8' }}>💧 {r.humidity.toFixed(1)}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}