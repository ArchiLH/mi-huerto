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
    const { data } = await supabase.from('plant_catalog').select('*').order('name')
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

      {/* HEADER */}
      <div
        className="rounded-2xl p-5"
        style={{ backgroundColor: '#0d2318', border: '1px solid #1a3a20' }}
      >
        <span className="text-xs font-mono uppercase tracking-widest" style={{ color: '#4a6a4a' }}>
          Catálogo
        </span>
        <h1 className="text-xl font-bold text-white mt-1">🌿 Mis Plantas</h1>
        <p className="text-sm mt-0.5" style={{ color: '#6b9e6e' }}>
          {plants.length} plantas disponibles para tu huerto
        </p>
      </div>

      {/* BUSCADOR */}
      <div className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg">🔍</span>
        <input
          type="text"
          placeholder="Buscar planta..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full text-white placeholder-slate-500 rounded-xl pl-10 pr-4 py-3 outline-none"
          style={{ backgroundColor: '#0d2318', border: '1px solid #1a3a20' }}
          onFocus={e => e.target.style.borderColor = '#4ade80'}
          onBlur={e => e.target.style.borderColor = '#1a3a20'}
        />
      </div>

      {/* FILTROS */}
      <div className="flex gap-2">
        {(['Todas', 'Comestible', 'Aromática'] as const).map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className="px-4 py-1.5 rounded-full text-xs font-medium transition"
            style={{
              backgroundColor: selectedCategory === cat ? '#2d6a35' : '#0d2318',
              color: selectedCategory === cat ? 'white' : '#6b9e6e',
              border: `1px solid ${selectedCategory === cat ? '#2d6a35' : '#1a3a20'}`
            }}
          >
            {cat === 'Todas' ? '🌱 Todas' : cat === 'Comestible' ? '🥗 Comestible' : '🌸 Aromática'}
          </button>
        ))}
      </div>

      {/* LISTA */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 rounded-2xl animate-pulse" style={{ backgroundColor: '#0d2318' }} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div
          className="rounded-2xl p-10 text-center"
          style={{ backgroundColor: '#0d2318', border: '1px solid #1a3a20' }}
        >
          <p className="text-4xl mb-3">🔍</p>
          <p style={{ color: '#6b9e6e' }}>No se encontraron plantas</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(plant => (
            <button
              key={plant.id}
              onClick={() => setSelectedPlant(plant)}
              className="w-full rounded-2xl p-4 flex items-center gap-4 text-left transition active:scale-95"
              style={{ backgroundColor: '#0d2318', border: '1px solid #1a3a20' }}
            >
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shrink-0"
                style={{ backgroundColor: '#1a3a20' }}
              >
                {plant.emoji}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-bold text-white">{plant.name}</h3>
                  <span
                    className="text-xs px-2 py-0.5 rounded-full shrink-0"
                    style={{
                      backgroundColor: plant.category === 'Aromática' ? '#1a1a3a' : '#0a2a10',
                      color: plant.category === 'Aromática' ? '#a78bfa' : '#4ade80'
                    }}
                  >
                    {plant.category === 'Comestible' ? '🥗' : '🌸'} {plant.category}
                  </span>
                </div>
                {plant.description && (
                  <p className="text-xs mb-2 line-clamp-1" style={{ color: '#6b9e6e' }}>
                    {plant.description}
                  </p>
                )}
                <div className="flex gap-3 text-xs">
                  <span style={{ color: '#f97316' }}>🌡️ {plant.min_temp}°-{plant.max_temp}°C</span>
                  <span style={{ color: '#38bdf8' }}>💧 {plant.min_humidity}%-{plant.max_humidity}%</span>
                </div>
              </div>
              <span style={{ color: '#2d6a35' }} className="text-xl shrink-0">›</span>
            </button>
          ))}
        </div>
      )}

      {/* MODAL DETALLE */}
      {selectedPlant && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-end justify-center p-4">
          <div
            className="w-full max-w-sm rounded-3xl overflow-hidden"
            style={{ backgroundColor: '#0d2318', border: '1px solid #1a3a20' }}
          >
            {/* HEADER MODAL */}
            <div
              className="sticky top-0 px-5 py-4 flex items-center justify-between"
              style={{ backgroundColor: '#0d2318', borderBottom: '1px solid #1a3a20' }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center text-3xl"
                  style={{ backgroundColor: '#1a3a20' }}
                >
                  {selectedPlant.emoji}
                </div>
                <div>
                  <h2 className="font-bold text-white">{selectedPlant.name}</h2>
                  <span
                    className="text-xs px-2 py-0.5 rounded-full"
                    style={{
                      backgroundColor: selectedPlant.category === 'Aromática' ? '#1a1a3a' : '#0a2a10',
                      color: selectedPlant.category === 'Aromática' ? '#a78bfa' : '#4ade80'
                    }}
                  >
                    {selectedPlant.category === 'Comestible' ? '🥗' : '🌸'} {selectedPlant.category}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedPlant(null)}
                className="w-8 h-8 flex items-center justify-center rounded-full"
                style={{ backgroundColor: '#1a3a20', color: '#6b9e6e' }}
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">

              {/* DESCRIPCIÓN */}
              {selectedPlant.description && (
                <p className="text-sm" style={{ color: '#a3d9a5' }}>
                  {selectedPlant.description}
                </p>
              )}

              {/* RANGOS */}
              <div className="grid grid-cols-2 gap-3">
                <div
                  className="rounded-xl p-3 text-center"
                  style={{ backgroundColor: '#0a1a0f' }}
                >
                  <p className="text-xs mb-1" style={{ color: '#4a6a4a' }}>Temperatura</p>
                  <p className="font-bold" style={{ color: '#f97316' }}>
                    {selectedPlant.min_temp}°C – {selectedPlant.max_temp}°C
                  </p>
                </div>
                <div
                  className="rounded-xl p-3 text-center"
                  style={{ backgroundColor: '#0a1a0f' }}
                >
                  <p className="text-xs mb-1" style={{ color: '#4a6a4a' }}>Humedad</p>
                  <p className="font-bold" style={{ color: '#38bdf8' }}>
                    {selectedPlant.min_humidity}% – {selectedPlant.max_humidity}%
                  </p>
                </div>
              </div>

              {/* ALERTAS */}
              <div>
                <p className="text-xs font-semibold mb-3 uppercase tracking-widest" style={{ color: '#4a6a4a' }}>
                  ¿Qué hacer si hay alertas?
                </p>
                <div className="space-y-2">
                  {[
                    { icon: '🌡️', label: 'Calor', msg: selectedPlant.alert_temp_high },
                    { icon: '🥶', label: 'Frío', msg: selectedPlant.alert_temp_low },
                    { icon: '💧', label: 'Exc. humedad', msg: selectedPlant.alert_humidity_high },
                    { icon: '🏜️', label: 'Poca agua', msg: selectedPlant.alert_humidity_low },
                  ].map((item, i) => item.msg && (
                    <div
                      key={i}
                      className="rounded-xl p-3 flex gap-3"
                      style={{ backgroundColor: '#0a1a0f' }}
                    >
                      <span className="text-xl shrink-0">{item.icon}</span>
                      <div>
                        <p className="text-xs font-semibold mb-0.5" style={{ color: '#a3d9a5' }}>
                          {item.label}:
                        </p>
                        <p className="text-xs" style={{ color: '#6b9e6e' }}>{item.msg}</p>
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