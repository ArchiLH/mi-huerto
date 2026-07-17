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

export default function Reportes() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [stats, setStats] = useState<GlobalStat | null>(null)
  const [spaceStats, setSpaceStats] = useState<SpaceStat[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'resumen' | 'plantas' | 'graficas'>('resumen')

  useEffect(() => { loadReportes() }, [])

  const loadReportes = async () => {
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
      <div className="w-full bg-white px-5 pt-6 space-y-4">
        <div className="h-6 w-1/3 bg-slate-100 rounded-lg animate-pulse" />
        <div className="h-24 bg-slate-50 rounded-2xl animate-pulse border border-slate-100" />
        <div className="grid grid-cols-2 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 bg-slate-50 rounded-2xl animate-pulse border border-slate-100" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="w-full bg-white text-slate-800 font-sans px-5 pt-6 space-y-5 max-w-md mx-auto pb-10">

      {/* HEADER LIMPIO */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-black text-[#1e293b] tracking-tight">
            Panel de control
          </h1>
          <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
            En vivo
          </span>
        </div>
        <p className="text-xs text-slate-400 font-medium leading-relaxed">
          Análisis en tiempo real y estadísticas generales de tu huerto
        </p>
      </div>

      {/* TABS MINIMALISTAS */}
      <div className="flex bg-slate-100/70 p-1 rounded-xl border border-slate-200/30">
        {[
          { key: 'resumen', label: '📊 Resumen' },
          { key: 'plantas', label: '🌿 Plantas' },
          { key: 'graficas', label: '📈 Gráficas' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`flex-1 text-center py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === tab.key
                ? 'bg-white text-[#008f51] shadow-2xs'
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB: RESUMEN */}
      {activeTab === 'resumen' && stats && (
        <div className="space-y-3.5">

          {/* TOTAL PLANTAS Y ALERTAS ACTIVAS */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-3xs flex flex-col justify-between">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-xl flex items-center justify-center mb-3">
                🌱
              </div>
              <div>
                <p className="text-2xl font-black text-slate-800 leading-none">
                  {String(stats.totalPlants).padStart(2, '0')}
                </p>
                <p className="text-[11px] font-bold text-slate-700 mt-1.5">Plantas activas</p>
                <p className="text-[10px] text-slate-400 font-medium mt-0.5">{stats.healthySpaces} saludables</p>
              </div>
            </div>

            <div className={`bg-white rounded-2xl p-4 border flex flex-col justify-between transition-all ${
              stats.totalAlerts > 0 ? 'border-red-200 shadow-xs' : 'border-slate-100 shadow-3xs'
            }`}>
              <div className={`w-9 h-9 rounded-xl text-xl flex items-center justify-center mb-3 ${
                stats.totalAlerts > 0 ? 'bg-red-50' : 'bg-slate-50'
              }`}>
                🔔
              </div>
              <div>
                <p className={`text-2xl font-black leading-none ${stats.totalAlerts > 0 ? 'text-red-500' : 'text-slate-800'}`}>
                  {String(stats.totalAlerts).padStart(2, '0')}
                </p>
                <p className="text-[11px] font-bold text-slate-700 mt-1.5">Alertas activas</p>
                <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                  {stats.totalAlerts > 0 ? 'Requieren atención' : 'Todo en orden'}
                </p>
              </div>
            </div>
          </div>

          {/* TEMPERATURA Y HUMEDAD PROMEDIO */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-3xs flex flex-col justify-between">
              <div className="w-9 h-9 rounded-xl bg-orange-50 text-xl flex items-center justify-center mb-3">
                淡淡 🌡️
              </div>
              <div>
                <p className="text-2xl font-black text-slate-800 prefix-degree leading-none">
                  {stats.avgTemp.toFixed(0)}°C
                </p>
                <p className="text-[11px] font-bold text-slate-700 mt-1.5">Temperatura prom.</p>
                <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                  {stats.avgTemp >= 18 && stats.avgTemp <= 30 ? 'Rango ideal ✅' : 'Fuera de rango'}
                </p>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-3xs flex flex-col justify-between">
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-xl flex items-center justify-center mb-3">
                💧
              </div>
              <div>
                <p className="text-2xl font-black text-slate-800 leading-none">
                  {stats.avgHumidity.toFixed(0)}%
                </p>
                <p className="text-[11px] font-bold text-slate-700 mt-1.5">Humedad prom.</p>
                <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                  {stats.avgHumidity >= 50 && stats.avgHumidity <= 80 ? 'Nivel óptimo ✅' : 'Revisar riego'}
                </p>
              </div>
            </div>
          </div>

          {/* ESPACIOS FUNCIONANDO BIEN VS CRÍTICOS */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-3xs">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Espacios Estables</p>
              <p className="text-2xl font-black text-emerald-600 mt-1">{String(stats.healthySpaces).padStart(2, '0')}</p>
            </div>
            <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-3xs">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Con Problemas</p>
              <p className={`text-2xl font-black mt-1 ${stats.warningSpaces > 0 ? 'text-amber-500' : 'text-slate-400'}`}>
                {String(stats.warningSpaces).padStart(2, '0')}
              </p>
            </div>
          </div>

          {/* BOTÓN GENERAL DE ALERTA AL DETALLE */}
          {stats.totalAlerts > 0 && (
            <button
              onClick={() => navigate('/alertas')}
              className="w-full py-3 rounded-xl text-xs font-bold bg-red-50 text-red-600 border border-red-200/60 hover:bg-red-100 transition shadow-3xs"
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
            <div className="bg-white rounded-[2rem] border-2 border-dashed border-slate-200 p-10 text-center py-14">
              <p className="text-4xl mb-3">🌱</p>
              <p className="text-xs text-slate-400 font-bold">No tienes plantas registradas</p>
              <button onClick={() => navigate('/')} className="mt-3 text-xs text-emerald-600 font-bold">
                Ir a Mi Huerto
              </button>
            </div>
          ) : (
            spaceStats.filter(s => s.plant_name !== '').map((s, i) => (
              <div
                key={i}
                className={`bg-white rounded-2xl p-4 border transition-all shadow-3xs ${
                  s.status === 'warning' ? 'border-red-200 bg-red-50/5' : 'border-slate-100'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-slate-50 flex items-center justify-center text-xl shrink-0 border border-slate-100">
                    {s.plant_emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <p className="font-bold text-xs text-slate-800 truncate">{s.plant_name}</p>
                      <span className={`text-[10px] font-bold px-2 py-0.2 rounded-full shrink-0 ${
                        s.status === 'ok' ? 'bg-emerald-50 text-emerald-600' :
                        s.status === 'warning' ? 'bg-red-50 text-red-500' : 'bg-slate-50 text-slate-400'
                      }`}>
                        {s.status === 'ok' ? 'Saludable' :
                          s.status === 'warning' ? `⚠️ Alerta` : 'Sin datos'}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 font-semibold mb-1.5">📍 {s.name}</p>
                    
                    {s.temperature !== null && (
                      <div className="flex gap-3 text-[11px] font-bold">
                        <span className="text-orange-500">静态 🌡️ {s.temperature.toFixed(1)}°C</span>
                        <span className="text-blue-500">💧 {s.humidity?.toFixed(1)}%</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* VISUALIZADOR DE RIEGO RÁPIDO */}
                {s.humidity !== null && (
                  <div className="mt-3 pt-2.5 border-t border-slate-100/60">
                    <div className="flex justify-between text-[10px] text-slate-400 font-bold mb-1">
                      <span>Nivel de hidratación</span>
                      <span className="text-slate-600">{s.humidity?.toFixed(0)}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${s.humidity}%`,
                          backgroundColor: (s.humidity ?? 0) < 30 ? '#ef4444' :
                            (s.humidity ?? 0) > 80 ? '#3b82f6' : '#10b981'
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
            <div className="bg-white rounded-[2rem] border-2 border-dashed border-slate-200 p-10 text-center py-14">
              <p className="text-4xl mb-3">📊</p>
              <p className="text-xs text-slate-400 font-bold">Sin datos para graficar</p>
            </div>
          ) : (
            <>
              {/* COMPORTAMIENTO TEMPERATURA POR PLANTA */}
              <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-3xs">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-bold text-slate-700 text-xs">🌡️ Temperatura por planta</h2>
                  <span className="text-[10px] bg-slate-50 border border-slate-200/60 px-2 py-0.5 rounded-md text-slate-500 font-bold">
                    °C
                  </span>
                </div>
                <ResponsiveContainer width="100%" height={170}>
                  <BarChart data={barData} margin={{ top: 5, right: 5, bottom: 5, left: -25 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 13 }} />
                    <YAxis tick={{ fill: '#94a3b8', fontSize: 9 }} />
                    <Tooltip
                      contentStyle={{ borderRadius: '12px', fontSize: '11px' }}
                      formatter={(value, _name, props) => [`${value}°C`, props.payload.fullName]}
                    />
                    <Bar dataKey="Temp" fill="#f97316" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* COMPORTAMIENTO HUMEDAD POR PLANTA */}
              <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-3xs">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-bold text-slate-700 text-xs">💧 Humedad por planta</h2>
                  <span className="text-[10px] bg-slate-50 border border-slate-200/60 px-2 py-0.5 rounded-md text-slate-500 font-bold">
                    %
                  </span>
                </div>
                <ResponsiveContainer width="100%" height={170}>
                  <AreaChart data={barData} margin={{ top: 5, right: 5, bottom: 5, left: -25 }}>
                    <defs>
                      <linearGradient id="humGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#38bdf8" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 13 }} />
                    <YAxis tick={{ fill: '#94a3b8', fontSize: 9 }} />
                    <Tooltip
                      contentStyle={{ borderRadius: '12px', fontSize: '11px' }}
                      formatter={(value, _unused, props) => [`${value}%`, props.payload.fullName]}
                    />
                    <Area type="monotone" dataKey="Hum" stroke="#38bdf8" fill="url(#humGradient)" strokeWidth={2.5} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* LEYENDA DETALLADA */}
              <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-3xs">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">
                  📋 Lista de referencias
                </p>
                <div className="space-y-2.5 divide-y divide-slate-100/70">
                  {barData.map((d, i) => (
                    <div key={i} className={`flex items-center justify-between text-xs font-semibold ${i > 0 ? 'pt-2.5' : ''}`}>
                      <span className="text-slate-700">{d.name} {d.fullName}</span>
                      <div className="flex gap-3 text-[11px]">
                        <span className="text-orange-500 font-bold">🌡️ {d.Temp}°C</span>
                        <span className="text-blue-500 font-bold">💧 {d.Hum}%</span>
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