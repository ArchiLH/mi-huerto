import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
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

    // Buscar sensor del espacio
    const { data: sensorData } = await supabase
      .from('sensors')
      .select('id')
      .eq('space_id', space.id)
      .single()

    if (!sensorData) {
      setLoadingReadings(false)
      return
    }

    // Traer últimas 30 lecturas
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
      day: '2-digit', month: '2-digit',
      hour: '2-digit', minute: '2-digit'
    }),
    temperatura: r.temperature,
    humedad: r.humidity,
  }))

  const avgTemp = readings.length > 0
    ? (readings.reduce((acc, r) => acc + r.temperature, 0) / readings.length).toFixed(1)
    : null

  const avgHumidity = readings.length > 0
    ? (readings.reduce((acc, r) => acc + r.humidity, 0) / readings.length).toFixed(1)
    : null

  const maxTemp = readings.length > 0
    ? Math.max(...readings.map(r => r.temperature)).toFixed(1)
    : null

  const minTemp = readings.length > 0
    ? Math.min(...readings.map(r => r.temperature)).toFixed(1)
    : null

  return (
    <div className="space-y-5">

      <div>
        <h1 className="text-2xl font-bold">📊 Historial</h1>
        <p className="text-slate-400 text-sm mt-1">
          Revisa cómo han evolucionado la temperatura y humedad de tus plantas
        </p>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-16 bg-slate-800 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : spaces.length === 0 ? (
        <div className="bg-slate-900 rounded-2xl p-10 text-center">
          <p className="text-4xl mb-3">🌱</p>
          <p className="text-slate-400">No tienes plantas registradas aún</p>
        </div>
      ) : (
        <>
          {/* SELECTOR DE PLANTA */}
          <div className="bg-slate-900 rounded-2xl p-4 space-y-3">
            <p className="text-sm font-semibold text-slate-300">Selecciona una planta</p>
            <div className="space-y-2">
              {spaces.map(space => (
                <button
                  key={space.id}
                  onClick={() => loadReadings(space)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition text-left ${
                    selectedSpace?.id === space.id
                      ? 'bg-green-600 text-white'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  <span className="text-2xl">
                    {space.plant_catalog?.emoji ?? '🪴'}
                  </span>
                  <div>
                    <p className="font-medium">{space.plant_catalog?.name ?? 'Planta'}</p>
                    <p className="text-xs opacity-70">{space.name}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* GRÁFICA */}
          {selectedSpace && (
            <div className="space-y-4">

              {loadingReadings ? (
                <div className="h-64 bg-slate-800 rounded-2xl animate-pulse" />
              ) : readings.length === 0 ? (
                <div className="bg-slate-900 rounded-2xl p-10 text-center">
                  <p className="text-4xl mb-3">📡</p>
                  <p className="text-slate-400">Sin lecturas para esta planta</p>
                  <p className="text-slate-500 text-xs mt-1">
                    Usa el simulador para generar datos
                  </p>
                </div>
              ) : (
                <>
                  {/* STATS RÁPIDAS */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-900 rounded-2xl p-3 text-center">
                      <p className="text-xs text-slate-400 mb-1">🌡️ Temp. Promedio</p>
                      <p className="text-xl font-bold text-orange-400">{avgTemp}°C</p>
                    </div>
                    <div className="bg-slate-900 rounded-2xl p-3 text-center">
                      <p className="text-xs text-slate-400 mb-1">💧 Hum. Promedio</p>
                      <p className="text-xl font-bold text-blue-400">{avgHumidity}%</p>
                    </div>
                    <div className="bg-slate-900 rounded-2xl p-3 text-center">
                      <p className="text-xs text-slate-400 mb-1">🔺 Temp. Máxima</p>
                      <p className="text-xl font-bold text-red-400">{maxTemp}°C</p>
                    </div>
                    <div className="bg-slate-900 rounded-2xl p-3 text-center">
                      <p className="text-xs text-slate-400 mb-1">🔻 Temp. Mínima</p>
                      <p className="text-xl font-bold text-cyan-400">{minTemp}°C</p>
                    </div>
                  </div>

                  {/* GRÁFICA TEMPERATURA */}
                  <div className="bg-slate-900 rounded-2xl p-4">
                    <p className="text-sm font-semibold text-slate-300 mb-4">
                      {selectedSpace.plant_catalog?.emoji} {selectedSpace.plant_catalog?.name} — Últimas {readings.length} lecturas
                    </p>
                    <ResponsiveContainer width="100%" height={220}>
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis
                          dataKey="time"
                          tick={{ fill: '#64748b', fontSize: 9 }}
                          interval="preserveStartEnd"
                        />
                        <YAxis tick={{ fill: '#64748b', fontSize: 10 }} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#0f172a',
                            border: '1px solid #1e293b',
                            borderRadius: '12px',
                            color: 'white',
                            fontSize: '12px'
                          }}
                        />
                        <Legend
                          wrapperStyle={{ fontSize: '12px', color: '#94a3b8' }}
                        />
                        <Line
                          type="monotone"
                          dataKey="temperatura"
                          stroke="#f97316"
                          strokeWidth={2}
                          dot={false}
                          name="Temperatura °C"
                        />
                        <Line
                          type="monotone"
                          dataKey="humedad"
                          stroke="#38bdf8"
                          strokeWidth={2}
                          dot={false}
                          name="Humedad %"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  {/* TABLA ÚLTIMAS LECTURAS */}
                  <div className="bg-slate-900 rounded-2xl p-4">
                    <p className="text-sm font-semibold text-slate-300 mb-3">
                      📋 Detalle de lecturas
                    </p>
                    <div className="space-y-2">
                      {[...readings].reverse().slice(0, 10).map((r, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between text-sm border-b border-slate-800 pb-2 last:border-0 last:pb-0"
                        >
                          <span className="text-slate-400 text-xs">
                            {new Date(r.recorded_at).toLocaleString('es-PE', {
                              day: '2-digit', month: '2-digit',
                              hour: '2-digit', minute: '2-digit'
                            })}
                          </span>
                          <div className="flex gap-3">
                            <span className="text-orange-400">🌡️ {r.temperature.toFixed(1)}°C</span>
                            <span className="text-blue-400">💧 {r.humidity.toFixed(1)}%</span>
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