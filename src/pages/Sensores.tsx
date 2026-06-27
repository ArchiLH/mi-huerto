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

  useEffect(() => { loadData() }, [])

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
    const confirm = window.confirm('¿Eliminar este sensor? También se eliminarán sus lecturas y alertas.')
    if (!confirm) return
    await supabase.from('sensors').delete().eq('id', id)
    loadData()
  }

  const toggleSensor = async (id: number, active: boolean) => {
    await supabase.from('sensors').update({ active: !active }).eq('id', id)
    loadData()
  }

  return (
    <div className="space-y-5">

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">📡 Sensores</h1>
          <p className="text-slate-400 text-sm mt-1">Gestiona tus sensores</p>
        </div>
        <button
          onClick={openAdd}
          className="bg-green-600 hover:bg-green-500 text-white text-sm px-4 py-2 rounded-xl transition"
        >
          ➕ Agregar
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 bg-slate-800 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : sensors.length === 0 ? (
        <div className="bg-slate-900 rounded-2xl p-10 text-center">
          <p className="text-4xl mb-3">📡</p>
          <p className="text-slate-400">No tienes sensores aún</p>
          <button onClick={openAdd} className="mt-3 text-green-400 text-sm">
            Agregar primer sensor
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {sensors.map(sensor => (
            <div key={sensor.id} className="bg-slate-900 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h3 className="font-bold">{sensor.name}</h3>
                  <p className="text-xs text-slate-400">
                    📍 {sensor.spaces?.name ?? 'Sin espacio'}
                  </p>
                </div>
                <button
                  onClick={() => toggleSensor(sensor.id, sensor.active)}
                  className={`text-xs px-3 py-1.5 rounded-xl transition ${
                    sensor.active ? 'bg-green-600 text-white' : 'bg-slate-700 text-slate-400'
                  }`}
                >
                  {sensor.active ? '✅ Activo' : '⏸ Inactivo'}
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs text-slate-400 mb-3">
                <span>🌡️ {sensor.min_temp}° - {sensor.max_temp}°C</span>
                <span>💧 {sensor.min_humidity}% - {sensor.max_humidity}%</span>
              </div>

              {/* BOTONES EDITAR Y ELIMINAR */}
              <div className="flex gap-2">
                <button
                  onClick={() => openEdit(sensor)}
                  className="flex-1 bg-slate-700 hover:bg-slate-600 text-white text-xs py-2 rounded-xl transition"
                >
                  ✏️ Editar / Cambiar espacio
                </button>
                <button
                  onClick={() => deleteSensor(sensor.id)}
                  className="bg-red-900 hover:bg-red-700 text-red-400 text-xs px-4 py-2 rounded-xl transition"
                >
                  🗑️ Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL AGREGAR / EDITAR */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-end justify-center p-4">
          <div className="bg-slate-900 rounded-2xl w-full max-w-sm">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="font-semibold">
                {editingSensor ? 'Editar sensor' : 'Nuevo sensor'}
              </h3>
              <button onClick={() => setShowAdd(false)} className="text-slate-400 text-xl">✕</button>
            </div>
            <div className="p-4 space-y-3">
              <input
                placeholder="Nombre del sensor"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                className="w-full bg-slate-800 text-white placeholder-slate-500 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-green-500"
              />
              <select
                value={form.space_id}
                onChange={e => setForm({ ...form, space_id: e.target.value })}
                className="w-full bg-slate-800 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="">Seleccionar espacio</option>
                {spaces.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-xs text-slate-400 mb-1">Temp mín °C</p>
                  <input type="number" value={form.min_temp}
                    onChange={e => setForm({ ...form, min_temp: Number(e.target.value) })}
                    className="w-full bg-slate-800 text-white rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-1">Temp máx °C</p>
                  <input type="number" value={form.max_temp}
                    onChange={e => setForm({ ...form, max_temp: Number(e.target.value) })}
                    className="w-full bg-slate-800 text-white rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-1">Humedad mín %</p>
                  <input type="number" value={form.min_humidity}
                    onChange={e => setForm({ ...form, min_humidity: Number(e.target.value) })}
                    className="w-full bg-slate-800 text-white rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-1">Humedad máx %</p>
                  <input type="number" value={form.max_humidity}
                    onChange={e => setForm({ ...form, max_humidity: Number(e.target.value) })}
                    className="w-full bg-slate-800 text-white rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>
              <button
                onClick={saveSensor}
                className="w-full bg-green-600 hover:bg-green-500 text-white font-semibold rounded-xl py-3 transition"
              >
                {editingSensor ? 'Guardar cambios' : 'Agregar sensor'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}