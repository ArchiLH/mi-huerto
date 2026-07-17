import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

type Space = {
  id: number
  slot_number: number
  name: string
  plant_id: number | null
  plant_catalog?: { name: string; emoji: string } | null
}

type Plant = {
  id: number
  name: string
  emoji: string
  category: string | null
}

type Reading = {
  temperature: number
  humidity: number
  recorded_at: string
}

type Sensor = {
  id: number
  name: string
  active: boolean
  min_temp: number
  max_temp: number
  min_humidity: number
  max_humidity: number
}

export default function Espacios() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [space, setSpace] = useState<Space | null>(null)
  const [sensor, setSensor] = useState<Sensor | null>(null)
  const [readings, setReadings] = useState<Reading[]>([])
  const [plants, setPlants] = useState<Plant[]>([])
  const [loading, setLoading] = useState(true)
  const [showPlantPicker, setShowPlantPicker] = useState(false)
  const [selectedPlantId, setSelectedPlantId] = useState<number | null>(null)

  const loadData = async () => {
    setLoading(true)

    // Cargar espacio
    const { data: spaceData } = await supabase
      .from('spaces')
      .select('*, plant_catalog(name, emoji)')
      .eq('id', id)
      .single()

    if (spaceData) {
      setSpace(spaceData)
      setSelectedPlantId(spaceData.plant_id)
    }

    // Cargar sensor
    const { data: sensorData } = await supabase
      .from('sensors')
      .select('*')
      .eq('space_id', id)
      .single()

    if (sensorData) {
      setSensor(sensorData)

      // Cargar últimas lecturas
      const { data: readingData } = await supabase
        .from('readings')
        .select('temperature, humidity, recorded_at')
        .eq('sensor_id', sensorData.id)
        .order('recorded_at', { ascending: false })
        .limit(10)

      if (readingData) setReadings(readingData)
    } else {
      setSensor(null)
      setReadings([])
    }

    // Cargar catálogo de plantas
    const { data: plantData } = await supabase
      .from('plant_catalog')
      .select('*')
      .order('name')

    if (plantData) setPlants(plantData)

    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [id])

  const assignPlant = async (plantId: number | null) => {
    await supabase
      .from('spaces')
      .update({ plant_id: plantId })
      .eq('id', id)

    setShowPlantPicker(false)
    loadData()
  }

  const latestReading = readings[0] ?? null

  if (loading) {
    return (
      <div className="w-full bg-[#f4f7f5] min-h-screen px-5 pt-6 space-y-4 max-w-md mx-auto">
        <div className="h-8 bg-slate-200/60 rounded-xl animate-pulse w-32" />
        <div className="h-44 bg-white rounded-3xl animate-pulse border border-slate-100" />
        <div className="grid grid-cols-2 gap-3">
          <div className="h-28 bg-white rounded-2xl animate-pulse border border-slate-100" />
          <div className="h-28 bg-white rounded-2xl animate-pulse border border-slate-100" />
        </div>
      </div>
    )
  }

  if (!space) {
    return (
      <div className="w-full bg-[#f4f7f5] min-h-screen flex flex-col items-center justify-center p-5 text-center font-sans max-w-md mx-auto">
        <p className="text-4xl mb-3">🪴</p>
        <p className="text-slate-400 font-bold text-sm">Espacio no encontrado</p>
        <button 
          onClick={() => navigate('/')} 
          className="text-[#009660] font-black mt-3 text-xs"
        >
          Volver al huerto
        </button>
      </div>
    )
  }

  return (
    <div className="w-full bg-[#f4f7f5] min-h-screen px-5 pt-6 space-y-5 max-w-md mx-auto pb-10 font-sans text-slate-800">

      {/* HEADER */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/')}
          className="text-slate-400 hover:text-slate-600 transition text-2xl font-black"
        >
          ←
        </button>
        <div>
          <h1 className="text-xl font-black text-slate-800 tracking-tight">{space.name}</h1>
          <p className="text-slate-400 text-[10px] font-bold tracking-wider uppercase">Espacio #{space.slot_number}</p>
        </div>
      </div>

      {/* TARJETA PLANTA PRINCIPAL */}
      <div className="bg-white rounded-[2rem] p-6 text-center border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)] space-y-4">
        <div className="w-24 h-24 bg-[#fbfdfc] rounded-full flex items-center justify-center text-6xl border border-slate-100 shadow-3xs mx-auto">
          {space.plant_catalog?.emoji ?? '🪴'}
        </div>
        
        <div>
          <h2 className="text-lg font-black text-slate-800 tracking-tight">
            {space.plant_catalog?.name ?? 'Sin planta asignada'}
          </h2>
          <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
            {space.plant_id ? 'Monitoreando desarrollo ideal' : 'Configura una especie para comenzar'}
          </p>
        </div>

        <div className="flex gap-2.5 justify-center pt-2">
          <button
            onClick={() => setShowPlantPicker(true)}
            className="bg-[#009660] hover:bg-[#008152] text-white text-xs font-bold px-5 py-2.5 rounded-xl transition-all shadow-3xs"
          >
            {space.plant_id ? '🔄 Cambiar planta' : '➕ Asignar planta'}
          </button>
          
          {space.plant_id && (
            <button
              onClick={() => assignPlant(null)}
              className="bg-slate-50 hover:bg-slate-100 text-slate-500 text-xs font-bold px-4 py-2.5 rounded-xl border border-slate-200/60 transition-colors"
            >
              Quitar
            </button>
          )}
        </div>
      </div>

      {/* LECTURAS EN TIEMPO REAL (Estilo Bento Naranja y Azul) */}
      {latestReading ? (
        <div className="grid grid-cols-2 gap-3.5">
          {/* Temperatura */}
          <div className="bg-[#fff7ed] border border-[#ffedd5]/60 rounded-[1.5rem] p-4 text-center space-y-1">
            <p className="text-xl">🌡️</p>
            <p className="text-2xl font-black text-[#f97316]">
              {latestReading.temperature.toFixed(1)}°C
            </p>
            <p className="text-slate-500 font-bold text-[10px]">Temperatura</p>
            {sensor && (
              <p className="text-[9px] text-[#fdba74] font-semibold mt-0.5">
                Ideal: {sensor.min_temp}°C - {sensor.max_temp}°C
              </p>
            )}
          </div>
          
          {/* Humedad */}
          <div className="bg-[#f0f7ff] border border-[#e0f2fe]/60 rounded-[1.5rem] p-4 text-center space-y-1">
            <p className="text-xl">💧</p>
            <p className="text-2xl font-black text-[#0284c7]">
              {latestReading.humidity.toFixed(1)}%
            </p>
            <p className="text-slate-500 font-bold text-[10px]">Humedad</p>
            {sensor && (
              <p className="text-[9px] text-[#93c5fd] font-semibold mt-0.5">
                Ideal: {sensor.min_humidity}% - {sensor.max_humidity}%
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-[2rem] p-6 text-center border border-slate-100 shadow-3xs">
          <p className="text-3xl mb-2">📡</p>
          <p className="text-slate-400 text-xs font-bold">
            {sensor ? 'Sin lecturas registradas todavía' : 'No hay sensores activos vinculados a este espacio'}
          </p>
        </div>
      )}

      {/* HISTORIAL RECIENTE */}
      {readings.length > 0 && (
        <div className="bg-white rounded-[2rem] p-5 border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
          <h3 className="font-extrabold mb-3 text-xs text-slate-400 uppercase tracking-widest pl-1">
            📊 Historial de lecturas
          </h3>
          <div className="space-y-2.5 divide-y divide-slate-100/70">
            {readings.map((r, i) => (
              <div
                key={i}
                className={`flex items-center justify-between text-xs font-semibold ${
                  i > 0 ? 'pt-2.5' : ''
                }`}
              >
                <span className="text-slate-400 text-[10px] font-bold">
                  {new Date(r.recorded_at).toLocaleString('es-PE', {
                    day: '2-digit', month: '2-digit',
                    hour: '2-digit', minute: '2-digit'
                  })}
                </span>
                <div className="flex gap-3 text-[11px] font-bold">
                  <span className="text-[#f97316]">🌡️ {r.temperature.toFixed(1)}°C</span>
                  <span className="text-[#0284c7]">💧 {r.humidity.toFixed(1)}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL SELECTOR DE PLANTA (Estilo claro) */}
      {showPlantPicker && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-[2rem] w-full max-w-sm max-h-[70vh] flex flex-col shadow-2xl border border-slate-100 overflow-hidden">
            
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-extrabold text-sm text-slate-800">🌱 Seleccionar especie</h3>
              <button
                onClick={() => setShowPlantPicker(false)}
                className="w-7 h-7 flex items-center justify-center rounded-full bg-slate-100 text-slate-400 font-bold text-xs"
              >
                ✕
              </button>
            </div>
            
            <div className="p-4 space-y-2 overflow-y-auto">
              {plants.map((plant) => (
                <button
                  key={plant.id}
                  onClick={() => assignPlant(plant.id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all border text-left ${
                    selectedPlantId === plant.id
                      ? 'bg-[#e2faee] border-[#a3e635] text-slate-800'
                      : 'bg-[#f8faf9] border-slate-100/50 hover:bg-[#f3f6f4]'
                  }`}
                >
                  <span className="text-3xl shrink-0">{plant.emoji}</span>
                  <div className="min-w-0">
                    <p className="font-extrabold text-xs text-slate-800">{plant.name}</p>
                    {plant.category && (
                      <p className="text-[10px] text-slate-400 font-semibold">{plant.category}</p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  )
}