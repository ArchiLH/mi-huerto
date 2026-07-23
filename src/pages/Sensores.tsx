import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { usePremium } from '../context/PremiumContext'

type Sensor = {
  id: number
  name: string
  active: boolean
  min_temp: number
  max_temp: number
  min_humidity: number
  max_humidity: number
  created_at: string
  space_id: number | null
  spaces?: { name: string } | null
}

const FREE_SENSOR_LIMIT = 4
const PREMIUM_SENSOR_LIMIT = 8

export default function Sensores() {
  const { user } = useAuth()
  const { isPremium } = usePremium()
  const [sensors, setSensors] = useState<Sensor[]>([])
  const [loading, setLoading] = useState(true)
  const [editingSensor, setEditingSensor] = useState<Sensor | null>(null)
  const [spaces, setSpaces] = useState<{ id: number; name: string }[]>([])
  const [form, setForm] = useState({
    space_id: '', min_temp: 10, max_temp: 35,
    min_humidity: 30, max_humidity: 80
  })

  useEffect(() => {
    if (user) loadData()
  }, [user, isPremium])

  const loadData = async () => {
    if (!user) return

    // 1. Obtener los espacios del usuario
    const { data: spaceData } = await supabase
      .from('spaces')
      .select('id, name')
      .eq('user_id', user.id)
      .order('slot_number')

    setSpaces(spaceData ?? [])
    const spaceIds = (spaceData ?? []).map(s => s.id)
    
    if (spaceIds.length > 0) {
      let { data: sensorData } = await supabase
        .from('sensors')
        .select('*, spaces(name)')
        .in('space_id', spaceIds)
        .order('id')

      let currentSensors = (sensorData as Sensor[]) ?? []
      const targetLimit = isPremium ? PREMIUM_SENSOR_LIMIT : FREE_SENSOR_LIMIT

      // 2. AUTO-CREACIÓN o REVISIÓN de límites
      if (currentSensors.length < targetLimit) {
        const sensorsToInsert = []
        for (let i = currentSensors.length + 1; i <= targetLimit; i++) {
          const correspondingSpace = spaceData?.[i - 1]
          sensorsToInsert.push({
            name: `Sensor ${i}`,
            space_id: correspondingSpace ? correspondingSpace.id : null,
            min_temp: 10,
            max_temp: 35,
            min_humidity: 30,
            max_humidity: 80,
            active: true
          })
        }

        await supabase.from('sensors').insert(sensorsToInsert)

        const { data: refreshedSensors } = await supabase
          .from('sensors')
          .select('*, spaces(name)')
          .in('space_id', spaceIds)
          .order('id')

        currentSensors = (refreshedSensors as Sensor[]) ?? []
      }

      // 3. LIMPIEZA AUTOMÁTICA DE NOMBRES
      for (let i = 0; i < currentSensors.length; i++) {
        const expectedName = `Sensor ${i + 1}`
        if (currentSensors[i].name !== expectedName) {
          await supabase
            .from('sensors')
            .update({ name: expectedName })
            .eq('id', currentSensors[i].id)
          currentSensors[i].name = expectedName
        }
      }

      setSensors(currentSensors)
    }

    setLoading(false)
  }

  const openEdit = (sensor: Sensor) => {
    setEditingSensor(sensor)
    setForm({
      space_id: sensor.space_id ? String(sensor.space_id) : '',
      min_temp: sensor.min_temp,
      max_temp: sensor.max_temp,
      min_humidity: sensor.min_humidity,
      max_humidity: sensor.max_humidity,
    })
  }

  const saveSensor = async () => {
    if (!editingSensor) return

    const payload = {
      space_id: form.space_id ? Number(form.space_id) : null,
      min_temp: form.min_temp,
      max_temp: form.max_temp,
      min_humidity: form.min_humidity,
      max_humidity: form.max_humidity,
    }

    await supabase.from('sensors').update(payload).eq('id', editingSensor.id)

    setEditingSensor(null)
    loadData()
  }

  const toggleSensor = async (id: number, active: boolean) => {
    await supabase.from('sensors').update({ active: !active }).eq('id', id)
    loadData()
  }

  const activeSensors = sensors.filter(s => s.active)
  const inactiveSensors = sensors.filter(s => !s.active)

  if (loading) {
    return (
      <div className="w-full min-h-[60vh] flex flex-col justify-center items-center space-y-4 bg-[#f4f7f5]">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-bold text-slate-400">Cargando sensores...</p>
      </div>
    )
  }

  return (
    <div className="w-full min-h-screen bg-[#f4f7f5] p-3 sm:p-6 lg:p-8 flex justify-center">
      <div className="w-full max-w-[1200px] space-y-6 pb-16 font-sans text-slate-800">

        {/* HEADER PRINCIPAL */}
        <div className="space-y-1 bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-xs">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-[#1e293b] tracking-tight flex items-center gap-2">
              Sensores 📡
            </h1>
            <span className="text-[10px] font-black bg-emerald-100 text-emerald-800 px-3 py-1.5 rounded-full shadow-3xs">
              {isPremium ? '👑 Plan Premium (8 Sensores)' : '🌱 Plan Free (4 Sensores)'}
            </span>
          </div>
          <p className="text-xs text-slate-400 font-semibold leading-relaxed">
            Tus sensores se gestionan de forma automática para monitorear temperatura y humedad.
          </p>
        </div>

        {/* INDICADORES DE USO */}
        <div className="grid grid-cols-2 gap-3 max-w-md">
          <div className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-xs flex items-center gap-3">
            <span className="text-emerald-500 text-lg">✅</span>
            <div>
              <p className="text-sm font-black text-slate-800">{activeSensors.length}</p>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">Activos</p>
            </div>
          </div>
          <div className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-xs flex items-center gap-3">
            <span className="text-slate-300 text-lg">🔳</span>
            <div>
              <p className="text-sm font-black text-slate-800">{inactiveSensors.length}</p>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">Inactivos</p>
            </div>
          </div>
        </div>

        {/* LISTADO DE TARJETAS EN CUADRÍCULA (GRID) PARA PC Y MÓVIL */}
        {sensors.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sensors.map(sensor => (
              <div
                key={sensor.id}
                className={`bg-white rounded-2xl p-4 sm:p-5 border transition-all flex flex-col justify-between ${
                  sensor.active 
                    ? 'border-[#51e29d]/60 shadow-[0_4px_20px_-4px_rgba(81,226,157,0.12)]' 
                    : 'border-slate-200/60 opacity-75 shadow-xs'
                }`}
              >
                <div>
                  <div className="flex items-start gap-3 mb-3">
                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-xl shrink-0 border ${
                      sensor.active ? 'bg-emerald-50 text-[#009660] border-emerald-100' : 'bg-slate-50 text-slate-400 border-slate-100'
                    }`}>
                      📡
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <h3 className="font-extrabold text-xs sm:text-sm text-slate-800 truncate">{sensor.name}</h3>
                        
                        <button
                          onClick={() => toggleSensor(sensor.id, sensor.active)}
                          className={`text-[9px] font-black px-2.5 py-0.5 rounded-full transition shrink-0 ml-2 border cursor-pointer ${
                            sensor.active
                              ? 'bg-[#e2faee] text-[#008f51] border-emerald-200'
                              : 'bg-slate-50 text-slate-400 border-slate-200/60'
                          }`}
                        >
                          {sensor.active ? '● Activo' : '○ Inactivo'}
                        </button>
                      </div>
                      <p className="text-[10px] text-slate-400 font-semibold truncate">
                        📍 {sensor.spaces?.name ?? 'Sin espacio asignado'}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 rounded-xl p-2.5 mb-3 bg-[#f8faf9] border border-slate-100">
                    <div className="text-[10px] font-bold text-slate-500 flex items-center gap-1 justify-center">
                      <span>Temp:</span>
                      <span className="text-orange-600 font-extrabold">{sensor.min_temp}°C – {sensor.max_temp}°C</span>
                    </div>
                    <div className="text-[10px] font-bold text-slate-500 flex items-center gap-1 justify-center">
                      <span>Hum:</span>
                      <span className="text-blue-600 font-extrabold">{sensor.min_humidity}% – {sensor.max_humidity}%</span>
                    </div>
                  </div>
                </div>

                <div>
                  <button
                    onClick={() => openEdit(sensor)}
                    className="w-full py-2.5 rounded-xl text-[10px] font-bold bg-[#e2faee] hover:bg-[#cbf3de] text-[#008f51] transition-colors cursor-pointer border border-emerald-200/60 shadow-3xs"
                  >
                    ✏️ Configurar rangos y espacio
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* MODAL PARA EDITAR */}
        {editingSensor && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-fadeIn">
            <div className="w-full max-w-sm bg-white rounded-[2rem] overflow-hidden shadow-2xl border border-slate-100 flex flex-col">
              <div className="px-5 py-4 flex items-center justify-between border-b border-slate-100">
                <h3 className="font-extrabold text-sm text-slate-800">
                  ✏️ Configurar {editingSensor.name}
                </h3>
                <button
                  onClick={() => setEditingSensor(null)}
                  className="w-7 h-7 flex items-center justify-center rounded-full bg-slate-100 text-slate-400 text-xs font-bold cursor-pointer hover:bg-slate-200"
                >
                  ✕
                </button>
              </div>

              <div className="p-5 space-y-3.5">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-400">Espacio asignado</p>
                  <div className="relative">
                    <select
                      value={form.space_id}
                      onChange={e => setForm({ ...form, space_id: e.target.value })}
                      className="w-full bg-[#f4f7f5] border border-slate-200/60 text-slate-700 rounded-xl px-4 py-2.5 outline-none text-xs font-semibold appearance-none cursor-pointer"
                    >
                      <option value="">Sin espacio asignado</option>
                      {spaces.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-slate-400">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                      </svg>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Temp mín °C', key: 'min_temp' },
                    { label: 'Temp máx °C', key: 'max_temp' },
                    { label: 'Hum mín %', key: 'min_humidity' },
                    { label: 'Hum máx %', key: 'max_humidity' },
                  ].map(field => (
                    <div key={field.key} className="space-y-1">
                      <p className="text-[10px] font-bold text-slate-400">{field.label}</p>
                      <input
                        type="number"
                        value={form[field.key as keyof typeof form]}
                        onChange={e => setForm({ ...form, [field.key]: Number(e.target.value) })}
                        className="w-full bg-[#f4f7f5] border border-slate-200/60 text-slate-800 rounded-xl px-3 py-2 outline-none text-xs font-bold shadow-xs"
                      />
                    </div>
                  ))}
                </div>

                <button
                  onClick={saveSensor}
                  className="w-full text-white font-bold rounded-xl py-3 text-xs bg-[#009660] hover:bg-[#008152] transition-colors shadow-xs cursor-pointer"
                >
                  💾 Guardar cambios
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}