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

  useEffect(() => { loadPlants() }, [])

  useEffect(() => {
    const originalBg = document.body.style.backgroundColor
    document.body.style.backgroundColor = '#e2f3ec'
    return () => {
      document.body.style.backgroundColor = originalBg
    }
  }, [])

  const loadPlants = async () => {
    try {
      const { data } = await supabase.from('plant_catalog').select('*').order('name')
      setPlants((data as Plant[]) ?? [])
    } catch (err) {
      console.error('Error al cargar plantas:', err)
    } finally {
      setLoading(false)
    }
  }

  // Filtrado de plantas por búsqueda y categoría
  const filteredPlants = plants.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase())
    const matchCategory = selectedCategory === 'Todas' || p.category === selectedCategory
    return matchSearch && matchCategory
  })

  // Agrupamos las plantas por categoría para los títulos intermedios
  const categories = selectedCategory === 'Todas' ? ['Comestible', 'Aromática'] : [selectedCategory]

  return (
    <div className="w-full min-h-screen bg-[#e2f3ec] p-3 sm:p-6 lg:p-8 flex justify-center">
      <div className="w-full max-w-[1400px] space-y-6 pb-16 font-sans text-slate-800">

        {/* HEADER DE LA PÁGINA */}
        <div className="space-y-1 bg-white p-4 sm:p-6 rounded-3xl border border-slate-100 shadow-xs">
          <h1 className="text-xl sm:text-2xl font-black text-[#1e293b] tracking-tight">
            Mis plantas 🌿
          </h1>
          <p className="text-xs text-slate-400 font-semibold leading-relaxed">
            Guía de cuidados y parámetros ideales para cada planta de tu huerto
          </p>
        </div>

        {/* BUSCADOR Y FILTROS SUPERIORES */}
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-white p-4 rounded-3xl border border-slate-100 shadow-xs">
          
          {/* BUSCADOR CORREGIDO CON FLEXBOX */}
          <div className="flex items-center bg-[#f4f7f5] border border-slate-200/60 rounded-2xl px-4 py-3 flex-1 focus-within:border-emerald-500 transition-colors shadow-3xs">
            <span className="text-slate-400 text-xs mr-3 select-none">🔍</span>
            <input
              type="text"
              placeholder="Buscar planta..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-transparent text-slate-800 placeholder-slate-400 outline-none text-xs font-semibold"
            />
          </div>

          {/* BOTONES DE FILTRO */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {(['Todas', 'Comestible', 'Aromática'] as const).map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all border whitespace-nowrap cursor-pointer ${
                  selectedCategory === cat 
                    ? 'bg-[#10b981] text-white border-transparent shadow-xs' 
                    : 'bg-[#f4f7f5] text-slate-500 border-slate-200/60 hover:bg-slate-100'
                }`}
              >
                {cat === 'Todas' ? '🌱 Todas' : cat === 'Comestible' ? '🥗 Comestible' : '🌸 Aromática'}
              </button>
            ))}
          </div>
        </div>

        {/* LISTADO DE PLANTAS AGRUPADAS */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="h-80 bg-white rounded-3xl animate-pulse border border-slate-100 shadow-xs" />
            ))}
          </div>
        ) : filteredPlants.length === 0 ? (
          <div className="bg-white rounded-3xl border-2 border-dashed border-slate-200 p-10 text-center py-14 shadow-xs">
            <p className="text-4xl mb-3">🔍</p>
            <p className="text-xs text-slate-400 font-bold">No se encontraron plantas</p>
          </div>
        ) : (
          <div className="space-y-8">
            {categories.map(category => {
              const plantsInCat = filteredPlants.filter(p => p.category === category)
              if (plantsInCat.length === 0) return null

              return (
                <div key={category} className="space-y-4">
                  {/* CATEGORÍA SECCIONAL */}
                  <div className="flex items-center gap-2 text-[10px] font-black text-slate-500 tracking-widest uppercase pl-1">
                    <span>{category === 'Comestible' ? '🥗' : '🌸'}</span>
                    <span>PLANTAS {category}S</span>
                  </div>

                  {/* CUADRÍCULA DE PLANTAS RESPONSIVE */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {plantsInCat.map(plant => (
                      <div
                        key={plant.id}
                        className="w-full bg-white rounded-3xl p-5 sm:p-6 border border-[#51e29d]/60 shadow-[0_4px_20px_-4px_rgba(81,226,157,0.12)] space-y-4 transition-all flex flex-col justify-between"
                      >
                        <div className="space-y-4">
                          {/* CABECERA: EMOJI, NOMBRE Y CATEGORÍA */}
                          <div className="flex items-center gap-4">
                            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-[#fbfdfc] rounded-2xl flex items-center justify-center text-3xl sm:text-4xl border border-emerald-100 shadow-xs shrink-0">
                              {plant.emoji}
                            </div>
                            <div className="space-y-1 min-w-0">
                              <h2 className="text-sm sm:text-base font-extrabold text-slate-800 tracking-tight truncate">
                                {plant.name}
                              </h2>
                              <span className="inline-flex items-center gap-1 text-[9px] px-2.5 py-0.5 bg-[#e2faee] text-[#008f51] rounded-full font-black">
                                🥗 {plant.category}
                              </span>
                            </div>
                          </div>

                          {/* DESCRIPCIÓN */}
                          {plant.description && (
                            <p className="text-xs text-slate-400 font-semibold leading-relaxed">
                              {plant.description}
                            </p>
                          )}

                          {/* PARÁMETROS IDEALES (BENTO GRID) */}
                          <div className="grid grid-cols-2 gap-3">
                            <div className="bg-[#fff7ed] border border-[#ffedd5]/60 rounded-2xl p-3 text-center">
                              <p className="text-[10px] font-extrabold text-[#f97316] mb-1 flex items-center justify-center gap-1">
                                🌡️ Temperatura
                              </p>
                              <p className="font-black text-xs text-slate-800">
                                {plant.min_temp}°C – {plant.max_temp}°C
                              </p>
                            </div>

                            <div className="bg-[#f0f7ff] border border-[#e0f2fe]/60 rounded-2xl p-3 text-center">
                              <p className="text-[10px] font-extrabold text-[#0284c7] mb-1 flex items-center justify-center gap-1">
                                💧 Humedad
                              </p>
                              <p className="font-black text-xs text-slate-800">
                                {plant.min_humidity}% – {plant.max_humidity}%
                              </p>
                            </div>
                          </div>

                          {/* SECCIÓN DE ALERTAS */}
                          <div className="space-y-2.5 pt-1">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider pl-1">
                              ¿QUÉ HACER SI HAY ALERTAS?
                            </p>

                            <div className="space-y-2">
                              {[
                                { icon: '🌡️', label: 'Calor', msg: plant.alert_temp_high, labelColor: 'text-[#f97316]' },
                                { icon: '🥶', label: 'Frío', msg: plant.alert_temp_low, labelColor: 'text-blue-500' },
                                { icon: '💧', label: 'Exc. humedad', msg: plant.alert_humidity_high, labelColor: 'text-cyan-500' },
                                { icon: '🏜️', label: 'Poca agua', msg: plant.alert_humidity_low, labelColor: 'text-amber-500' },
                              ].map((item, i) => item.msg && (
                                <div
                                  key={i}
                                  className="bg-[#f4f7f5]/70 border border-slate-100/50 rounded-2xl p-3 flex gap-2.5 items-start"
                                >
                                  <span className="text-base shrink-0 mt-0.5">{item.icon}</span>
                                  <div className="text-[11px] leading-relaxed">
                                    <span className={`font-black ${item.labelColor} mr-1`}>
                                      {item.label}:
                                    </span>
                                    <span className="text-slate-500 font-semibold">{item.msg}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>

                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}

      </div>
    </div>
  )
}