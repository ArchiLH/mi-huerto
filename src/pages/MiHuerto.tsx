import { useEffect, useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { usePremium } from '../context/PremiumContext'
import { handlePurchase } from '../lib/stripe'

const FREE_LIMIT = 4
const PREMIUM_LIMIT = 8

type Space = {
  id: number
  slot_number: number
  name: string
  plant_id: number | null
  plant_catalog?: { id: number; name: string; emoji: string } | null
  sensors?: { id: number; name: string; active: boolean }[]
  latest_reading?: { temperature: number; humidity: number; recorded_at?: string } | null
  unacknowledged_alerts?: number
}

type Plant = {
  id: number
  name: string
  emoji: string
  category: string | null
}

type SpaceStatus = 'ok' | 'warning' | 'no_sensor' | 'empty'

function getStatus(space: Space): SpaceStatus {
  if (!space.plant_id) return 'empty'
  if (!space.sensors || space.sensors.length === 0) return 'no_sensor'
  if (space.unacknowledged_alerts && space.unacknowledged_alerts > 0) return 'warning'
  return 'ok'
}

// COMPONENTE TARJETA DE ESPACIO INDIVIDUAL
function SpaceCard({ 
  space, 
  onAssignSensor, 
  onRemoveSensor,
  onOpenPlantModal 
}: { 
  space: Space
  onAssignSensor: () => void
  onRemoveSensor: (sensorId: number) => void
  onOpenPlantModal: () => void 
}) {
  const status = getStatus(space)
  const connectedSensor = space.sensors?.[0]

  // Espacio Vacío
  if (status === 'empty') {
    return (
      <div
        onClick={onOpenPlantModal}
        className="bg-white rounded-[2rem] border-2 border-dashed border-[#51e29d] p-5 flex flex-col items-center justify-center text-center cursor-pointer transition active:scale-98 aspect-[4/5] min-h-[230px]"
      >
        <div className="w-12 h-12 rounded-2xl border-2 border-dashed border-[#51e29d] flex items-center justify-center text-[#22c55e] text-xl font-bold mb-3">
          +
        </div>
        <p className="font-extrabold text-[#1e293b] text-xs leading-tight">{space.name}</p>
        <p className="text-[10px] text-slate-400 mt-1 max-w-[120px] font-semibold leading-tight">
          Toca para agregar planta
        </p>
      </div>
    )
  }

  const isWarning = status === 'warning'
  return (
    <div
      className={`bg-white rounded-[2rem] border p-5 flex flex-col items-center justify-between text-center transition shadow-3xs min-h-[240px] relative ${
        isWarning ? 'border-red-200 bg-red-50/5' : 'border-slate-100/80'
      }`}
    >
      {isWarning && (
        <span className="absolute top-4 right-4 bg-red-500 text-white text-[9px] w-4.5 h-4.5 rounded-full flex items-center justify-center font-black animate-pulse">
          !
        </span>
      )}

      {/* Emoji de Planta */}
      <div className="w-16 h-16 bg-[#fbfdfc] rounded-full flex items-center justify-center text-4xl border border-slate-100/50 shadow-3xs shrink-0">
        {space.plant_catalog?.emoji ?? '🌿'}
      </div>

      {/* Nombre e info */}
      <div className="w-full space-y-0.5">
        <h4 className="font-extrabold text-slate-800 text-xs truncate px-1 leading-tight">
          {space.plant_catalog?.name ?? space.name}
        </h4>
        <p className="text-[10px] text-slate-400 font-bold">{space.name}</p>
      </div>

      {/* ELEMENTOS DE TU IMAGEN */}
      <div className="w-full flex flex-col items-center gap-2.5 py-1">
        
        {/* INDICADOR 1: • Sin Sensor / • Activo */}
        {connectedSensor ? (
          <div className="inline-flex items-center gap-1.5 text-[10px] font-extrabold px-3 py-1 bg-[#e2faee] text-[#008f51] rounded-full border border-emerald-100/30">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
            {space.latest_reading ? `${space.latest_reading.temperature.toFixed(0)}°C · ${space.latest_reading.humidity.toFixed(0)}%` : 'Activo'}
          </div>
        ) : (
          <div className="inline-flex items-center gap-1.5 text-[10px] font-extrabold px-3.5 py-1 bg-[#f1f5f9] text-slate-500 rounded-full">
            <span className="w-1.5 h-1.5 bg-slate-400 rounded-full" />
            Sin sensor
          </div>
        )}

        {/* INDICADOR 2: Icono Señal Tachada / Nombre del Sensor */}
        {connectedSensor ? (
          <div className="flex flex-col items-center gap-0.5">
            <span className="inline-flex items-center gap-1 text-[9px] font-bold text-slate-400 bg-slate-50 px-2.5 py-0.5 rounded-full">
              📡 {connectedSensor.name}
            </span>
            <button
              onClick={(e) => { e.stopPropagation(); onRemoveSensor(connectedSensor.id) }}
              className="text-[8px] font-black text-red-400 hover:text-red-500 underline"
            >
              Quitar sensor
            </button>
          </div>
        ) : (
          <button
            onClick={(e) => { e.stopPropagation(); onAssignSensor() }}
            className="inline-flex items-center gap-1.5 text-[10px] font-bold px-3 py-1 bg-[#f8fafc]/90 text-slate-400 rounded-full border border-slate-100/20 hover:bg-slate-100/50 transition-colors"
          >
            <svg className="w-3.5 h-3.5 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18M10.268 5.732a9 9 0 0110.15 10.15M14.507 9.493a5 5 0 015.006 5.006M12 19a7 7 0 01-5.111-2.222" />
            </svg>
            Sin sensor
          </button>
        )}

        {/* BOTÓN CAMBIAR */}
        <button
          onClick={onOpenPlantModal}
          className="w-24 py-1.5 rounded-xl text-[10px] font-black text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition-all shadow-3xs mt-1"
        >
          Cambiar
        </button>
        
      </div>
    </div>
  )
}

function LockedSpaceCard({ onUnlock }: { onUnlock: () => void }) {
  return (
    <div 
      onClick={onUnlock}
      className="bg-slate-50/50 rounded-[2rem] border border-dashed border-slate-200 p-5 flex flex-col items-center justify-center text-center opacity-75 hover:opacity-100 transition-opacity cursor-pointer aspect-[4/5] min-h-[230px]"
    >
      <span className="text-xl mb-2">🔒</span>
      <p className="font-black text-slate-400 text-xs tracking-tight">Premium</p>
      <p className="text-[9px] text-slate-300 mt-0.5 font-bold">Slot bloqueado</p>
    </div>
  )
}

export default function MiHuerto() {
  const { user } = useAuth()
  const { isPremium } = usePremium() // ← Usamos el contexto

  const [spaces, setSpaces] = useState<Space[]>([])
  const [plants, setPlants] = useState<Plant[]>([])
  const [loading, setLoading] = useState(true)
  const [fullName, setFullName] = useState('')
  const [isRedirecting, setIsRedirecting] = useState(false)

  // Modales
  const [assigningToSpaceId, setAssigningToSpaceId] = useState<number | null>(null)
  const [availableSensors, setAvailableSensors] = useState<{ id: number; name: string }[]>([])
  const [plantModalSpace, setPlantModalSpace] = useState<Space | null>(null)
  const [selectedPlantId, setSelectedPlantId] = useState<number | null>(null)

  // Toast
  const [showToast, setShowToast] = useState(false)

  const initialized = useRef(false)

  useEffect(() => {
    if (!user) return
    if (!initialized.current) {
      initialized.current = true
      loadData()
    }
  }, [user])

  const loadData = async () => {
    if (!user) return
    try {
      // Ya no cargamos isPremium aquí, viene del contexto

      const { data: profileData } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single()

      setFullName(profileData?.full_name ?? user.email?.split('@')[0] ?? 'Usuario')

      // Catálogo
      const { data: plantsData } = await supabase
        .from('plant_catalog')
        .select('*')
        .order('name')
      setPlants(plantsData ?? [])

      // Espacios
      let { data, error } = await supabase
        .from('spaces')
        .select(`*, plant_catalog (id, name, emoji), sensors (id, name, active)`)
        .eq('user_id', user.id)
        .order('slot_number')

      if (error) throw error

      if (!data || data.length === 0) {
        const defaultSpaces = Array.from({ length: PREMIUM_LIMIT }, (_, i) => ({
          user_id: user.id,
          slot_number: i + 1,
          name: `Espacio ${i + 1}`,
          plant_id: null,
        }))
        await supabase.from('spaces').insert(defaultSpaces)
        const { data: newData } = await supabase
          .from('spaces')
          .select(`*, plant_catalog (id, name, emoji), sensors (id, name, active)`)
          .eq('user_id', user.id)
          .order('slot_number')
        data = newData
      }

      const enriched = await Promise.all(
        (data as Space[]).map(async (space) => {
          if (!space.sensors || space.sensors.length === 0) return space
          const sensorId = space.sensors[0].id

          const { data: reading } = await supabase
            .from('readings')
            .select('temperature, humidity, recorded_at')
            .eq('sensor_id', sensorId)
            .order('recorded_at', { ascending: false })
            .limit(1)
            .maybeSingle()

          const { count } = await supabase
            .from('alerts')
            .select('*', { count: 'exact', head: true })
            .eq('sensor_id', sensorId)
            .eq('acknowledged', false)

          return {
            ...space,
            latest_reading: reading ?? null,
            unacknowledged_alerts: count ?? 0
          }
        })
      )
      setSpaces(enriched)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // Sensores
  const fetchAvailableSensors = async () => {
    const { data } = await supabase
      .from('sensors')
      .select('id, name')
      .is('space_id', null)
    setAvailableSensors(data ?? [])
  }

  const handleOpenAssignModal = async (spaceId: number) => {
    setAssigningToSpaceId(spaceId)
    await fetchAvailableSensors()
  }

  const handleAssignSensor = async (sensorId: number) => {
    if (!assigningToSpaceId) return
    await supabase
      .from('sensors')
      .update({ space_id: assigningToSpaceId })
      .eq('id', sensorId)
    
    setAssigningToSpaceId(null)
    loadData()
  }

  const handleRemoveSensor = async (sensorId: number) => {
    if (!sensorId) return
    const confirm = window.confirm('¿Desvincular este sensor de este espacio?')
    if (!confirm) return
    
    const { error } = await supabase
      .from('sensors')
      .update({ space_id: null })
      .eq('id', sensorId)

    if (error) {
      console.error('Error desvinculando sensor:', error)
    } else {
      setShowToast(true)
      setTimeout(() => setShowToast(false), 3000)
    }
    loadData()
  }

  // Guardar planta
  const handleOpenPlantModal = (space: Space) => {
    setPlantModalSpace(space)
    setSelectedPlantId(space.plant_id)
  }

  const handleSavePlant = async () => {
    if (!plantModalSpace) return
    await supabase
      .from('spaces')
      .update({ plant_id: selectedPlantId })
      .eq('id', plantModalSpace.id)

    setPlantModalSpace(null)
    
    setShowToast(true)
    setTimeout(() => {
      setShowToast(false)
    }, 3000)

    loadData()
  }

  const handleStripeCheckout = async () => {
    if (!user || !user.email) return
    try {
      setIsRedirecting(true)
      await handlePurchase(user.id, user.email)
    } catch (err) {
      console.error('Error al redirigir a Stripe:', err)
    } finally {
      setIsRedirecting(false)
    }
  }

  const activeCount = spaces.filter(s => s.plant_id !== null).length
  const alertCount = spaces.reduce((acc, s) => acc + (s.unacknowledged_alerts ?? 0), 0)
  const healthyCount = spaces.filter(s => s.plant_id && (s.unacknowledged_alerts ?? 0) === 0).length

  const visibleSpaces = spaces.slice(0, FREE_LIMIT)
  const lockedSpaces = spaces.slice(FREE_LIMIT)

  if (loading) {
    return (
      <div className="w-full bg-[#f4f7f5]/40 min-h-screen px-5 pt-6 space-y-4">
        <div className="h-6 w-1/3 bg-slate-100 rounded-lg animate-pulse" />
        <div className="grid grid-cols-2 gap-4 pt-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-44 bg-white rounded-[2rem] animate-pulse border border-slate-100" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="w-full bg-[#f4f7f5]/40 min-h-screen px-5 pt-6 space-y-5 max-w-md mx-auto pb-10 font-sans text-slate-800 relative">
      
      {/* Toast de Éxito */}
      {showToast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-xs bg-[#e2faee] border border-emerald-200 text-slate-800 rounded-xl px-4 py-3 flex items-center gap-2.5 shadow-md">
          <span className="text-emerald-600 bg-white w-5 h-5 rounded-md flex items-center justify-center font-bold text-xs border border-emerald-100">
            ✓
          </span>
          <span className="text-xs font-bold text-[#006642]">Espacio actualizado</span>
        </div>
      )}

      {/* BIENVENIDA */}
      <div className="space-y-1">
        <h1 className="text-2xl font-black text-[#1e293b] flex items-center gap-1.5 tracking-tight">
          ¡Hola, {fullName}! <span className="inline-block">👋</span>
        </h1>
        <p className="text-xs text-slate-400 font-semibold">
          Asigna plantas a los espacios para empezar
        </p>
      </div>

      {/* PLAN PREMIUM DINÁMICO - Usa isPremium del contexto */}
      <div>
        {isPremium ? (
          <div className="inline-flex items-center gap-1.5 bg-[#ff9100] text-white font-black text-[11px] px-4 py-1.5 rounded-xl shadow-xs">
            👑 Plan Premium
          </div>
        ) : (
          <button
            onClick={handleStripeCheckout}
            disabled={isRedirecting}
            className="inline-flex items-center gap-1.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-black text-[11px] px-4 py-1.5 rounded-xl shadow-xs transition transform active:scale-95 hover:from-emerald-600 hover:to-teal-700 cursor-pointer disabled:opacity-50"
          >
            {isRedirecting ? '⚡ Cargando...' : '⚡ Obtener Premium'}
          </button>
        )}
      </div>

      {/* CONTADORES */}
      <div className="grid grid-cols-3 gap-2.5">
        <div className="bg-white rounded-2xl p-2.5 border border-slate-100 flex items-center gap-2 shadow-3xs">
          <div className="w-8 h-8 rounded-xl bg-[#e2faee] text-[#009660] flex items-center justify-center text-base shrink-0">
            🌱
          </div>
          <div className="min-w-0">
            <p className="text-sm font-black text-slate-800 leading-none">{healthyCount}</p>
            <p className="text-[10px] text-slate-400 font-bold mt-1">Bien</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-2.5 border border-slate-100 flex items-center gap-2 shadow-3xs">
          <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center text-base shrink-0">
            ⚠️
          </div>
          <div className="min-w-0">
            <p className="text-sm font-black text-slate-800 leading-none">{alertCount}</p>
            <p className="text-[10px] text-slate-400 font-bold mt-1">Alertas</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-2.5 border border-slate-100 flex items-center gap-2 shadow-3xs">
          <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center text-base shrink-0">
            🏠
          </div>
          <div className="min-w-0">
            <p className="text-sm font-black text-slate-800 leading-none">{activeCount}</p>
            <p className="text-[10px] text-slate-400 font-bold mt-1">Plantas</p>
          </div>
        </div>
      </div>

      {/* MIS ESPACIOS */}
      <div className="space-y-3 pt-1">
        <div className="flex items-center justify-between pl-1">
          <h3 className="font-extrabold text-[#1e293b] text-sm flex items-center gap-1.5">
            🌻 Mis espacios
          </h3>
          <span className="text-[10px] text-slate-400 font-black tracking-wide">
            {activeCount}/{isPremium ? PREMIUM_LIMIT : FREE_LIMIT} ocupados
          </span>
        </div>

        {/* CUADRÍCULA DE ESPACIOS */}
        <div className="grid grid-cols-2 gap-4">
          {visibleSpaces.map(space => (
            <SpaceCard
              key={space.id}
              space={space}
              onAssignSensor={() => handleOpenAssignModal(space.id)}
              onRemoveSensor={(id) => handleRemoveSensor(id)}
              onOpenPlantModal={() => handleOpenPlantModal(space)}
            />
          ))}

          {!isPremium && lockedSpaces.map(space => (
            <LockedSpaceCard key={space.id} onUnlock={handleStripeCheckout} />
          ))}

          {isPremium && lockedSpaces.map(space => (
            <SpaceCard
              key={space.id}
              space={space}
              onAssignSensor={() => handleOpenAssignModal(space.id)}
              onRemoveSensor={(id) => handleRemoveSensor(id)}
              onOpenPlantModal={() => handleOpenPlantModal(space)}
            />
          ))}
        </div>
      </div>

      {/* MODAL ASIGNAR PLANTA */}
      {plantModalSpace && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white rounded-[2rem] overflow-hidden shadow-2xl border border-slate-100 p-6 space-y-5">
            
            <div className="flex items-center justify-between pb-1">
              <h3 className="font-black text-sm text-slate-800 flex items-center gap-2">
                🌱 Asignar planta — {plantModalSpace.name}
              </h3>
              <button
                onClick={() => setPlantModalSpace(null)}
                className="w-7 h-7 flex items-center justify-center rounded-full bg-slate-100 text-slate-400 font-bold text-xs"
              >
                ✕
              </button>
            </div>

            <div className="relative">
              <select
                value={selectedPlantId ?? ''}
                onChange={e => setSelectedPlantId(Number(e.target.value) || null)}
                className="w-full bg-white border border-[#4ade80] text-slate-700 rounded-xl px-4 py-3 outline-none text-xs font-extrabold appearance-none cursor-pointer shadow-3xs"
              >
                <option value="">Seleccionar planta...</option>
                {plants.map(plant => (
                  <option key={plant.id} value={plant.id}>
                    {plant.emoji} {plant.name}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-slate-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                </svg>
              </div>
            </div>

            <button
              onClick={handleSavePlant}
              className="w-full text-white font-extrabold rounded-xl py-3 text-xs bg-[#10b981] hover:bg-[#059669] transition-colors shadow-3xs"
            >
              Guardar
            </button>
          </div>
        </div>
      )}

      {/* MODAL CONECTAR SENSOR */}
      {assigningToSpaceId && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="w-full max-w-xs bg-white rounded-[2rem] overflow-hidden shadow-2xl border border-slate-100 p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-black text-xs text-slate-800">📡 Conectar Sensor</h3>
              <button
                onClick={() => setAssigningToSpaceId(null)}
                className="w-6 h-6 flex items-center justify-center rounded-full bg-slate-100 text-slate-400 font-bold text-xs"
              >
                ✕
              </button>
            </div>

            {availableSensors.length === 0 ? (
              <div className="text-center py-4 space-y-2">
                <p className="text-2xl">📡</p>
                <p className="text-[10px] text-slate-400 font-bold leading-normal">
                  No hay sensores libres actualmente.
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                {availableSensors.map(sensor => (
                  <button
                    key={sensor.id}
                    onClick={() => handleAssignSensor(sensor.id)}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl bg-[#f8faf9] border border-slate-100 text-left hover:border-emerald-300 transition-colors"
                  >
                    <span className="text-[11px] font-bold text-slate-700">{sensor.name}</span>
                    <span className="text-[#009660] font-black text-[10px]">Asignar ›</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  )
}