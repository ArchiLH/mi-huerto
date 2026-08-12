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
  onOpenPlantModal,
  onVerDetalle,
  onConnectSensor,
  onDetachSensor,
}: {
  space: Space
  onOpenPlantModal: () => void
  onVerDetalle: () => void
  onConnectSensor: () => void
  onDetachSensor: () => void
}) {
  const status = getStatus(space)
  const connectedSensor = space.sensors?.[0]
  const isWarning = status === 'warning'

  if (status === 'empty') {
    return (
      <div
        onClick={onOpenPlantModal}
        className="bg-white rounded-[2rem] border-2 border-dashed border-[#51e29d] p-3 sm:p-5 flex flex-col items-center justify-center text-center cursor-pointer transition active:scale-98 aspect-[4/5] min-h-[220px] shadow-sm hover:border-emerald-500"
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

  return (
    <div
      className={`bg-white rounded-[2rem] border p-3 sm:p-5 flex flex-col items-center justify-between text-center transition shadow-xs min-h-[240px] relative ${
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

      <div className="w-full flex flex-col items-center gap-1.5 py-1">
        {connectedSensor ? (
          <div className="w-full grid grid-cols-2 gap-1.5">
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
          <div className="inline-flex items-center gap-1.5 text-[10px] font-extrabold px-3 py-1 bg-slate-100 text-slate-500 rounded-full my-1">
            <span className="w-1.5 h-1.5 bg-slate-400 rounded-full" />
            Sin sensor
          </div>
        )}

        <div className="w-full flex gap-1.5 mt-0.5">
          {connectedSensor ? (
            <button
              onClick={(e) => { e.stopPropagation(); onVerDetalle() }}
              className="flex-1 py-1.5 px-1 rounded-xl text-[10px] font-black text-white bg-[#10b981] hover:bg-[#059669] transition-all cursor-pointer shadow-xs truncate"
            >
              Ver detalle
            </button>
          ) : (
            <button
              onClick={(e) => { e.stopPropagation(); onConnectSensor() }}
              className="w-full py-1.5 px-1 rounded-xl text-[10px] font-black text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-all cursor-pointer border border-emerald-200 shadow-3xs truncate"
            >
              📡 Conectar sensor
            </button>
          )}
          
          <button
            onClick={(e) => { e.stopPropagation(); onOpenPlantModal() }}
            className="flex-1 py-1.5 px-1 rounded-xl text-[10px] font-black text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition-all cursor-pointer shadow-xs truncate"
          >
            Cambiar planta
          </button>
        </div>

        {connectedSensor && (
          <div className="flex items-center justify-center gap-2 mt-1 w-full">
            <span className="text-[9px] font-bold text-slate-400 truncate">
              📡 {connectedSensor.name}
            </span>
            <button
              onClick={(e) => { e.stopPropagation(); onDetachSensor() }}
              className="text-[9px] font-bold text-red-500 hover:underline cursor-pointer shrink-0"
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
      className="bg-slate-50/70 rounded-[2rem] border border-dashed border-slate-300 p-4 sm:p-5 flex flex-col items-center justify-center text-center opacity-80 hover:opacity-100 transition-opacity cursor-pointer aspect-[4/5] min-h-[220px]"
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
  }, [user, isPremium])

  useEffect(() => {
    const originalBg = document.body.style.backgroundColor
    document.body.style.backgroundColor = '#e2f3ec'
    return () => {
      document.body.style.backgroundColor = originalBg
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

      let { data: spacesData, error } = await supabase
        .from('spaces')
        .select(`*, plant_catalog (id, name, emoji), sensors (id, name, active)`)
        .eq('user_id', user.id)
        .order('slot_number')

      if (error) throw error

      if (!spacesData || spacesData.length === 0) {
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
        spacesData = newData
      }

      const spacesList = (spacesData as Space[]) ?? []
      const targetLimit = isPremium ? PREMIUM_LIMIT : FREE_LIMIT
      const validSpaces = spacesList.slice(0, targetLimit)

      const enriched = await Promise.all(
        validSpaces.map(async (space) => {
          const activeSensors = space.sensors?.filter(s => s.active) ?? []
          const connectedSensor = activeSensors[0] || space.sensors?.[0]

          if (!connectedSensor || !connectedSensor.active) {
            return { ...space, sensors: [] }
          }

          const sensorId = connectedSensor.id

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
            sensors: [connectedSensor],
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

  const handleConnectSensor = async (space: Space) => {
    const { data: existing } = await supabase
      .from('sensors')
      .select('id')
      .eq('space_id', space.id)
      .maybeSingle()

    if (existing) {
      await supabase.from('sensors').update({ active: true }).eq('id', existing.id)
    } else {
      const { data: orphanSensor } = await supabase
        .from('sensors')
        .select('id')
        .is('space_id', null)
        .limit(1)
        .maybeSingle()

      if (orphanSensor) {
        await supabase
          .from('sensors')
          .update({ 
            space_id: space.id, 
            name: `Sensor ${space.slot_number}`, 
            active: true 
          })
          .eq('id', orphanSensor.id)
      } else {
        await supabase.from('sensors').insert({
          name: `Sensor ${space.slot_number}`,
          space_id: space.id,
          min_temp: 10,
          max_temp: 35,
          min_humidity: 30,
          max_humidity: 80,
          active: true
        })
      }
    }
    loadData()
  }

  const handleDetachSensor = async (space: Space) => {
    if (!space.sensors || space.sensors.length === 0) return
    const sensorId = space.sensors[0].id
    
    await supabase
      .from('sensors')
      .update({ active: false })
      .eq('id', sensorId)
      
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

  const lockedSpaces = Array.from({ length: PREMIUM_LIMIT - FREE_LIMIT }, (_, i) => ({
    id: 999 + i,
    slot_number: FREE_LIMIT + i + 1,
    name: `Espacio ${FREE_LIMIT + i + 1}`,
    plant_id: null,
  }))

  if (loading) {
    return (
      <div className="w-full min-h-screen bg-[#e2f3ec] flex flex-col justify-center items-center space-y-4">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-bold text-slate-400">Cargando tu huerto...</p>
      </div>
    )
  }

  return (
    <div className="w-full min-h-screen bg-[#e2f3ec] p-3 sm:p-6 lg:p-8 flex justify-center">
      <div className="w-full max-w-[1200px] space-y-4 sm:space-y-5 pb-16 font-sans text-slate-800">

        {showToast && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-xs bg-[#e2faee] border border-emerald-200 text-slate-800 rounded-xl px-4 py-3 flex items-center gap-2.5 shadow-md animate-fadeIn">
            <span className="text-emerald-600 bg-white w-5 h-5 rounded-md flex items-center justify-center font-bold text-xs border border-emerald-100 shrink-0">
              ✓
            </span>
            <span className="text-xs font-bold text-[#006642]">Espacio actualizado</span>
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#e2f3ec] p-4 sm:p-6 rounded-3xl border border-emerald-200 shadow-xs">
          <div className="space-y-1">
            <h1 className="text-lg sm:text-2xl font-black text-[#1e293b] flex items-center gap-1.5 tracking-tight">
              ¡Hola, {fullName}! <span>👋</span>
            </h1>
            <p className="text-xs text-slate-600 font-semibold">
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

        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <div className="bg-white rounded-2xl p-3 sm:p-4 border border-[#51e29d]/60 shadow-[0_4px_20px_-4px_rgba(81,226,157,0.15)] flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-[#e2faee] text-[#009660] flex items-center justify-center text-sm sm:text-lg shrink-0">
              🌱
            </div>
            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-black text-slate-800 leading-none">{healthyCount}</p>
              <p className="text-[9px] sm:text-[10px] text-slate-400 font-bold mt-1">Bien</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-3 sm:p-4 border border-[#51e29d]/60 shadow-[0_4px_20px_-4px_rgba(81,226,157,0.15)] flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center text-sm sm:text-lg shrink-0">
              ⚠️
            </div>
            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-black text-slate-800 leading-none">{alertCount}</p>
              <p className="text-[9px] sm:text-[10px] text-slate-400 font-bold mt-1">Alertas</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-3 sm:p-4 border border-[#51e29d]/60 shadow-[0_4px_20px_-4px_rgba(81,226,157,0.15)] flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center text-sm sm:text-lg shrink-0">
              🏠
            </div>
            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-black text-slate-800 leading-none">{activeCount}</p>
              <p className="text-[9px] sm:text-[10px] text-slate-400 font-bold mt-1">Plantas</p>
            </div>
          </div>
        </div>

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

        <div className="space-y-3 pt-1">
          <div className="flex items-center justify-between pl-1">
            <h3 className="font-extrabold text-[#1e293b] text-sm flex items-center gap-1.5">
              🌻 Mis espacios
            </h3>
            <span className="text-[10px] text-slate-400 font-black tracking-wide">
              {activeCount}/{isPremium ? PREMIUM_LIMIT : FREE_LIMIT} ocupados
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
            {spaces.map(space => (
              <SpaceCard
                key={space.id}
                space={space}
                onOpenPlantModal={() => handleOpenPlantModal(space)}
                onVerDetalle={() => setDetalleSpace(space)}
                onConnectSensor={() => handleConnectSensor(space)}
                onDetachSensor={() => handleDetachSensor(space)}
              />
            ))}

            {!isPremium && lockedSpaces.map(space => (
              <LockedSpaceCard key={space.id} onUnlock={handleStripeCheckout} />
            ))}
          </div>
        </div>

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

              <div className="space-y-3">
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

                {/* BOTÓN RÁPIDO PARA QUITAR PLANTA */}
                {plantModalSpace.plant_id !== null && (
                  <button
                    type="button"
                    onClick={() => setSelectedPlantId(null)}
                    className="w-full text-red-500 font-extrabold rounded-xl py-2.5 text-xs bg-red-50 hover:bg-red-100 transition-colors cursor-pointer border border-red-200"
                  >
                    🗑️ Quitar planta del espacio
                  </button>
                )}
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

      </div>
    </div>
  )
}