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

  return (
    <div className="space-y-5">

      {/* HEADER */}
      <div
        className="rounded-2xl p-5"
        style={{ backgroundColor: '#0d2318', border: '1px solid #1a3a20' }}
      >
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs font-mono uppercase tracking-widest" style={{ color: '#4a6a4a' }}>
              Dispositivos IoT
            </span>
            <h1 className="text-xl font-bold text-white mt-1">📡 Sensores</h1>
            <p className="text-sm mt-0.5" style={{ color: '#6b9e6e' }}>
              {sensors.filter(s => s.active).length} activos · {sensors.length} en total
            </p>
          </div>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 text-sm px-4 py-2 rounded-xl transition"
            style={{ backgroundColor: '#2d6a35', color: 'white' }}
          >
            ➕ Nuevo
          </button>
        </div>
      </div>

      {/* LISTA */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-28 rounded-2xl animate-pulse" style={{ backgroundColor: '#0d2318' }} />
          ))}
        </div>
      ) : sensors.length === 0 ? (
        <div
          className="rounded-2xl p-10 text-center"
          style={{ backgroundColor: '#0d2318', border: '1px solid #1a3a20' }}
        >
          <p className="text-4xl mb-3">📡</p>
          <p className="font-medium text-white mb-1">No tienes sensores aún</p>
          <p className="text-sm mb-4" style={{ color: '#6b9e6e' }}>
            Agrega tu primer sensor para comenzar a monitorear
          </p>
          <button
            onClick={openAdd}
            className="text-sm px-5 py-2 rounded-xl"
            style={{ backgroundColor: '#2d6a35', color: 'white' }}
          >
            ➕ Agregar sensor
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {sensors.map(sensor => (
            <div
              key={sensor.id}
              className="rounded-2xl p-4"
              style={{
                backgroundColor: '#0d2318',
                border: `1px solid ${sensor.active ? '#1a3a20' : '#2a2a2a'}`
              }}
            >
              {/* TOP ROW */}
              <div className="flex items-start gap-3 mb-3">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0"
                  style={{ backgroundColor: sensor.active ? '#1a3a20' : '#1a1a1a' }}
                >
                  📡
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <h3 className="font-bold text-white truncate">{sensor.name}</h3>
                    <button
                      onClick={() => toggleSensor(sensor.id, sensor.active)}
                      className="text-xs px-3 py-1 rounded-full transition shrink-0 ml-2"
                      style={{
                        backgroundColor: sensor.active ? '#0a2a10' : '#1a1a1a',
                        color: sensor.active ? '#4ade80' : '#6b6b6b',
                        border: `1px solid ${sensor.active ? '#2d6a35' : '#2a2a2a'}`
                      }}
                    >
                      {sensor.active ? '● Activo' : '○ Inactivo'}
                    </button>
                  </div>
                  <p className="text-xs" style={{ color: '#6b9e6e' }}>
                    📍 {sensor.spaces?.name ?? 'Sin espacio'}
                  </p>
                </div>
              </div>

              {/* RANGOS */}
              <div
                className="grid grid-cols-2 gap-2 rounded-xl p-3 mb-3"
                style={{ backgroundColor: '#0a1a0f' }}
              >
                <div className="text-xs">
                  <span style={{ color: '#4a6a4a' }}>Temp: </span>
                  <span style={{ color: '#f97316' }}>
                    {sensor.min_temp}° – {sensor.max_temp}°C
                  </span>
                </div>
                <div className="text-xs">
                  <span style={{ color: '#4a6a4a' }}>Hum: </span>
                  <span style={{ color: '#38bdf8' }}>
                    {sensor.min_humidity}% – {sensor.max_humidity}%
                  </span>
                </div>
              </div>

              {/* ACCIONES */}
              <div className="flex gap-2">
                <button
                  onClick={() => openEdit(sensor)}
                  className="flex-1 py-2 rounded-xl text-xs font-medium transition"
                  style={{ backgroundColor: '#1a3a20', color: '#4ade80' }}
                >
                  ✏️ Editar
                </button>
                <button
                  onClick={() => deleteSensor(sensor.id)}
                  className="px-4 py-2 rounded-xl text-xs font-medium transition"
                  style={{ backgroundColor: '#1a0808', color: '#f87171' }}
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-end justify-center p-4">
          <div
            className="w-full max-w-sm rounded-3xl overflow-hidden"
            style={{ backgroundColor: '#0d2318', border: '1px solid #1a3a20' }}
          >
            <div
              className="px-5 py-4 flex items-center justify-between"
              style={{ borderBottom: '1px solid #1a3a20' }}
            >
              <h3 className="font-bold text-white">
                {editingSensor ? '✏️ Editar sensor' : '📡 Nuevo sensor'}
              </h3>
              <button
                onClick={() => setShowAdd(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full"
                style={{ backgroundColor: '#1a3a20', color: '#6b9e6e' }}
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-3">
              <input
                placeholder="Nombre del sensor"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                className="w-full text-white placeholder-slate-500 rounded-xl px-4 py-3 outline-none"
                style={{ backgroundColor: '#0a1a0f', border: '1px solid #1a3a20' }}
                onFocus={e => e.target.style.borderColor = '#4ade80'}
                onBlur={e => e.target.style.borderColor = '#1a3a20'}
              />

              <select
                value={form.space_id}
                onChange={e => setForm({ ...form, space_id: e.target.value })}
                className="w-full text-white rounded-xl px-4 py-3 outline-none"
                style={{ backgroundColor: '#0a1a0f', border: '1px solid #1a3a20', colorScheme: 'dark' }}
              >
                <option value="">Seleccionar espacio</option>
                {spaces.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>

              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Temp mín °C', key: 'min_temp' },
                  { label: 'Temp máx °C', key: 'max_temp' },
                  { label: 'Hum mín %', key: 'min_humidity' },
                  { label: 'Hum máx %', key: 'max_humidity' },
                ].map(field => (
                  <div key={field.key}>
                    <p className="text-xs mb-1" style={{ color: '#6b9e6e' }}>{field.label}</p>
                    <input
                      type="number"
                      value={form[field.key as keyof typeof form]}
                      onChange={e => setForm({ ...form, [field.key]: Number(e.target.value) })}
                      className="w-full text-white rounded-xl px-3 py-2 outline-none"
                      style={{ backgroundColor: '#0a1a0f', border: '1px solid #1a3a20' }}
                    />
                  </div>
                ))}
              </div>

              <button
                onClick={saveSensor}
                className="w-full text-white font-semibold rounded-xl py-3 transition"
                style={{ backgroundColor: '#2d6a35' }}
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