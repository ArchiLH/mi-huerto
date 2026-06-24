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

  useEffect(() => {
    loadData()
  }, [id])

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
    }

    // Cargar catálogo de plantas
    const { data: plantData } = await supabase
      .from('plant_catalog')
      .select('*')
      .order('name')

    if (plantData) setPlants(plantData)

    setLoading(false)
  }

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
      <div className="space-y-4">
        <div className="h-8 bg-slate-800 rounded-xl animate-pulse w-32" />
        <div className="h-44 bg-slate-800 rounded-2xl animate-pulse" />
        <div className="h-32 bg-slate-800 rounded-2xl animate-pulse" />
      </div>
    )
  }

  if (!space) {
    return (
      <div className="text-center py-20">
        <p className="text-slate-400">Espacio no encontrado</p>
        <button onClick={() => navigate('/')} className="text-green-400 mt-3 text-sm">
          Volver al huerto
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-5">

      {/* HEADER */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/')}
          className="text-slate-400 hover:text-white transition text-2xl"
        >
          ←
        </button>
        <div>
          <h1 className="text-2xl font-bold">{space.name}</h1>
          <p className="text-slate-400 text-sm">Espacio #{space.slot_number}</p>
        </div>
      </div>

      {/* TARJETA PLANTA */}
      <div className="bg-slate-900 rounded-2xl p-5 text-center">
        <div className="text-6xl mb-3">
          {space.plant_catalog?.emoji ?? '🪴'}
        </div>
        <h2 className="text-xl font-bold">
          {space.plant_catalog?.name ?? 'Sin planta asignada'}
        </h2>

        <div className="flex gap-2 justify-center mt-4">
          <button
            onClick={() => setShowPlantPicker(true)}
            className="bg-green-600 hover:bg-green-500 text-white text-sm px-4 py-2 rounded-xl transition"
          >
            {space.plant_id ? '🔄 Cambiar planta' : '➕ Asignar planta'}
          </button>
          {space.plant_id && (
            <button
              onClick={() => assignPlant(null)}
              className="bg-slate-700 hover:bg-slate-600 text-white text-sm px-4 py-2 rounded-xl transition"
            >
              Quitar
            </button>
          )}
        </div>
      </div>

      {/* LECTURAS EN TIEMPO REAL */}
      {latestReading ? (
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-900 rounded-2xl p-4 text-center">
            <p className="text-3xl mb-1">🌡️</p>
            <p className="text-3xl font-bold text-orange-400">
              {latestReading.temperature.toFixed(1)}°C
            </p>
            <p className="text-slate-400 text-xs mt-1">Temperatura</p>
            {sensor && (
              <p className="text-xs text-slate-500 mt-1">
                Rango: {sensor.min_temp}° - {sensor.max_temp}°
              </p>
            )}
          </div>
          <div className="bg-slate-900 rounded-2xl p-4 text-center">
            <p className="text-3xl mb-1">💧</p>
            <p className="text-3xl font-bold text-blue-400">
              {latestReading.humidity.toFixed(1)}%
            </p>
            <p className="text-slate-400 text-xs mt-1">Humedad</p>
            {sensor && (
              <p className="text-xs text-slate-500 mt-1">
                Rango: {sensor.min_humidity}% - {sensor.max_humidity}%
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-slate-900 rounded-2xl p-5 text-center">
          <p className="text-4xl mb-2">📡</p>
          <p className="text-slate-400 text-sm">
            {sensor ? 'Sin lecturas aún' : 'No hay sensor conectado a este espacio'}
          </p>
        </div>
      )}

      {/* HISTORIAL DE LECTURAS */}
      {readings.length > 0 && (
        <div className="bg-slate-900 rounded-2xl p-4">
          <h3 className="font-semibold mb-3 text-sm text-slate-300">
            📊 Últimas lecturas
          </h3>
          <div className="space-y-2">
            {readings.map((r, i) => (
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
      )}

      {/* MODAL SELECTOR DE PLANTA */}
      {showPlantPicker && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-end justify-center p-4">
          <div className="bg-slate-900 rounded-2xl w-full max-w-sm max-h-[70vh] overflow-y-auto">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="font-semibold">Seleccionar planta</h3>
              <button
                onClick={() => setShowPlantPicker(false)}
                className="text-slate-400 hover:text-white text-xl"
              >
                ✕
              </button>
            </div>
            <div className="p-4 space-y-2">
              {plants.map((plant) => (
                <button
                  key={plant.id}
                  onClick={() => assignPlant(plant.id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl transition text-left ${
                    selectedPlantId === plant.id
                      ? 'bg-green-600'
                      : 'bg-slate-800 hover:bg-slate-700'
                  }`}
                >
                  <span className="text-2xl">{plant.emoji}</span>
                  <div>
                    <p className="font-medium text-sm">{plant.name}</p>
                    {plant.category && (
                      <p className="text-xs text-slate-400">{plant.category}</p>
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