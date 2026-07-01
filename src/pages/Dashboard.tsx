import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip
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

  useEffect(() => { loadDashboard() }, [])

  const loadDashboard = async () => {
    if (!user) return

    // Cargar espacios
    const { data: spaces } = await supabase
      .from('spaces')
      .select('*, plant_catalog(name, emoji), sensors(id, active)')
      .eq('user_id', user.id)
      .order('slot_number')

    if (!spaces) { setLoading(false); return }

    const enriched: SpaceStat[] = await Promise.all(
      spaces.map(async (space) => {
        if (!space.plant_id) {
          return {
            name: space.name,
            plant_name: '',
            plant_emoji: '',
            temperature: null,
            humidity: null,
            status: 'empty' as const,
            alerts: 0,
          }
        }

        if (!space.sensors || space.sensors.length === 0) {
          return {
            name: space.name,
            plant_name: space.plant_catalog?.name ?? '',
            plant_emoji: space.plant_catalog?.emoji ?? '🪴',
            temperature: null,
            humidity: null,
            status: 'no_sensor' as const,
            alerts: 0,
          }
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
          status: alertCount > 0 ? 'warning' : 'ok',
          alerts: alertCount,
        } as SpaceStat
      })
    )

    const withData = enriched.filter(s => s.temperature !== null)
    const withPlants = enriched.filter(s => s.plant_name !== '')

    setSpaceStats(enriched)
    setStats({
      totalPlants: withPlants.length,
      avgTemp: withData.length > 0
        ? withData.reduce((acc, s) => acc + (s.temperature ?? 0), 0) / withData.length
        : 0,
      avgHumidity: withData.length > 0
        ? withData.reduce((acc, s) => acc + (s.humidity ?? 0), 0) / withData.length
        : 0,
      totalAlerts: enriched.reduce((acc, s) => acc + s.alerts, 0),
      healthySpaces: enriched.filter(s => s.status === 'ok').length,
      warningSpaces: enriched.filter(s => s.status === 'warning').length,
    })

    setLoading(false)
  }

  const barData = spaceStats
    .filter(s => s.temperature !== null)
    .map(s => ({
      name: s.plant_emoji + ' ' + s.plant_name,
      Temperatura: s.temperature,
      Humedad: s.humidity,
    }))

  const radarData = spaceStats
    .filter(s => s.temperature !== null)
    .map(s => ({
      subject: s.plant_emoji + ' ' + s.plant_name,
      Temp: s.temperature,
      Humedad: s.humidity,
    }))

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-slate-800 rounded-xl animate-pulse w-48" />
        <div className="grid grid-cols-2 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-slate-800 rounded-2xl animate-pulse" />
          ))}
        </div>
        <div className="h-64 bg-slate-800 rounded-2xl animate-pulse" />
      </div>
    )
  }

  return (
    <div className="space-y-6">

      {/* HEADER */}
      <div>
        <h1 className="text-2xl font-bold">📊 Dashboard</h1>
        <p className="text-slate-400 text-sm mt-1">
          Resumen general de tu huerto
        </p>
      </div>

      {/* STATS GLOBALES */}
      {stats && (
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-900 rounded-2xl p-4">
            <p className="text-xs text-slate-400 mb-1">🌱 Total plantas</p>
            <p className="text-3xl font-bold">{stats.totalPlants}</p>
          </div>
          <div className={`rounded-2xl p-4 ${stats.totalAlerts > 0 ? 'bg-red-900/30 border border-red-500/20' : 'bg-slate-900'}`}>
            <p className="text-xs text-slate-400 mb-1">🔔 Alertas activas</p>
            <p className={`text-3xl font-bold ${stats.totalAlerts > 0 ? 'text-red-400' : 'text-white'}`}>
              {stats.totalAlerts}
            </p>
          </div>
          <div className={`rounded-2xl p-4 ${stats.avgTemp > 35 ? 'bg-red-900/30' : 'bg-slate-900'}`}>
            <p className="text-xs text-slate-400 mb-1">🌡️ Temp. promedio</p>
            <p className={`text-3xl font-bold ${stats.avgTemp > 35 ? 'text-red-400' : 'text-orange-400'}`}>
              {stats.avgTemp.toFixed(1)}°C
            </p>
          </div>
          <div className={`rounded-2xl p-4 ${stats.avgHumidity < 30 ? 'bg-yellow-900/30' : 'bg-slate-900'}`}>
            <p className="text-xs text-slate-400 mb-1">💧 Hum. promedio</p>
            <p className={`text-3xl font-bold ${stats.avgHumidity < 30 ? 'text-yellow-400' : 'text-blue-400'}`}>
              {stats.avgHumidity.toFixed(1)}%
            </p>
          </div>
          <div className="bg-slate-900 rounded-2xl p-4">
            <p className="text-xs text-slate-400 mb-1">✅ Espacios ok</p>
            <p className="text-3xl font-bold text-green-400">{stats.healthySpaces}</p>
          </div>
          <div className={`rounded-2xl p-4 ${stats.warningSpaces > 0 ? 'bg-amber-900/30' : 'bg-slate-900'}`}>
            <p className="text-xs text-slate-400 mb-1">⚠️ Con alertas</p>
            <p className={`text-3xl font-bold ${stats.warningSpaces > 0 ? 'text-amber-400' : 'text-white'}`}>
              {stats.warningSpaces}
            </p>
          </div>
        </div>
      )}

      {/* ESTADO POR ESPACIO */}
      {spaceStats.filter(s => s.plant_name !== '').length > 0 && (
        <div className="bg-slate-900 rounded-2xl p-4">
          <h2 className="font-semibold text-sm text-slate-300 mb-3">
            🌿 Estado por planta
          </h2>
          <div className="space-y-3">
            {spaceStats
              .filter(s => s.plant_name !== '')
              .map((s, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-2xl">{s.plant_emoji}</span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium">{s.plant_name}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        s.status === 'ok' ? 'bg-green-900/50 text-green-400' :
                        s.status === 'warning' ? 'bg-amber-900/50 text-amber-400' :
                        'bg-slate-800 text-slate-400'
                      }`}>
                        {s.status === 'ok' ? '✅ Ok' :
                         s.status === 'warning' ? `⚠️ ${s.alerts} alerta${s.alerts !== 1 ? 's' : ''}` :
                         '📡 Sin sensor'}
                      </span>
                    </div>
                    {s.temperature !== null && (
                      <div className="flex gap-3 text-xs text-slate-400">
                        <span className="text-orange-400">🌡️ {s.temperature.toFixed(1)}°C</span>
                        <span className="text-blue-400">💧 {s.humidity?.toFixed(1)}%</span>
                        <span className="text-slate-500">{s.name}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* GRÁFICA DE BARRAS */}
      {barData.length > 0 && (
        <div className="bg-slate-900 rounded-2xl p-4">
          <h2 className="font-semibold text-sm text-slate-300 mb-4">
            📈 Comparativa por planta
          </h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={barData} margin={{ top: 5, right: 5, bottom: 40, left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis
                dataKey="name"
                tick={{ fill: '#64748b', fontSize: 9 }}
                angle={-35}
                textAnchor="end"
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
              <Bar dataKey="Temperatura" fill="#f97316" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Humedad" fill="#38bdf8" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-4 mt-2 text-xs text-slate-400">
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-orange-400 inline-block" /> Temperatura °C
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-blue-400 inline-block" /> Humedad %
            </span>
          </div>
        </div>
      )}

      {/* RADAR */}
      {radarData.length >= 3 && (
        <div className="bg-slate-900 rounded-2xl p-4">
          <h2 className="font-semibold text-sm text-slate-300 mb-4">
            🕸️ Radar de condiciones
          </h2>
          <ResponsiveContainer width="100%" height={250}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#1e293b" />
              <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 9 }} />
              <Radar name="Temp" dataKey="Temp" stroke="#f97316" fill="#f97316" fillOpacity={0.2} />
              <Radar name="Humedad" dataKey="Humedad" stroke="#38bdf8" fill="#38bdf8" fillOpacity={0.2} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* BOTÓN VER ALERTAS */}
      {stats && stats.totalAlerts > 0 && (
        <button
          onClick={() => navigate('/alertas')}
          className="w-full bg-red-900/30 hover:bg-red-900/50 border border-red-500/30 text-red-400 py-3 rounded-2xl transition text-sm font-medium"
        >
          ⚠️ Ver {stats.totalAlerts} alerta{stats.totalAlerts !== 1 ? 's' : ''} pendiente{stats.totalAlerts !== 1 ? 's' : ''}
        </button>
      )}

      {/* EMPTY STATE */}
      {spaceStats.filter(s => s.plant_name !== '').length === 0 && (
        <div className="bg-slate-900 rounded-2xl p-10 text-center">
          <p className="text-4xl mb-3">🌱</p>
          <p className="text-slate-400">Aún no tienes plantas registradas</p>
          <button
            onClick={() => navigate('/')}
            className="mt-3 text-green-400 text-sm"
          >
            Ir a Mi Huerto
          </button>
        </div>
      )}

    </div>
  )
}