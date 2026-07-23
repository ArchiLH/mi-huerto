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

function SpaceCard({
  space,
  onAssignSensor,
  onRemoveSensor,
  onOpenPlantModal,
  onVerDetalle,
}: {
  space: Space
  onAssignSensor: () => void
  onRemoveSensor: (sensorId: number) => void
  onOpenPlantModal: () => void
  onVerDetalle: () => void
}) {
  const status = getStatus(space)
  const connectedSensor = space.sensors?.[0]

  if (status === 'empty') {
    return (
      <div
        onClick={onOpenPlantModal}
        className="bg-white rounded-[2rem] border-2 border-dashed border-[#51e29d] p-3 sm:p-5 flex flex-col items-center justify-center text-center cursor-pointer transition active:scale-98 aspect-[4/5] min-h-[200px] shadow-sm hover:border-emerald-500"
      >
        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl border-2 border-dashed border-[#51e29d] flex items-center justify-center text-[#22c55e] text-lg sm:text-xl font-bold mb-2 sm:mb-3 shrink-0">
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
      className={`bg-white rounded-[2rem] border p-3 sm:p-5 flex flex-col items-center justify-between text-center transition shadow-xs min-h-[220px] sm:min-h-[240px] relative ${
        isWarning ? 'border-red-200 bg-red-50/10' : 'border-[#51e29d]/60 shadow-[0_4px_20px_-4px_rgba(81,226,157,0.12)]'
      }`}
    >
      {isWarning && (
        <span className="absolute top-3 right-3 sm:top-4 sm:right-4 bg-red-500 text-white text-[9px] w-4.5 h-4.5 rounded-full flex items-center justify-center font-black animate-pulse">
          {space.unacknowledged_alerts}
        </span>
      )}

      <div className="w-14 h-14 sm:w-16 sm:h-16 bg-[#fbfdfc] rounded-full flex items-center justify-center text-3xl sm:text-4xl border border-emerald-100 shadow-xs shrink-0">
        {space.plant_catalog?.emoji ?? '🌿'}
      </div>

      <div className="w-full space-y-0.5 mt-1">
        <h4 className="font-extrabold text-slate-800 text-xs truncate px-1 leading-tight">
          {space.plant_catalog?.name ?? space.name}
        </h4>
        <p className="text-[10px] text-slate-400 font-bold">{space.name}</p>
        {isWarning && (
          <p className="text-[10px] font-black text-amber-500">¡Atención!</p>
        )}
      </div>

      <div className="w-full flex flex-col items-center gap-1.5 sm:gap-2 py-1">
        {connectedSensor ? (
          <div className="w-full grid grid-cols-2 gap-1.5 sm:gap-2">
            <div className="bg-orange-50 rounded-xl py-1.5 px-1">
              <p className="text-xs font-black text-orange-500 leading-none">
                {space.latest_reading ? `${space.latest_reading.temperature.toFixed(1)}°C` : '--'}
              </p>
              <p className="text-[9px] text-slate-400 font-bold mt-0.5">Temp</p>
            </div>
            <div className="bg-blue-50 rounded-xl py-1.5 px-1">
              <p className="text-xs font-black text-blue-500 leading-none">
                {space.latest_reading ? `${space.latest_reading.humidity.toFixed(1)}%` : '--'}
              </p>
              <p className="text-[9px] text-slate-400 font-bold mt-0.5">Humedad</p>
            </div>
          </div>
        ) : (
          <div className="inline-flex items-center gap-1.5 text-[10px] font-extrabold px-3 py-1 bg-slate-100 text-slate-500 rounded-full">
            <span className="w-1.5 h-1.5 bg-slate-400 rounded-full" />
            Sin sensor
          </div>
        )}

        {connectedSensor ? (
          <div className="w-full flex gap-1 sm:gap-1.5 mt-0.5">
            <button
              onClick={(e) => { e.stopPropagation(); onVerDetalle() }}
              className="flex-1 py-1.5 px-1 sm:px-2 rounded-xl text-[10px] font-black text-white bg-[#10b981] hover:bg-[#059669] transition-all cursor-pointer shadow-xs truncate"
            >
              Ver detalle
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onOpenPlantModal() }}
              className="flex-1 py-1.5 px-1 sm:px-2 rounded-xl text-[10px] font-black text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition-all cursor-pointer shadow-xs truncate"
            >
              Cambiar
            </button>
          </div>
        ) : (
          <div className="w-full flex flex-col items-center gap-1">
            <button
              onClick={(e) => { e.stopPropagation(); onAssignSensor() }}
              className="inline-flex items-center justify-center gap-1 text-[10px] font-bold w-full py-1 bg-slate-50 text-slate-500 rounded-xl border border-slate-200 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <svg className="w-3 h-3 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18M10.268 5.732a9 9 0 0110.15 10.15M14.507 9.493a5 5 0 015.006 5.006M12 19a7 7 0 01-5.111-2.222" />
              </svg>
              Conectar sensor
            </button>
            <button
              onClick={onOpenPlantModal}
              className="w-full py-1.5 rounded-xl text-[10px] font-black text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition-all cursor-pointer shadow-xs"
            >
              Cambiar planta
            </button>
          </div>
        )}

        {connectedSensor && (
          <div className="flex flex-col items-center gap-0.5 mt-0.5">
            <span className="inline-flex items-center gap-1 text-[9px] font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full max-w-full truncate">
              📡 {connectedSensor.name}
            </span>
            <button
              onClick={(e) => { e.stopPropagation(); onRemoveSensor(connectedSensor.id) }}
              className="text-[8px] font-black text-red-400 hover:text-red-500 underline cursor-pointer"
            >
              Quitar sensor
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function LockedSpaceCard({ onUnlock }: { onUnlock: () => void }) {
  return (
    <div
      onClick={onUnlock}
      className="bg-slate-50/70 rounded-[2rem] border border-dashed border-slate-300 p-4 sm:p-5 flex flex-col items-center justify-center text-center opacity-80 hover:opacity-100 transition-opacity cursor-pointer aspect-[4/5] min-h-[200px]"
    >
      <span className="text-xl mb-2">🔒</span>
      <p className="font-black text-slate-500 text-xs tracking-tight">Premium</p>
      <p className="text-[9px] text-slate-400 mt-0.5 font-bold">Slot bloqueado</p>
    </div>
  )
}

export default function MiHuerto() {
  const { user } = useAuth()
  const { isPremium } = usePremium()

  const [spaces, setSpaces] = useState<Space[]>([])
  const [plants, setPlants] = useState<Plant[]>([])
  const [loading, setLoading] = useState(true)
  const [fullName, setFullName] = useState('')
  const [isRedirecting, setIsRedirecting] = useState(false)

  const [assigningToSpaceId, setAssigningToSpaceId] = useState<number | null>(null)
  const [availableSensors, setAvailableSensors] = useState<{ id: number; name: string }[]>([])
  const [plantModalSpace, setPlantModalSpace] = useState<Space | null>(null)
  const [selectedPlantId, setSelectedPlantId] = useState<number | null>(null)
  const [detalleSpace, setDetalleSpace] = useState<Space | null>(null)

  const [showToast, setShowToast] = useState(false)
  const initialized = useRef(false)

  useEffect(() => {
    if (!user) return
    if (!initialized.current) {
      initialized.current = true
      loadData()
    }
  }, [user])

  useEffect(() => {
    const setupAppListener = async () => {
      const { App: CapacitorApp } = await import('@capacitor/app').catch(() => ({ App: null }))
      if (!CapacitorApp) return
      const listener = await CapacitorApp.addListener('appStateChange', ({ isActive }) => {
        if (isActive) {
          loadData()
        }
      })
      return listener
    }

    let appListener: any
    setupAppListener().then(l => appListener = l)

    return () => {
      if (appListener) appListener.remove()
    }
  }, [])

  const loadData = async () => {
    if (!user) return
    try {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single()

      setFullName(profileData?.full_name ?? user.email?.split('@')[0] ?? 'Usuario')

      const { data: plantsData } = await supabase
        .from('plant_catalog')
        .select('*')
        .order('name')
      setPlants(plantsData ?? [])

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

    if (!error) {
      setShowToast(true)
      setTimeout(() => setShowToast(false), 3000)
    }
    loadData()
  }

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
    setTimeout(() => setShowToast(false), 3000)
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
      <div className="w-full min-h-[60vh] flex flex-col justify-center items-center space-y-4">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-bold text-slate-400">Cargando tu huerto...</p>
      </div>
    )
  }

  return (
    <div className="w-full space-y-4 sm:space-y-5 pb-12">

      {/* Toast de Éxito */}
      {showToast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-xs bg-[#e2faee] border border-emerald-200 text-slate-800 rounded-xl px-4 py-3 flex items-center gap-2.5 shadow-md animate-fadeIn">
          <span className="text-emerald-600 bg-white w-5 h-5 rounded-md flex items-center justify-center font-bold text-xs border border-emerald-100 shrink-0">
            ✓
          </span>
          <span className="text-xs font-bold text-[#006642]">Espacio actualizado</span>
        </div>
      )}

      {/* BIENVENIDA + PLAN PREMIUM */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-xs">
        <div className="space-y-1">
          <h1 className="text-lg sm:text-2xl font-black text-[#1e293b] flex items-center gap-1.5 tracking-tight">
            ¡Hola, {fullName}! <span>👋</span>
          </h1>
          <p className="text-xs text-slate-400 font-semibold">
            {activeCount > 0
              ? `${activeCount} ${activeCount === 1 ? 'planta activa' : 'plantas activas'} en tu huerto`
              : 'Asigna plantas a los espacios para empezar'}
          </p>
        </div>

        {isPremium ? (
          <div className="self-start sm:self-auto shrink-0 inline-flex items-center gap-1.5 bg-[#ff9100] text-white font-black text-[11px] px-4 py-2 rounded-xl shadow-xs">
            👑 Plan Premium
          </div>
        ) : (
          <button
            onClick={handleStripeCheckout}
            disabled={isRedirecting}
            className="self-start sm:self-auto shrink-0 inline-flex items-center gap-1.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-black text-[11px] px-4 py-2 rounded-xl shadow-xs transition transform active:scale-95 hover:from-emerald-600 hover:to-teal-700 cursor-pointer disabled:opacity-50"
          >
            {isRedirecting ? '⚡ Cargando...' : '⚡ Obtener Premium'}
          </button>
        )}
      </div>

      {/* CONTADORES */}
      <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
        <div className="bg-white rounded-2xl p-2.5 sm:p-3 border border-[#51e29d]/60 shadow-[0_4px_20px_-4px_rgba(81,226,157,0.15)] flex items-center gap-2 sm:gap-2.5">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#e2faee] text-[#009660] flex items-center justify-center text-sm sm:text-base shrink-0">
            🌱
          </div>
          <div className="min-w-0">
            <p className="text-xs sm:text-sm font-black text-slate-800 leading-none">{healthyCount}</p>
            <p className="text-[9px] sm:text-[10px] text-slate-400 font-bold mt-1">Bien</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-2.5 sm:p-3 border border-[#51e29d]/60 shadow-[0_4px_20px_-4px_rgba(81,226,157,0.15)] flex items-center gap-2 sm:gap-2.5">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center text-sm sm:text-base shrink-0">
            ⚠️
          </div>
          <div className="min-w-0">
            <p className="text-xs sm:text-sm font-black text-slate-800 leading-none">{alertCount}</p>
            <p className="text-[9px] sm:text-[10px] text-slate-400 font-bold mt-1">Alertas</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-2.5 sm:p-3 border border-[#51e29d]/60 shadow-[0_4px_20px_-4px_rgba(81,226,157,0.15)] flex items-center gap-2 sm:gap-2.5">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center text-sm sm:text-base shrink-0">
            🏠
          </div>
          <div className="min-w-0">
            <p className="text-xs sm:text-sm font-black text-slate-800 leading-none">{activeCount}</p>
            <p className="text-[9px] sm:text-[10px] text-slate-400 font-bold mt-1">Plantas</p>
          </div>
        </div>
      </div>

      {/* BANNER DE ALERTAS */}
      {alertCount > 0 && (
        <button
          onClick={() => window.location.assign('/alertas')}
          className="w-full flex items-center justify-between gap-2 bg-red-50 border border-red-100 text-red-500 rounded-2xl px-4 py-3 text-xs font-bold transition hover:bg-red-100/70 cursor-pointer shadow-xs"
        >
          <span className="flex items-center gap-2">
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
            {alertCount} {alertCount === 1 ? 'alerta necesita' : 'alertas necesitan'} atención
          </span>
          <span>→</span>
        </button>
      )}

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

        {/* CUADRÍCULA RESPONSIVE PARA CELULARES Y COMPUTADORAS */}
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-4">
          {visibleSpaces.map(space => (
            <SpaceCard
              key={space.id}
              space={space}
              onAssignSensor={() => handleOpenAssignModal(space.id)}
              onRemoveSensor={(id) => handleRemoveSensor(id)}
              onOpenPlantModal={() => handleOpenPlantModal(space)}
              onVerDetalle={() => setDetalleSpace(space)}
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
              onVerDetalle={() => setDetalleSpace(space)}
            />
          ))}
        </div>
      </div>

      {/* MODAL VER DETALLE */}
      {detalleSpace && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white rounded-[2rem] overflow-hidden shadow-2xl border border-slate-100 p-6 space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between pb-1">
              <h3 className="font-black text-sm text-slate-800 flex items-center gap-2 truncate">
                {detalleSpace.plant_catalog?.emoji ?? '🌿'} {detalleSpace.plant_catalog?.name ?? detalleSpace.name}
              </h3>
              <button
                onClick={() => setDetalleSpace(null)}
                className="w-7 h-7 flex items-center justify-center rounded-full bg-slate-100 text-slate-400 font-bold text-xs cursor-pointer hover:bg-slate-200"
              >
                ✕
              </button>
            </div>
            <p className="text-[11px] text-slate-400 font-bold">{detalleSpace.name}</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-orange-50 rounded-2xl p-4 text-center">
                <p className="text-xl font-black text-orange-500">
                  {detalleSpace.latest_reading ? `${detalleSpace.latest_reading.temperature.toFixed(1)}°C` : '--'}
                </p>
                <p className="text-[10px] text-slate-400 font-bold mt-1">Temperatura</p>
              </div>
              <div className="bg-blue-50 rounded-2xl p-4 text-center">
                <p className="text-xl font-black text-blue-500">
                  {detalleSpace.latest_reading ? `${detalleSpace.latest_reading.humidity.toFixed(1)}%` : '--'}
                </p>
                <p className="text-[10px] text-slate-400 font-bold mt-1">Humedad</p>
              </div>
            </div>
            <p className="text-[10px] text-slate-400 font-semibold text-center">
              {detalleSpace.unacknowledged_alerts
                ? `⚠️ ${detalleSpace.unacknowledged_alerts} alerta(s) sin revisar para este espacio.`
                : '✓ Sin alertas pendientes en este espacio.'}
            </p>
          </div>
        </div>
      )}

      {/* MODAL ASIGNAR PLANTA */}
      {plantModalSpace && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white rounded-[2rem] overflow-hidden shadow-2xl border border-slate-100 p-6 space-y-5 animate-fadeIn">
            <div className="flex items-center justify-between pb-1">
              <h3 className="font-black text-sm text-slate-800 flex items-center gap-2 truncate">
                🌱 Asignar planta — {plantModalSpace.name}
              </h3>
              <button
                onClick={() => setPlantModalSpace(null)}
                className="w-7 h-7 flex items-center justify-center rounded-full bg-slate-100 text-slate-400 font-bold text-xs cursor-pointer hover:bg-slate-200"
              >
                ✕
              </button>
            </div>

            <div className="relative">
              <select
                value={selectedPlantId ?? ''}
                onChange={e => setSelectedPlantId(Number(e.target.value) || null)}
                className="w-full bg-white border border-emerald-400 text-slate-700 rounded-xl px-4 py-3 outline-none text-xs font-extrabold appearance-none cursor-pointer shadow-xs"
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
              className="w-full text-white font-extrabold rounded-xl py-3 text-xs bg-[#10b981] hover:bg-[#059669] transition-colors cursor-pointer shadow-xs"
            >
              Guardar
            </button>
          </div>
        </div>
      )}

      {/* MODAL CONECTAR SENSOR */}
      {assigningToSpaceId && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="w-full max-w-xs bg-white rounded-[2rem] overflow-hidden shadow-2xl border border-slate-100 p-5 space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-black text-xs text-slate-800">📡 Conectar Sensor</h3>
              <button
                onClick={() => setAssigningToSpaceId(null)}
                className="w-6 h-6 flex items-center justify-center rounded-full bg-slate-100 text-slate-400 font-bold text-xs cursor-pointer hover:bg-slate-200"
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
                    className="w-full flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-left hover:border-emerald-300 transition-colors cursor-pointer"
                  >
                    <span className="text-[11px] font-bold text-slate-700 truncate">{sensor.name}</span>
                    <span className="text-[#009660] font-black text-[10px] shrink-0 ml-2">Asignar ›</span>
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