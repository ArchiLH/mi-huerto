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

  const loadPlants = async () => {
    const { data } = await supabase.from('plant_catalog').select('*').order('name')
    setPlants((data as Plant[]) ?? [])
    setLoading(false)
  }

  // Filtrado de plantas por búsqueda y categoría
  const filteredPlants = plants.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase())
    const matchCategory = selectedCategory === 'Todas' || p.category === selectedCategory
    return matchSearch && matchCategory
  })

  // Agrupamos las plantas por categoría para los títulos intermedios (ej: 🥗 PLANTAS COMESTIBLES)
  const categories = selectedCategory === 'Todas' ? ['Comestible', 'Aromática'] : [selectedCategory]

  return (
    <div className="w-full bg-[#f4f7f5]/40 min-h-screen px-5 pt-6 space-y-6 max-w-md mx-auto pb-10 font-sans text-slate-800">

      {/* HEADER DE LA PÁGINA */}
      <div className="space-y-1">
        <h1 className="text-2xl font-black text-[#1e293b] tracking-tight">
          Mis plantas 🌿
        </h1>
        <p className="text-xs text-slate-400 font-medium leading-relaxed">
          Guía de cuidados y parámetros ideales para cada planta de tu huerto
        </p>
      </div>

      {/* BUSCADOR */}
      <div className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm">🔍</span>
        <input
          type="text"
          placeholder="Buscar planta..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full bg-white text-slate-800 placeholder-slate-400 rounded-xl pl-10 pr-4 py-3 outline-none border border-slate-100 shadow-3xs text-xs font-semibold focus:border-[#4ade80] transition-colors"
        />
      </div>

      {/* FILTROS SUPERIORES */}
      <div className="flex gap-2">
        {(['Todas', 'Comestible', 'Aromática'] as const).map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all border ${
              selectedCategory === cat 
                ? 'bg-[#009660] text-white border-transparent shadow-3xs' 
                : 'bg-white text-slate-400 border-slate-100 hover:text-slate-600'
            }`}
          >
            {cat === 'Todas' ? '🌱 Todas' : cat === 'Comestible' ? '🥗 Comestible' : '🌸 Aromática'}
          </button>
        ))}
      </div>

      {/* LISTADO DE PLANTAS AGRUPADAS CON DISEÑO IDENTICO AL DEL TOMATE */}
      {loading ? (
        <div className="space-y-4">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-96 bg-white rounded-[2rem] animate-pulse border border-slate-100 shadow-3xs" />
          ))}
        </div>
      ) : filteredPlants.length === 0 ? (
        <div className="bg-white rounded-[2rem] border-2 border-dashed border-slate-200 p-10 text-center py-14">
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
                {/* CATEGORÍA SECCIONAL (Ej: 🥗 PLANTAS COMESTIBLES) */}
                <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 tracking-widest uppercase pl-1">
                  <span>{category === 'Comestible' ? '🥗' : '🌸'}</span>
                  <span>PLANTAS {category}S</span>
                </div>

                {/* TARJETAS DE PLANTAS DETALLADAS */}
                {plantsInCat.map(plant => (
                  <div
                    key={plant.id}
                    className="w-full bg-white rounded-[2rem] p-6 border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)] space-y-4 transition-all"
                  >
                    {/* CABECERA: EMOJI, NOMBRE Y CATEGORÍA */}
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 bg-[#fbfdfc] rounded-2xl flex items-center justify-center text-4xl border border-slate-100 shadow-3xs shrink-0">
                        {plant.emoji}
                      </div>
                      <div className="space-y-1 min-w-0">
                        <h2 className="text-base font-extrabold text-slate-800 tracking-tight truncate">
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

                    {/* PARÁMETROS IDEALES (BENTO GRID - NARANJA Y AZUL) */}
                    <div className="grid grid-cols-2 gap-3">
                      {/* Temperatura */}
                      <div className="bg-[#fff7ed] border border-[#ffedd5]/60 rounded-2xl p-3 text-center">
                        <p className="text-[10px] font-extrabold text-[#f97316] mb-1 flex items-center justify-center gap-1">
                          🌡️ Temperatura
                        </p>
                        <p className="font-black text-xs text-slate-800">
                          {plant.min_temp}°C – {plant.max_temp}°C
                        </p>
                      </div>

                      {/* Humedad */}
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
                            className="bg-[#f4f7f5]/70 border border-slate-100/50 rounded-xl p-3 flex gap-2.5 items-start"
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
                ))}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}