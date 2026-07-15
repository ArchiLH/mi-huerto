import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { handlePurchase } from '../lib/stripe'

const FREE_LIMIT = 4
const PREMIUM_LIMIT = 8

type Space = {
  id: number
  slot_number: number
  name: string
  plant_id: number | null
  plant_catalog?: { name: string; emoji: string } | null
  sensors?: { id: number; active: boolean }[]
  latest_reading?: { temperature: number; humidity: number; recorded_at?: string } | null
  unacknowledged_alerts?: number
}

type SpaceStatus = 'ok' | 'warning' | 'no_sensor' | 'empty'

function getStatus(space: Space): SpaceStatus {
  if (!space.plant_id) return 'empty'
  if (!space.sensors || space.sensors.length === 0) return 'no_sensor'
  if (space.unacknowledged_alerts && space.unacknowledged_alerts > 0) return 'warning'
  return 'ok'
}

function timeAgo(dateStr?: string) {
  if (!dateStr) return null
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (diff < 60) return 'hace un momento'
  if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)} h`
  return `hace ${Math.floor(diff / 86400)} días`
}

function timeAgoSync(dateStr: string) {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (diff < 60) return 'hace un momento'
  if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)} h`
  return `hace ${Math.floor(diff / 86400)} días`
}

function SpaceCard({ space, onClick }: { space: Space; onClick: () => void }) {
  const status = getStatus(space)

  if (status === 'empty') {
    return (
      <div
        onClick={onClick}
        className="rounded-2xl p-4 flex items-center gap-4 cursor-pointer transition active:scale-95"
        style={{ backgroundColor: '#0d2318', border: '1px solid #1a3a20' }}
      >
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shrink-0"
          style={{ backgroundColor: '#1a3a20' }}
        >
          🪴
        </div>
        <div className="flex-1">
          <p className="font-semibold text-white">{space.name}</p>
          <p className="text-xs mt-0.5" style={{ color: '#6b9e6e' }}>Toca para agregar planta</p>
        </div>
        <span style={{ color: '#2d6a35' }} className="text-xl">+</span>
      </div>
    )
  }

  const statusLabel = {
    ok: { text: 'Saludable', color: '#4ade80', bg: '#0a2a10' },
    warning: { text: 'Alerta crítica', color: '#f87171', bg: '#2a0a0a' },
    no_sensor: { text: 'Sensor desconectado', color: '#6b9e6e', bg: '#0d2318' },
  }[status]

  const ago = timeAgo(space.latest_reading?.recorded_at)

  return (
    <div
      onClick={onClick}
      className="rounded-2xl p-4 cursor-pointer transition active:scale-95"
      style={{
        background: status === 'warning'
          ? 'linear-gradient(135deg, #1a0a0a 0%, #0d2318 100%)'
          : status === 'no_sensor'
          ? 'linear-gradient(135deg, #0d1a0d 0%, #0a1a0f 100%)'
          : 'linear-gradient(135deg, #0d2318 0%, #0a1a0f 100%)',
        border: `1px solid ${status === 'warning' ? '#5a1a1a' : '#1a3a20'}`
      }}
    >
      <div className="flex items-start gap-4">
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shrink-0"
          style={{ backgroundColor: '#1a3a20' }}
        >
          {space.plant_catalog?.emoji ?? '🪴'}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-bold text-white text-base truncate">
              {space.plant_catalog?.name ?? space.name}
            </h3>
            <span
              className="text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ml-2"
              style={{ backgroundColor: statusLabel.bg, color: statusLabel.color }}
            >
              {statusLabel.text}
            </span>
          </div>

          {status === 'warning' && (
            <p className="text-xs mb-1" style={{ color: '#f87171' }}>
              ⚠️ {space.unacknowledged_alerts} alerta{(space.unacknowledged_alerts ?? 0) > 1 ? 's' : ''} · Revisar ahora
            </p>
          )}

          {status === 'no_sensor' && (
            <p className="text-xs mb-1" style={{ color: '#6b9e6e' }}>
              📡 Sin sensor conectado
            </p>
          )}

          {space.latest_reading && status !== 'no_sensor' && (
            <p className="text-xs mb-1" style={{ color: '#a3d9a5' }}>
              {space.latest_reading.temperature.toFixed(0)}° · Temp · {space.latest_reading.humidity.toFixed(0)}% · Hum
            </p>
          )}

          {ago && (
            <p className="text-xs" style={{ color: '#4a6a4a' }}>
              Actualizado {ago}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

function LockedSpaceCard({ onClick }: { onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      className="rounded-2xl p-4 flex items-center gap-4 cursor-pointer opacity-40"
      style={{ backgroundColor: '#0d2318', border: '1px dashed #1a3a20' }}
    >
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shrink-0"
        style={{ backgroundColor: '#1a3a20' }}
      >
        🔒
      </div>
      <div>
        <p className="font-semibold text-white text-sm">Espacio Premium</p>
        <p className="text-xs mt-0.5" style={{ color: '#6b9e6e' }}>Activa Premium para usar</p>
      </div>
    </div>
  )
}

export default function MiHuerto() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [spaces, setSpaces] = useState<Space[]>([])
  const [isPremium, setIsPremium] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showUpgrade, setShowUpgrade] = useState(false)
  const [isUpgrading, setIsUpgrading] = useState(false)
  const [lastSync, setLastSync] = useState<string | null>(null)
  
  // NUEVO: Estado para almacenar el nombre completo dinámico
  const [fullName, setFullName] = useState('')

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
      // 1. Obtener la configuración Premium
      const { data: settings } = await supabase
        .from('user_settings')
        .select('is_premium')
        .eq('id', user.id)
        .single()

      const premium = settings?.is_premium ?? false
      setIsPremium(premium)

      // NUEVO: 2. Consultar el Perfil para traer el full_name del usuario
      const { data: profileData } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single()

      if (profileData?.full_name) {
        setFullName(profileData.full_name)
      } else {
        // Fallback: Si no tiene nombre guardado aún, mostramos el alias del correo
        setFullName(user.email?.split('@')[0] ?? 'Usuario')
      }

      // 3. Obtener Espacios de cultivo
      let { data, error } = await supabase
        .from('spaces')
        .select(`*, plant_catalog (name, emoji), sensors (id, active)`)
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
          .select(`*, plant_catalog (name, emoji), sensors (id, active)`)
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

      // ÚLTIMA SINCRONIZACIÓN REAL
      const allSensorIds = enriched
        .filter(s => s.sensors && s.sensors.length > 0)
        .map(s => s.sensors![0].id)

      if (allSensorIds.length > 0) {
        const { data: lastReading } = await supabase
          .from('readings')
          .select('recorded_at')
          .in('sensor_id', allSensorIds)
          .order('recorded_at', { ascending: false })
          .limit(1)
          .single()

        if (lastReading) {
          setLastSync(lastReading.recorded_at)
        }
      }

    } catch (err) {
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleUpgrade = async () => {
    if (!user || isUpgrading) return
    setIsUpgrading(true)
    try {
      const result = await handlePurchase(user.id, user.email ?? '')
      if (result.success) {
        setIsPremium(true)
        setShowUpgrade(false)
        alert('¡Bienvenido a Premium! 🎉')
      }
    } catch (error: any) {
      alert('Error al procesar el pago: ' + error.message)
    } finally {
      setIsUpgrading(false)
    }
  }

  // Helper para generar las iniciales dinámicas para el Avatar circular
  const getInitials = () => {
    if (fullName) {
      return fullName
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    }
    return '?'
  }

  const activeCount = spaces.filter(s => s.plant_id !== null).length
  const alertCount = spaces.reduce((acc, s) => acc + (s.unacknowledged_alerts ?? 0), 0)
  const healthyCount = spaces.filter(s => s.plant_id && (s.unacknowledged_alerts ?? 0) === 0 && s.sensors && s.sensors.length > 0).length
  const avgHumidity = spaces.filter(s => s.latest_reading).length > 0
    ? Math.round(spaces.filter(s => s.latest_reading).reduce((acc, s) => acc + (s.latest_reading?.humidity ?? 0), 0) / spaces.filter(s => s.latest_reading).length)
    : null
  const avgTemp = spaces.filter(s => s.latest_reading).length > 0
    ? Math.round(spaces.filter(s => s.latest_reading).reduce((acc, s) => acc + (s.latest_reading?.temperature ?? 0), 0) / spaces.filter(s => s.latest_reading).length)
    : null

  const visibleSpaces = spaces.slice(0, FREE_LIMIT)
  const lockedSpaces = spaces.slice(FREE_LIMIT)

  if (loading) {
    return (
      <div className="space-y-4 p-5">
        <div className="h-32 rounded-2xl animate-pulse" style={{ backgroundColor: '#0d2318' }} />
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 rounded-2xl animate-pulse" style={{ backgroundColor: '#0d2318' }} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">

      {/* HEADER */}
      <div
        className="rounded-2xl p-4"
        style={{ backgroundColor: '#0d2318', border: '1px solid #1a3a20' }}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            {/* AVATAR DINÁMICO */}
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm"
              style={{ backgroundColor: '#1a3a20', color: '#a3d9a5' }}
            >
              {getInitials()}
            </div>
            <div>
              {/* NOMBRE DINÁMICO */}
              <p className="font-bold text-white text-sm">
                Hola, {fullName}
              </p>
              <p className="text-xs" style={{ color: '#6b9e6e' }}>
                {activeCount > 0
                  ? `${healthyCount} cultivos están estables hoy`
                  : 'Bienvenido a tu huerto'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isPremium ? (
              <span
                className="text-xs font-bold px-3 py-1 rounded-full"
                style={{ backgroundColor: '#3a2a00', color: '#fbbf24', border: '1px solid #b45309' }}
              >
                ⭐ Premium
              </span>
            ) : (
              <button
                onClick={() => setShowUpgrade(true)}
                className="text-xs font-bold px-3 py-1 rounded-full transition"
                style={{ backgroundColor: '#1a3a20', color: '#4ade80', border: '1px solid #2d6a35' }}
              >
                🔓 Free
              </button>
            )}
          </div>
        </div>

        {/* DASHBOARD IOT LABEL */}
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs font-mono uppercase tracking-widest" style={{ color: '#4a6a4a' }}>
            Dashboard IoT
          </span>
        </div>

        <h2 className="text-xl font-bold text-white mb-3">
          Monitoreo inteligente para cada espacio de tu huerto
        </h2>

        {/* SYNC REAL */}
        <div
          className="flex items-center gap-2 text-xs rounded-xl px-3 py-2 mb-4"
          style={{ backgroundColor: '#0a1a0f', color: lastSync ? '#4ade80' : '#6b9e6e' }}
        >
          <span>●</span>
          <span>
            {lastSync
              ? `Sincronizado ${timeAgoSync(lastSync)}`
              : 'Sin lecturas registradas aún'}
          </span>
        </div>

        {/* STATS */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl p-3" style={{ backgroundColor: '#0a1a0f' }}>
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-lg mb-2"
              style={{ backgroundColor: '#1a3a20' }}
            >
              🌱
            </div>
            <p className="text-3xl font-bold text-white">
              {String(activeCount).padStart(2, '0')}
            </p>
            <p className="text-xs font-medium mt-1" style={{ color: '#a3d9a5' }}>
              Plantas registradas
            </p>
            <p className="text-xs mt-0.5" style={{ color: '#4a6a4a' }}>
              {healthyCount} saludables · {alertCount} requieren atención
            </p>
          </div>

          <div className="rounded-xl p-3" style={{ backgroundColor: '#0a1a0f' }}>
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-lg mb-2"
              style={{ backgroundColor: '#1a3a20' }}
            >
              💧
            </div>
            <p className="text-3xl font-bold text-white">
              {avgHumidity !== null ? `${avgHumidity}%` : '--'}
            </p>
            <p className="text-xs font-medium mt-1" style={{ color: '#a3d9a5' }}>
              Humedad promedio
            </p>
            <p className="text-xs mt-0.5" style={{ color: '#4a6a4a' }}>
              {avgHumidity !== null && avgHumidity >= 50 && avgHumidity <= 80
                ? 'Rango ideal para cultivo activo'
                : avgHumidity !== null ? 'Fuera del rango ideal' : 'Sin datos'}
            </p>
          </div>

          <div className="rounded-xl p-3" style={{ backgroundColor: '#0a1a0f' }}>
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-lg mb-2"
              style={{ backgroundColor: '#1a3a20' }}
            >
              🌡️
            </div>
            <p className="text-3xl font-bold text-white">
              {avgTemp !== null ? `${avgTemp}°` : '--'}
            </p>
            <p className="text-xs font-medium mt-1" style={{ color: '#a3d9a5' }}>
              Temperatura
            </p>
            <p className="text-xs mt-0.5" style={{ color: '#4a6a4a' }}>
              {avgTemp !== null && avgTemp >= 18 && avgTemp <= 30
                ? 'Invernadero estable'
                : avgTemp !== null ? 'Revisar temperatura' : 'Sin datos'}
            </p>
          </div>

          <div
            className="rounded-xl p-3"
            style={{
              backgroundColor: alertCount > 0 ? '#1a0a0a' : '#0a1a0f',
              border: alertCount > 0 ? '1px solid #5a1a1a' : 'none'
            }}
          >
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-lg mb-2"
              style={{ backgroundColor: alertCount > 0 ? '#3a1a1a' : '#1a3a20' }}
            >
              🔔
            </div>
            <p className={`text-3xl font-bold ${alertCount > 0 ? 'text-red-400' : 'text-white'}`}>
              {String(alertCount).padStart(2, '0')}
            </p>
            <p className="text-xs font-medium mt-1" style={{ color: alertCount > 0 ? '#f87171' : '#a3d9a5' }}>
              Alertas activas
            </p>
            <p className="text-xs mt-0.5" style={{ color: '#4a6a4a' }}>
              {alertCount > 0
                ? `${alertCount} crítico · ${spaces.filter(s => !s.sensors?.length).length} sensor desconectado`
                : 'Todo en orden'}
            </p>
          </div>
        </div>
      </div>

      {/* ESPACIOS */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-white">Espacios del huerto</h2>
          <button
            onClick={() => navigate('/espacios/nuevo')}
            className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-full transition"
            style={{ backgroundColor: '#1a3a20', color: '#4ade80' }}
          >
            <span>+</span> Agregar espacio
          </button>
        </div>

        <div className="space-y-3">
          {visibleSpaces.map(space => (
            <SpaceCard
              key={space.id}
              space={space}
              onClick={() => navigate(`/espacios/${space.id}`)}
            />
          ))}

          {!isPremium && lockedSpaces.map(space => (
            <LockedSpaceCard
              key={space.id}
              onClick={() => setShowUpgrade(true)}
            />
          ))}

          {isPremium && lockedSpaces.map(space => (
            <SpaceCard
              key={space.id}
              space={space}
              onClick={() => navigate(`/espacios/${space.id}`)}
            />
          ))}
        </div>
      </div>

      {/* MODAL UPGRADE */}
      {showUpgrade && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-end justify-center p-4">
          <div
            className="rounded-2xl w-full max-w-sm p-6 space-y-4"
            style={{ backgroundColor: '#0f2317', border: '1px solid #1a3a20' }}
          >
            <div className="text-center">
              <p className="text-5xl mb-3">⭐</p>
              <h2 className="text-xl font-bold text-white">Desbloquea Premium</h2>
              <p className="text-sm mt-1" style={{ color: '#6b9e6e' }}>
                Accede a todos los espacios de tu huerto
              </p>
            </div>

            <div className="space-y-2">
              {[
                '🏡 8 espacios de cultivo',
                '📡 Sensores ilimitados',
                '📊 Historial completo',
                '🔔 Alertas en Telegram',
                '🤖 Asistente IA HuertoBot',
                '🧪 Simulador avanzado',
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-slate-300">
                  <span className="text-green-400">✓</span>
                  {item}
                </div>
              ))}
            </div>

            <div
              className="rounded-xl p-4 text-center"
              style={{ backgroundColor: '#0a1a0f' }}
            >
              <p className="text-xs text-slate-400 mb-1">Incluido con la compra del sensor</p>
              <p className="text-2xl font-bold text-amber-400">Kit Mi Huerto</p>
              <p className="text-xs text-slate-400 mt-1">
                Actívate automáticamente al registrar tu sensor
              </p>
            </div>

            <button
              onClick={handleUpgrade}
              disabled={isUpgrading}
              className="w-full text-white font-bold py-3 rounded-xl transition disabled:opacity-50"
              style={{ backgroundColor: '#2d6a35' }}
            >
              {isUpgrading ? '⏳ Procesando...' : '🛒 Comprar Kit Premium'}
            </button>

            <button
              onClick={() => setShowUpgrade(false)}
              className="w-full py-3 rounded-xl transition text-sm"
              style={{ backgroundColor: '#0a1a0f', color: '#6b9e6e', border: '1px solid #1a3a20' }}
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

    </div>
  )
}