import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

type Plant = {
  id: number
  name: string
  emoji: string
  category: string | null
  description: string | null
  min_temp: number
  max_temp: number
  min_humidity: number
  max_humidity: number
  alert_temp_high: string | null
  alert_temp_low: string | null
  alert_humidity_high: string | null
  alert_humidity_low: string | null
}

export default function Plantas() {
  const [plants, setPlants] = useState<Plant[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<'Todas' | 'Comestible' | 'Aromática'>('Todas')
  const [selectedPlant, setSelectedPlant] = useState<Plant | null>(null)

  useEffect(() => { loadPlants() }, [])

  const loadPlants = async () => {
    const { data } = await supabase
      .from('plant_catalog')
      .select('*')
      .order('name')
    setPlants((data as Plant[]) ?? [])
    setLoading(false)
  }

  const filtered = plants.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase())
    const matchCategory = selectedCategory === 'Todas' || p.category === selectedCategory
    return matchSearch && matchCategory
  })

  return (
    <div className="space-y-5">

      <div>
        <h1 className="text-2xl font-bold">🌿 Mis Plantas</h1>
        <p className="text-slate-400 text-sm mt-1">
          Catálogo de plantas disponibles para tu huerto
        </p>
      </div>

      {/* BUSCADOR */}
      <input
        type="text"
        placeholder="🔍 Buscar planta..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="w-full bg-slate-900 text-white placeholder-slate-500 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-green-500"
      />

      {/* FILTRO CATEGORÍA */}
      <div className="flex gap-2">
        {(['Todas', 'Comestible', 'Aromática'] as const).map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition ${
              selectedCategory === cat
                ? 'bg-green-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
          >
            {cat === 'Todas' ? '🌱 Todas' : cat === 'Comestible' ? '🥗 Comestible' : '🌸 Aromática'}
          </button>
        ))}
      </div>

      {/* LISTA */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-slate-800 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">🔍</p>
          <p className="text-slate-400">No se encontraron plantas</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {filtered.map(plant => (
            <button
              key={plant.id}
              onClick={() => setSelectedPlant(plant)}
              className="bg-slate-900 rounded-2xl p-4 flex items-center gap-4 text-left hover:bg-slate-800 transition w-full"
            >
              <span className="text-5xl">{plant.emoji}</span>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-bold text-lg">{plant.name}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    plant.category === 'Aromática'
                      ? 'bg-purple-900/50 text-purple-400'
                      : 'bg-green-900/50 text-green-400'
                  }`}>
                    {plant.category === 'Comestible' ? '🥗' : '🌸'} {plant.category}
                  </span>
                </div>
                {plant.description && (
                  <p className="text-xs text-slate-400 mb-2 line-clamp-1">{plant.description}</p>
                )}
                <div className="flex gap-3 text-xs">
                  <span className="text-orange-400">🌡️ {plant.min_temp}° - {plant.max_temp}°C</span>
                  <span className="text-blue-400">💧 {plant.min_humidity}% - {plant.max_humidity}%</span>
                </div>
              </div>
              <span className="text-slate-500 text-xl">›</span>
            </button>
          ))}
        </div>
      )}

      {/* MODAL DETALLE */}
      {selectedPlant && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-end justify-center p-4">
          <div className="bg-slate-900 rounded-2xl w-full max-w-sm max-h-[85vh] overflow-y-auto">

            {/* HEADER MODAL */}
            <div className="sticky top-0 bg-slate-900 p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-4xl">{selectedPlant.emoji}</span>
                <div>
                  <h2 className="font-bold text-lg">{selectedPlant.name}</h2>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    selectedPlant.category === 'Aromática'
                      ? 'bg-purple-900/50 text-purple-400'
                      : 'bg-green-900/50 text-green-400'
                  }`}>
                    {selectedPlant.category === 'Comestible' ? '🥗' : '🌸'} {selectedPlant.category}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedPlant(null)}
                className="text-slate-400 hover:text-white text-2xl w-8 h-8 flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <div className="p-4 space-y-4">

              {/* DESCRIPCIÓN */}
              {selectedPlant.description && (
                <p className="text-slate-300 text-sm">{selectedPlant.description}</p>
              )}

              {/* RANGOS */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-800 rounded-xl p-3 text-center">
                  <p className="text-xs text-slate-400 mb-1">Temperatura</p>
                  <p className="text-orange-400 font-bold">
                    {selectedPlant.min_temp}°C – {selectedPlant.max_temp}°C
                  </p>
                </div>
                <div className="bg-slate-800 rounded-xl p-3 text-center">
                  <p className="text-xs text-slate-400 mb-1">Humedad</p>
                  <p className="text-blue-400 font-bold">
                    {selectedPlant.min_humidity}% – {selectedPlant.max_humidity}%
                  </p>
                </div>
              </div>

              {/* ALERTAS */}
              <div>
                <h3 className="font-semibold text-sm text-slate-300 mb-3">
                  ¿Qué hacer si hay alertas?
                </h3>
                <div className="space-y-2">
                  {[
                    { icon: '🌡️', label: 'Calor', msg: selectedPlant.alert_temp_high },
                    { icon: '🥶', label: 'Frío', msg: selectedPlant.alert_temp_low },
                    { icon: '💧', label: 'Exc. humedad', msg: selectedPlant.alert_humidity_high },
                    { icon: '🏜️', label: 'Poca agua', msg: selectedPlant.alert_humidity_low },
                  ].map((item, i) => item.msg && (
                    <div key={i} className="bg-slate-800 rounded-xl p-3 flex gap-3">
                      <span className="text-xl shrink-0">{item.icon}</span>
                      <div>
                        <p className="text-xs font-semibold text-slate-300 mb-0.5">{item.label}:</p>
                        <p className="text-xs text-slate-400">{item.msg}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}