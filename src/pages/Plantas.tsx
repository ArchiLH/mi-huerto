import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

type Plant = {
  id: number
  name: string
  emoji: string
  category: string | null
  min_temp: number
  max_temp: number
  min_humidity: number
  max_humidity: number
}

export default function Plantas() {
  const [plants, setPlants] = useState<Plant[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    loadPlants()
  }, [])

  const loadPlants = async () => {
    const { data } = await supabase
      .from('plant_catalog')
      .select('*')
      .order('name')

    setPlants((data as Plant[]) ?? [])
    setLoading(false)
  }

  const filtered = plants.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-5">

      <div>
        <h1 className="text-2xl font-bold">🌿 Catálogo de Plantas</h1>
        <p className="text-slate-400 text-sm mt-1">
          Plantas disponibles para tu huerto
        </p>
      </div>

      <input
        type="text"
        placeholder="🔍 Buscar planta..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full bg-slate-900 text-white placeholder-slate-500 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-green-500"
      />

      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 bg-slate-800 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">🔍</p>
          <p className="text-slate-400">No se encontraron plantas</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(plant => (
            <div key={plant.id} className="bg-slate-900 rounded-2xl p-4 flex items-center gap-4">
              <span className="text-4xl">{plant.emoji}</span>
              <div className="flex-1">
                <h3 className="font-bold">{plant.name}</h3>
                {plant.category && (
                  <p className="text-xs text-green-400">{plant.category}</p>
                )}
                <div className="flex gap-3 mt-1 text-xs text-slate-400">
                  <span>🌡️ {plant.min_temp}° - {plant.max_temp}°C</span>
                  <span>💧 {plant.min_humidity}% - {plant.max_humidity}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}