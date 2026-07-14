import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, BarChart, Bar
} from 'recharts'

type SpaceStat = {
  name: string
  plant_name: string
  plant_emoji: string
  temperature: number | null
  humidity: number | null
  status: 'ok' | 'warning' | 'no_sensor' | 'empty'
  alerts: number
}

type GlobalStat = {
  totalPlants: number
  avgTemp: number
  avgHumidity: number
  totalAlerts: number
  healthySpaces: number
  warningSpaces: number
}

export default function Dashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [stats, setStats] = useState<GlobalStat | null>(null)
  const [spaceStats, setSpaceStats] = useState<SpaceStat[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'resumen' | 'plantas' | 'graficas'>('resumen')

  useEffect(() => { loadDashboard() }, [])

  const loadDashboard = async () => {
    if (!user) return

    const { data: spaces } = await supabase
      .from('spaces')
      .select('*, plant_catalog(name, emoji), sensors(id, active)')
      .eq('user_id', user.id)
      .order('slot_number')

    if (!spaces) { setLoading(false); return }

    const enriched: SpaceStat[] = await Promise.all(
      spaces.map(async (space) => {
        if (!space.plant_id) return {
          name: space.name, plant_name: '', plant_emoji: '',
          temperature: null, humidity: null, status: 'empty' as const, alerts: 0,
        }

        if (!space.sensors || space.sensors.length === 0) return {
          name: space.name,
          plant_name: space.plant_catalog?.name ?? '',
          plant_emoji: space.plant_catalog?.emoji ?? '🪴',
          temperature: null, humidity: null, status: 'no_sensor' as const, alerts: 0,
        }

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

        const alertCount = count ?? 0

        return {
          name: space.name,
          plant_name: space.plant_catalog?.name ?? '',
          plant_emoji: space.plant_catalog?.emoji ?? '🪴',
          temperature: reading?.temperature ?? null,
          humidity: reading?.humidity ?? null,
          status: alertCount > 0 ? 'warning' as const : 'ok' as const,
          alerts: alertCount,
        }
      })
    )

    const withData = enriched.filter(s => s.temperature !== null)
    const withPlants = enriched.filter(s => s.plant_name !== '')

    setSpaceStats(enriched)
    setStats({
      totalPlants: withPlants.length,
      avgTemp: withData.length > 0
        ? withData.reduce((acc, s) => acc + (s.temperature ?? 0), 0) / withData.length : 0,
      avgHumidity: withData.length > 0
        ? withData.reduce((acc, s) => acc + (s.humidity ?? 0), 0) / withData.length : 0,
      totalAlerts: enriched.reduce((acc, s) => acc + s.alerts, 0),
      healthySpaces: enriched.filter(s => s.status === 'ok').length,
      warningSpaces: enriched.filter(s => s.status === 'warning').length,
    })

    setLoading(false)
  }

  const barData = spaceStats
    .filter(s => s.temperature !== null)
    .map(s => ({
      name: s.plant_emoji,
      Temp: s.temperature,
      Hum: s.humidity,
      fullName: s.plant_name,
    }))

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-48 rounded-2xl animate-pulse" style={{ backgroundColor: '#0d2318' }} />
        <div className="grid grid-cols-2 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 rounded-2xl animate-pulse" style={{ backgroundColor: '#0d2318' }} />
          ))}
        </div>
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
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-mono uppercase tracking-widest" style={{ color: '#4a6a4a' }}>
            Analytics IoT
          </span>
          <span
            className="text-xs px-2 py-0.5 rounded-full"
            style={{ backgroundColor: '#0a2a10', color: '#4ade80' }}
          >
            ● En vivo
          </span>
        </div>
        <h1 className="text-xl font-bold text-white mb-1">
          Panel de control
        </h1>
        <p className="text-sm" style={{ color: '#6b9e6e' }}>
          Análisis en tiempo real de tu huerto
        </p>
      </div>

      {/* TABS */}
      <div
        className="flex rounded-xl p-1 gap-1"
        style={{ backgroundColor: '#0d2318' }}
      >
        {[
          { key: 'resumen', label: '📊 Resumen' },
          { key: 'plantas', label: '🌿 Plantas' },
          { key: 'graficas', label: '📈 Gráficas' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className="flex-1 py-2 rounded-lg text-xs font-medium transition"
            style={{
              backgroundColor: activeTab === tab.key ? '#2d6a35' : 'transparent',
              color: activeTab === tab.key ? 'white' : '#6b9e6e',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB: RESUMEN */}
      {activeTab === 'resumen' && stats && (
        <div className="space-y-3">

          {/* FILA 1 */}
          <div className="grid grid-cols-2 gap-3">
            <div
              className="rounded-2xl p-4"
              style={{ backgroundColor: '#0d2318', border: '1px solid #1a3a20' }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-xl mb-3"
                style={{ backgroundColor: '#1a3a20' }}
              >
                🌱
              </div>
              <p className="text-3xl font-bold text-white">
                {String(stats.totalPlants).padStart(2, '0')}
              </p>
              <p className="text-xs font-medium mt-1" style={{ color: '#a3d9a5' }}>
                Plantas activas
              </p>
              <p className="text-xs mt-0.5" style={{ color: '#4a6a4a' }}>
                {stats.healthySpaces} saludables
              </p>
            </div>

            <div
              className="rounded-2xl p-4"
              style={{
                backgroundColor: stats.totalAlerts > 0 ? '#1a0808' : '#0d2318',
                border: `1px solid ${stats.totalAlerts > 0 ? '#5a1a1a' : '#1a3a20'}`
              }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-xl mb-3"
                style={{ backgroundColor: stats.totalAlerts > 0 ? '#3a1010' : '#1a3a20' }}
              >
                🔔
              </div>
              <p className={`text-3xl font-bold ${stats.totalAlerts > 0 ? 'text-red-400' : 'text-white'}`}>
                {String(stats.totalAlerts).padStart(2, '0')}
              </p>
              <p className="text-xs font-medium mt-1" style={{ color: stats.totalAlerts > 0 ? '#f87171' : '#a3d9a5' }}>
                Alertas activas
              </p>
              <p className="text-xs mt-0.5" style={{ color: '#4a6a4a' }}>
                {stats.totalAlerts > 0 ? 'Requieren atención' : 'Todo en orden'}
              </p>
            </div>
          </div>

          {/* FILA 2 */}
          <div className="grid grid-cols-2 gap-3">
            <div
              className="rounded-2xl p-4"
              style={{
                backgroundColor: stats.avgTemp > 35 ? '#1a0808' : '#0d2318',
                border: `1px solid ${stats.avgTemp > 35 ? '#5a1a1a' : '#1a3a20'}`
              }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-xl mb-3"
                style={{ backgroundColor: '#1a3a20' }}
              >
                🌡️
              </div>
              <p className={`text-3xl font-bold ${stats.avgTemp > 35 ? 'text-red-400' : 'text-white'}`}>
                {stats.avgTemp.toFixed(0)}°
              </p>
              <p className="text-xs font-medium mt-1" style={{ color: '#a3d9a5' }}>
                Temperatura prom.
              </p>
              <p className="text-xs mt-0.5" style={{ color: '#4a6a4a' }}>
                {stats.avgTemp >= 18 && stats.avgTemp <= 30 ? 'Rango ideal' : 'Fuera de rango'}
              </p>
            </div>

            <div
              className="rounded-2xl p-4"
              style={{
                backgroundColor: stats.avgHumidity < 30 ? '#1a1208' : '#0d2318',
                border: `1px solid ${stats.avgHumidity < 30 ? '#5a3a10' : '#1a3a20'}`
              }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-xl mb-3"
                style={{ backgroundColor: '#1a3a20' }}
              >
                💧
              </div>
              <p className={`text-3xl font-bold ${stats.avgHumidity < 30 ? 'text-yellow-400' : 'text-white'}`}>
                {stats.avgHumidity.toFixed(0)}%
              </p>
              <p className="text-xs font-medium mt-1" style={{ color: '#a3d9a5' }}>
                Humedad prom.
              </p>
              <p className="text-xs mt-0.5" style={{ color: '#4a6a4a' }}>
                {stats.avgHumidity >= 50 && stats.avgHumidity <= 80 ? 'Nivel óptimo' : 'Revisar riego'}
              </p>
            </div>
          </div>

          {/* FILA 3 */}
          <div className="grid grid-cols-2 gap-3">
            <div
              className="rounded-2xl p-4"
              style={{ backgroundColor: '#0d2318', border: '1px solid #1a3a20' }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-xl mb-3"
                style={{ backgroundColor: '#1a3a20' }}
              >
                ✅
              </div>
              <p className="text-3xl font-bold text-green-400">
                {String(stats.healthySpaces).padStart(2, '0')}
              </p>
              <p className="text-xs font-medium mt-1" style={{ color: '#a3d9a5' }}>
                Espacios ok
              </p>
              <p className="text-xs mt-0.5" style={{ color: '#4a6a4a' }}>
                Funcionando bien
              </p>
            </div>

            <div
              className="rounded-2xl p-4"
              style={{
                backgroundColor: stats.warningSpaces > 0 ? '#1a1208' : '#0d2318',
                border: `1px solid ${stats.warningSpaces > 0 ? '#5a3a10' : '#1a3a20'}`
              }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-xl mb-3"
                style={{ backgroundColor: stats.warningSpaces > 0 ? '#3a2a10' : '#1a3a20' }}
              >
                ⚠️
              </div>
              <p className={`text-3xl font-bold ${stats.warningSpaces > 0 ? 'text-amber-400' : 'text-white'}`}>
                {String(stats.warningSpaces).padStart(2, '0')}
              </p>
              <p className="text-xs font-medium mt-1" style={{ color: '#a3d9a5' }}>
                Con alertas
              </p>
              <p className="text-xs mt-0.5" style={{ color: '#4a6a4a' }}>
                {stats.warningSpaces > 0 ? 'Requieren revisión' : 'Sin problemas'}
              </p>
            </div>
          </div>

          {/* BOTÓN ALERTAS */}
          {stats.totalAlerts > 0 && (
            <button
              onClick={() => navigate('/alertas')}
              className="w-full py-3 rounded-2xl text-sm font-medium transition"
              style={{
                backgroundColor: '#1a0808',
                border: '1px solid #5a1a1a',
                color: '#f87171'
              }}
            >
              ⚠️ Ver {stats.totalAlerts} alerta{stats.totalAlerts !== 1 ? 's' : ''} pendiente{stats.totalAlerts !== 1 ? 's' : ''}
            </button>
          )}
        </div>
      )}

      {/* TAB: PLANTAS */}
      {activeTab === 'plantas' && (
        <div className="space-y-3">
          {spaceStats.filter(s => s.plant_name !== '').length === 0 ? (
            <div
              className="rounded-2xl p-10 text-center"
              style={{ backgroundColor: '#0d2318', border: '1px solid #1a3a20' }}
            >
              <p className="text-4xl mb-3">🌱</p>
              <p style={{ color: '#6b9e6e' }}>No tienes plantas registradas</p>
              <button
                onClick={() => navigate('/')}
                className="mt-3 text-sm"
                style={{ color: '#4ade80' }}
              >
                Ir a Mi Huerto
              </button>
            </div>
          ) : (
            spaceStats.filter(s => s.plant_name !== '').map((s, i) => (
              <div
                key={i}
                className="rounded-2xl p-4"
                style={{
                  backgroundColor: s.status === 'warning' ? '#1a0808' : '#0d2318',
                  border: `1px solid ${s.status === 'warning' ? '#5a1a1a' : '#1a3a20'}`
                }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0"
                    style={{ backgroundColor: '#1a3a20' }}
                  >
                    {s.plant_emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-bold text-white truncate">{s.plant_name}</p>
                      <span
                        className="text-xs px-2 py-0.5 rounded-full shrink-0 ml-2"
                        style={{
                          backgroundColor: s.status === 'ok' ? '#0a2a10' :
                            s.status === 'warning' ? '#2a0a0a' : '#1a2a1a',
                          color: s.status === 'ok' ? '#4ade80' :
                            s.status === 'warning' ? '#f87171' : '#6b9e6e'
                        }}
                      >
                        {s.status === 'ok' ? '✅ Saludable' :
                          s.status === 'warning' ? `⚠️ ${s.alerts} alerta${s.alerts !== 1 ? 's' : ''}` :
                          '📡 Sin sensor'}
                      </span>
                    </div>
                    <p className="text-xs mb-1" style={{ color: '#4a6a4a' }}>{s.name}</p>
                    {s.temperature !== null && (
                      <div className="flex gap-3 text-xs">
                        <span style={{ color: '#f97316' }}>🌡️ {s.temperature.toFixed(1)}°C</span>
                        <span style={{ color: '#38bdf8' }}>💧 {s.humidity?.toFixed(1)}%</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* BARRA DE HUMEDAD */}
                {s.humidity !== null && (
                  <div className="mt-3">
                    <div className="flex justify-between text-xs mb-1" style={{ color: '#4a6a4a' }}>
                      <span>Humedad</span>
                      <span style={{ color: '#a3d9a5' }}>{s.humidity?.toFixed(0)}%</span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: '#1a3a20' }}>
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${s.humidity}%`,
                          backgroundColor: (s.humidity ?? 0) < 30 ? '#f87171' :
                            (s.humidity ?? 0) > 80 ? '#60a5fa' : '#4ade80'
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB: GRÁFICAS */}
      {activeTab === 'graficas' && (
        <div className="space-y-4">
          {barData.length === 0 ? (
            <div
              className="rounded-2xl p-10 text-center"
              style={{ backgroundColor: '#0d2318', border: '1px solid #1a3a20' }}
            >
              <p className="text-4xl mb-3">📊</p>
              <p style={{ color: '#6b9e6e' }}>Sin datos para graficar</p>
              <p className="text-xs mt-1" style={{ color: '#4a6a4a' }}>
                Usa el simulador para generar lecturas
              </p>
            </div>
          ) : (
            <>
              {/* GRÁFICA TEMPERATURA */}
              <div
                className="rounded-2xl p-4"
                style={{ backgroundColor: '#0d2318', border: '1px solid #1a3a20' }}
              >
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold text-white text-sm">🌡️ Temperatura por planta</h2>
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: '#1a3a20', color: '#6b9e6e' }}>
                    °C
                  </span>
                </div>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={barData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1a3a20" />
                    <XAxis dataKey="name" tick={{ fill: '#6b9e6e', fontSize: 14 }} />
                    <YAxis tick={{ fill: '#6b9e6e', fontSize: 10 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0d2318',
                        border: '1px solid #1a3a20',
                        borderRadius: '12px',
                        color: 'white',
                        fontSize: '12px'
                      }}
                      formatter={(value, _name, props) => [
                        `${value}°C`,
                        props.payload.fullName
                      ]}
                    />
                    <Bar dataKey="Temp" fill="#f97316" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* GRÁFICA HUMEDAD */}
              <div
                className="rounded-2xl p-4"
                style={{ backgroundColor: '#0d2318', border: '1px solid #1a3a20' }}
              >
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold text-white text-sm">💧 Humedad por planta</h2>
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: '#1a3a20', color: '#6b9e6e' }}>
                    %
                  </span>
                </div>
                <ResponsiveContainer width="100%" height={180}>
                  <AreaChart data={barData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                    <defs>
                      <linearGradient id="humGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#38bdf8" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1a3a20" />
                    <XAxis dataKey="name" tick={{ fill: '#6b9e6e', fontSize: 14 }} />
                    <YAxis tick={{ fill: '#6b9e6e', fontSize: 10 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0d2318',
                        border: '1px solid #1a3a20',
                        borderRadius: '12px',
                        color: 'white',
                        fontSize: '12px'
                      }}
                      formatter={(value, _name, props) => [
                        `${value}%`,
                        props.payload.fullName
                      ]}
                    />
                    <Area
                      type="monotone"
                      dataKey="Hum"
                      stroke="#38bdf8"
                      fill="url(#humGradient)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* LEYENDA */}
              <div
                className="rounded-2xl p-4"
                style={{ backgroundColor: '#0d2318', border: '1px solid #1a3a20' }}
              >
                <p className="text-xs font-semibold mb-3" style={{ color: '#6b9e6e' }}>
                  📋 Referencias
                </p>
                <div className="space-y-2">
                  {barData.map((d, i) => (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <span className="text-white">{d.name} {d.fullName}</span>
                      <div className="flex gap-3">
                        <span style={{ color: '#f97316' }}>🌡️ {d.Temp}°C</span>
                        <span style={{ color: '#38bdf8' }}>💧 {d.Hum}%</span>
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