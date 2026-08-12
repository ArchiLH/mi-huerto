import { useEffect, useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { usePremium } from '../context/PremiumContext'

const FREE_LIMIT = 4
const PREMIUM_LIMIT = 8

type Sensor = {
  id: number
  name: string
  space_id: number | null
  min_temp: number
  max_temp: number
  min_humidity: number
  max_humidity: number
  active: boolean
  spaces?: { slot_number: number; name: string } | null
}

export default function Sensores() {
  const { user } = useAuth()
  const { isPremium } = usePremium()

  const [sensors, setSensors] = useState<Sensor[]>([])
  const [loading, setLoading] = useState(true)
  const [editingSensor, setEditingSensor] = useState<Sensor | null>(null)
  
  // Campos del modal de configuración de rangos
  const [minTemp, setMinTemp] = useState<number>(10)
  const [maxTemp, setMaxTemp] = useState<number>(35)
  const [minHum, setMinHum] = useState<number>(30)
  const [maxHum, setMaxHum] = useState<number>(80)

  const initialized = useRef(false)

  useEffect(() => {
    if (!user) return
    if (!initialized.current) {
      initialized.current = true
      loadSensors()
    }
  }, [user, isPremium])

  useEffect(() => {
    const originalBg = document.body.style.backgroundColor
    document.body.style.backgroundColor = '#e2f3ec'
    return () => {
      document.body.style.backgroundColor = originalBg
    }
  }, [])

  const loadSensors = async () => {
    if (!user) return
    try {
      // Obtenemos los espacios del usuario para filtrar sus sensores
      const { data: userSpaces } = await supabase
        .from('spaces')
        .select('id, slot_number, name')
        .eq('user_id', user.id)

      const spaceIds = userSpaces?.map(s => s.id) ?? []

      if (spaceIds.length === 0) {
        setSensors([])
        setLoading(false)
        return
      }

      const { data: sensorsData, error } = await supabase
        .from('sensors')
        .select(`*, spaces (slot_number, name)`)
        .in('space_id', spaceIds)
        .order('id')

      if (error) throw error

      const limit = isPremium ? PREMIUM_LIMIT : FREE_LIMIT
      setSensors((sensorsData as Sensor[]).slice(0, limit))
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // Función para activar / desactivar desde la pantalla de sensores
  const handleToggleActive = async (sensorId: number, currentActive: boolean) => {
    const newState = !currentActive

    await supabase
      .from('sensors')
      .update({ active: newState })
      .eq('id', sensorId)

    loadSensors()
  }

  const handleOpenConfig = (sensor: Sensor) => {
    setEditingSensor(sensor)
    setMinTemp(sensor.min_temp)
    setMaxTemp(sensor.max_temp)
    setMinHum(sensor.min_humidity)
    setMaxHum(sensor.max_humidity)
  }

  const handleSaveConfig = async () => {
    if (!editingSensor) return

    await supabase
      .from('sensors')
      .update({
        min_temp: minTemp,
        max_temp: maxTemp,
        min_humidity: minHum,
        max_humidity: maxHum,
      })
      .eq('id', editingSensor.id)

    setEditingSensor(null)
    loadSensors()
  }

  const activeSensorsCount = sensors.filter(s => s.active).length
  const inactiveSensorsCount = sensors.filter(s => !s.active).length

  if (loading) {
    return (
      <div className="w-full min-h-screen bg-[#e2f3ec] flex flex-col justify-center items-center space-y-4">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-bold text-slate-400">Cargando tus sensores...</p>
      </div>
    )
  }

  return (
    <div className="w-full min-h-screen bg-[#e2f3ec] p-3 sm:p-6 lg:p-8 flex justify-center">
      <div className="w-full max-w-[1200px] space-y-5 pb-16 font-sans text-slate-800">

        {/* Cabecera */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-6 rounded-3xl border border-emerald-200 shadow-xs">
          <div className="space-y-1">
            <h1 className="text-lg sm:text-2xl font-black text-[#1e293b] flex items-center gap-2">
              Sensores 📡
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              Cada sensor está vinculado automáticamente a su espacio correspondiente. Al desactivarlo, cambiará a inactivo.
            </p>
          </div>
          <div className="self-start sm:self-auto shrink-0 inline-flex items-center gap-1.5 bg-[#ff9100] text-white font-black text-[11px] px-4 py-2 rounded-xl shadow-xs">
            👑 {isPremium ? 'Plan Premium (8 Sensores)' : 'Plan Gratuito (4 Sensores)'}
          </div>
        </div>

        {/* Contadores globales Activos / Inactivos */}
        <div className="grid grid-cols-2 gap-3 max-w-sm">
          <div className="bg-white rounded-2xl p-3 sm:p-4 border border-[#51e29d]/60 shadow-[0_4px_20px_-4px_rgba(81,226,157,0.15)] flex items-center gap-3">
            <div className="w-5 h-5 rounded-md bg-[#e2faee] text-[#009660] flex items-center justify-center font-bold text-xs border border-emerald-200">
              ✓
            </div>
            <div>
              <p className="text-sm font-black text-slate-800 leading-none">{activeSensorsCount}</p>
              <p className="text-[10px] text-slate-400 font-bold mt-1">ACTIVOS</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-3 sm:p-4 border border-[#51e29d]/60 shadow-[0_4px_20px_-4px_rgba(81,226,157,0.15)] flex items-center gap-3">
            <div className="w-5 h-5 rounded-md bg-slate-100 text-slate-500 flex items-center justify-center font-bold text-xs border border-slate-200">
              ■
            </div>
            <div>
              <p className="text-sm font-black text-slate-800 leading-none">{inactiveSensorsCount}</p>
              <p className="text-[10px] text-slate-400 font-bold mt-1">INACTIVOS</p>
            </div>
          </div>
        </div>

        {/* Listado de Sensores */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sensors.map(sensor => (
            <div
              key={sensor.id}
              className={`bg-white rounded-[2rem] border p-4 sm:p-5 flex flex-col justify-between shadow-xs transition ${
                sensor.active ? 'border-emerald-200' : 'border-slate-300 opacity-75'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xl">📡</span>
                    <div>
                      <h4 className="font-black text-slate-800 text-xs">{sensor.name}</h4>
                      <p className="text-[10px] text-slate-400 font-bold">
                        {sensor.spaces ? `Espacio ${sensor.spaces.slot_number}` : 'Sin espacio'}
                      </p>
                    </div>
                  </div>
                  <span className={`text-[10px] font-black px-2.5 py-1 rounded-full ${
                    sensor.active ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {sensor.active ? '● Activo' : '○ Inactivo'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 bg-slate-50/80 rounded-2xl p-3 text-center border border-slate-100">
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold">Temp</p>
                    <p className="text-xs font-black text-slate-700 mt-0.5">
                      {sensor.min_temp}°C – {sensor.max_temp}°C
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold">Humedad</p>
                    <p className="text-xs font-black text-slate-700 mt-0.5">
                      {sensor.min_humidity}% – {sensor.max_humidity}%
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                <button
                  onClick={() => handleOpenConfig(sensor)}
                  className="flex-1 text-center py-2 rounded-xl text-[10px] font-extrabold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition cursor-pointer border border-emerald-100"
                >
                  ⚙️ Configurar rangos
                </button>
                <button
                  onClick={() => handleToggleActive(sensor.id, sensor.active)}
                  className={`py-2 px-3 rounded-xl text-[10px] font-extrabold transition cursor-pointer ${
                    sensor.active
                      ? 'text-red-500 bg-red-50 hover:bg-red-100 border border-red-100'
                      : 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100 border border-emerald-100'
                  }`}
                >
                  {sensor.active ? 'Quitar temporalmente' : 'Activar'}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Modal para configurar rangos */}
        {editingSensor && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
            <div className="w-full max-w-sm bg-white rounded-[2rem] overflow-hidden shadow-2xl border border-slate-100 p-6 space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between pb-1">
                <h3 className="font-black text-sm text-slate-800">
                  ⚙️ Configurar — {editingSensor.name}
                </h3>
                <button
                  onClick={() => setEditingSensor(null)}
                  className="w-7 h-7 flex items-center justify-center rounded-full bg-slate-100 text-slate-400 font-bold text-xs cursor-pointer hover:bg-slate-200"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500">Temp Mín (°C)</label>
                    <input
                      type="number"
                      value={minTemp}
                      onChange={e => setMinTemp(Number(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold outline-none focus:border-emerald-400 mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500">Temp Máx (°C)</label>
                    <input
                      type="number"
                      value={maxTemp}
                      onChange={e => setMaxTemp(Number(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold outline-none focus:border-emerald-400 mt-1"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500">Hum Mín (%)</label>
                    <input
                      type="number"
                      value={minHum}
                      onChange={e => setMinHum(Number(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold outline-none focus:border-emerald-400 mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500">Hum Máx (%)</label>
                    <input
                      type="number"
                      value={maxHum}
                      onChange={e => setMaxHum(Number(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold outline-none focus:border-emerald-400 mt-1"
                    />
                  </div>
                </div>
              </div>

              <button
                onClick={handleSaveConfig}
                className="w-full text-white font-extrabold rounded-xl py-3 text-xs bg-[#10b981] hover:bg-[#059669] transition-colors cursor-pointer shadow-xs mt-2"
              >
                Guardar cambios
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}