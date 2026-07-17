import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

type Sensor = {
  id: number
  name: string
  active: boolean
  min_temp: number
  max_temp: number
  min_humidity: number
  max_humidity: number
  created_at: string
  space_id: number
  spaces?: { name: string } | null
}

export default function Sensores() {
  const { user } = useAuth()
  const [sensors, setSensors] = useState<Sensor[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [editingSensor, setEditingSensor] = useState<Sensor | null>(null)
  const [spaces, setSpaces] = useState<{ id: number; name: string }[]>([])
  const [form, setForm] = useState({
    name: '', space_id: '', min_temp: 10, max_temp: 35,
    min_humidity: 30, max_humidity: 80
  })

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    if (!user) return

    const { data: sensorData } = await supabase
      .from('sensors')
      .select('*, spaces(name)')
      .order('created_at', { ascending: false })

    setSensors((sensorData as Sensor[]) ?? [])

    const { data: spaceData } = await supabase
      .from('spaces')
      .select('id, name')
      .eq('user_id', user.id)
      .order('slot_number')

    setSpaces(spaceData ?? [])
    setLoading(false)
  }

  const openAdd = () => {
    setEditingSensor(null)
    setForm({ name: '', space_id: '', min_temp: 10, max_temp: 35, min_humidity: 30, max_humidity: 80 })
    setShowAdd(true)
  }

  const openEdit = (sensor: Sensor) => {
    setEditingSensor(sensor)
    setForm({
      name: sensor.name,
      space_id: String(sensor.space_id),
      min_temp: sensor.min_temp,
      max_temp: sensor.max_temp,
      min_humidity: sensor.min_humidity,
      max_humidity: sensor.max_humidity,
    })
    setShowAdd(true)
  }

  const saveSensor = async () => {
    if (!form.name || !form.space_id) {
      alert('Completa nombre y espacio')
      return
    }

    const payload = {
      name: form.name,
      space_id: Number(form.space_id),
      min_temp: form.min_temp,
      max_temp: form.max_temp,
      min_humidity: form.min_humidity,
      max_humidity: form.max_humidity,
      active: true,
    }

    if (editingSensor) {
      await supabase.from('sensors').update(payload).eq('id', editingSensor.id)
    } else {
      await supabase.from('sensors').insert(payload)
    }

    setShowAdd(false)
    setEditingSensor(null)
    loadData()
  }

  const deleteSensor = async (id: number) => {
    const confirm = window.confirm('¿Eliminar este sensor?')
    if (!confirm) return
    await supabase.from('sensors').delete().eq('id', id)
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
      <div className="w-full bg-[#f4f7f5]/40 min-h-screen px-5 pt-6 space-y-4">
        <div className="h-6 w-1/3 bg-slate-100 rounded-lg animate-pulse" />
        <div className="h-20 bg-white rounded-2xl animate-pulse border border-slate-100 shadow-3xs" />
        <div className="h-32 bg-white rounded-2xl animate-pulse border border-slate-100 shadow-3xs" />
      </div>
    )
  }

  return (
    <div className="w-full bg-[#f4f7f5]/40 min-h-screen px-5 pt-6 space-y-5 max-w-md mx-auto pb-10 font-sans text-slate-800">

      {/* HEADER PRINCIPAL */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-black text-[#1e293b] tracking-tight flex items-center gap-2">
            Sensores 📡
          </h1>
          <button
            onClick={openAdd}
            className="text-xs font-bold px-3 py-2 rounded-xl bg-[#009660] hover:bg-[#008152] text-white transition-colors shadow-3xs"
          >
            ➕ Nuevo
          </button>
        </div>
        <p className="text-xs text-slate-400 font-medium leading-relaxed">
          Estado de los {sensors.length} sensores de tu huerto — cada uno monitorea temperatura y humedad
        </p>
      </div>

      {/* INDICADORES DE USO (Diseño exacto de tu captura) */}
      <div className="space-y-4 pt-1">
        {/* EN USO */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 tracking-wider uppercase pl-1">
            <span className="text-emerald-500 text-xs">✅</span>
            <h2>EN USO ({activeSensors.length})</h2>
          </div>
          {activeSensors.length === 0 && (
            <p className="text-xs text-slate-400 font-semibold pl-1">
              Ningún sensor activo con planta asignada
            </p>
          )}
        </div>

        {/* DISPONIBLES */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 tracking-wider uppercase pl-1">
            <span className="text-slate-300 text-xs">🔳</span>
            <h2>DISPONIBLES ({inactiveSensors.length})</h2>
          </div>
          {inactiveSensors.length === 0 && (
            <p className="text-xs text-slate-400 font-semibold pl-1">
              Todos los sensores están en uso
            </p>
          )}
        </div>
      </div>

      {/* LISTADO DE TARJETAS DE SENSORES */}
      {sensors.length > 0 && (
        <div className="space-y-3 pt-2">
          {sensors.map(sensor => (
            <div
              key={sensor.id}
              className={`bg-white rounded-2xl p-4 border transition-all shadow-[0_4px_20px_rgba(0,0,0,0.02)] ${
                sensor.active ? 'border-slate-100' : 'border-slate-200/60 opacity-75'
              }`}
            >
              {/* FILA SUPERIOR: EMOJI, INFO, TOGGLE */}
              <div className="flex items-start gap-3 mb-3">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0 ${
                  sensor.active ? 'bg-emerald-50 text-[#009660]' : 'bg-slate-50 text-slate-400'
                }`}>
                  📡
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <h3 className="font-extrabold text-xs text-slate-800 truncate">{sensor.name}</h3>
                    
                    {/* Botón Switch de Estado */}
                    <button
                      onClick={() => toggleSensor(sensor.id, sensor.active)}
                      className={`text-[9px] font-black px-2.5 py-0.5 rounded-full transition shrink-0 ml-2 border ${
                        sensor.active
                          ? 'bg-[#e2faee] text-[#008f51] border-transparent'
                          : 'bg-slate-50 text-slate-400 border-slate-200/60'
                      }`}
                    >
                      {sensor.active ? '● Activo' : '○ Inactivo'}
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400 font-semibold">
                    📍 {sensor.spaces?.name ?? 'Sin espacio asignado'}
                  </p>
                </div>
              </div>

              {/* RANGOS ESTABLECIDOS */}
              <div className="grid grid-cols-2 gap-2 rounded-xl p-2.5 mb-3 bg-[#f8faf9] border border-slate-100/50">
                <div className="text-[10px] font-bold text-slate-400 flex items-center gap-1 justify-center">
                  <span>Temp:</span>
                  <span className="text-orange-500">{sensor.min_temp}°C – {sensor.max_temp}°C</span>
                </div>
                <div className="text-[10px] font-bold text-slate-400 flex items-center gap-1 justify-center">
                  <span>Hum:</span>
                  <span className="text-blue-500">{sensor.min_humidity}% – {sensor.max_humidity}%</span>
                </div>
              </div>

              {/* ACCIONES (EDITAR Y BORRAR) */}
              <div className="flex gap-2">
                <button
                  onClick={() => openEdit(sensor)}
                  className="flex-1 py-2 rounded-xl text-[10px] font-bold bg-[#e2faee] hover:bg-[#cbf3de] text-[#008f51] transition-colors"
                >
                  ✏️ Editar
                </button>
                <button
                  onClick={() => deleteSensor(sensor.id)}
                  className="px-3.5 py-2 rounded-xl text-xs bg-red-50 text-red-500 hover:bg-red-100 border border-red-100/40 transition-colors"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL PARA AGREGAR/EDITAR SENSOR */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-sm bg-white rounded-[2rem] overflow-hidden shadow-2xl border border-slate-100 flex flex-col">
            
            {/* CABECERA DEL MODAL */}
            <div className="px-5 py-4 flex items-center justify-between border-b border-slate-100">
              <h3 className="font-extrabold text-sm text-slate-800">
                {editingSensor ? '✏️ Editar sensor' : '📡 Nuevo sensor'}
              </h3>
              <button
                onClick={() => setShowAdd(false)}
                className="w-7 h-7 flex items-center justify-center rounded-full bg-slate-100 text-slate-400 text-xs font-bold"
              >
                ✕
              </button>
            </div>

            {/* FORMULARIO */}
            <div className="p-5 space-y-3.5">
              <input
                placeholder="Nombre del sensor"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                className="w-full bg-[#f4f7f5] border border-slate-200/60 text-slate-800 placeholder-slate-400 rounded-xl px-4 py-2.5 outline-none text-xs font-semibold"
              />

              <div className="relative">
                <select
                  value={form.space_id}
                  onChange={e => setForm({ ...form, space_id: e.target.value })}
                  className="w-full bg-[#f4f7f5] border border-slate-200/60 text-slate-500 rounded-xl px-4 py-2.5 outline-none text-xs font-semibold appearance-none cursor-pointer"
                >
                  <option value="">Seleccionar espacio</option>
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

              {/* RANGOS NUMÉRICOS */}
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
                      className="w-full bg-[#f4f7f5] border border-slate-200/60 text-slate-800 rounded-xl px-3 py-2 outline-none text-xs font-bold"
                    />
                  </div>
                ))}
              </div>

              {/* ACCIÓN DE GUARDADO */}
              <button
                onClick={saveSensor}
                className="w-full text-white font-bold rounded-xl py-3 text-xs bg-[#009660] hover:bg-[#008152] transition-colors shadow-3xs"
              >
                {editingSensor ? '💾 Guardar cambios' : '➕ Agregar sensor'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}