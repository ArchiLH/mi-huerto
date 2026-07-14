import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useNavigate } from 'react-router-dom'

const BOT_USERNAME = 'MiHuertoSGBot'

function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export default function Configuracion() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [connected, setConnected] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [code, setCode] = useState<string | null>(null)
  const [checking, setChecking] = useState(false)

  useEffect(() => { loadSettings() }, [])

  const loadSettings = async () => {
    if (!user) return
    const { data } = await supabase
      .from('user_settings')
      .select('telegram_chat_id, telegram_enabled')
      .eq('id', user.id)
      .single()

    if (data?.telegram_chat_id && data?.telegram_enabled) setConnected(true)
    setLoading(false)
  }

  const startConnect = async () => {
    if (!user) return
    setConnecting(true)
    const newCode = generateCode()
    await supabase.from('telegram_codes').insert({ user_id: user.id, code: newCode, used: false })
    setCode(newCode)
    setConnecting(false)
    window.open(`https://t.me/${BOT_USERNAME}?start=${newCode}`, '_blank')
  }

  const checkConnection = async () => {
    if (!user) return
    setChecking(true)
    const { data } = await supabase
      .from('user_settings')
      .select('telegram_chat_id, telegram_enabled')
      .eq('id', user.id)
      .single()

    if (data?.telegram_chat_id && data?.telegram_enabled) {
      setConnected(true)
      setCode(null)
    } else {
      alert('Aún no detectamos la conexión. Asegúrate de haber presionado Start en Telegram.')
    }
    setChecking(false)
  }

  const disconnect = async () => {
    if (!user) return
    if (!window.confirm('¿Desconectar Telegram?')) return
    await supabase.from('user_settings').upsert({ id: user.id, telegram_chat_id: null, telegram_enabled: false })
    setConnected(false)
    setCode(null)
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-24 rounded-2xl animate-pulse" style={{ backgroundColor: '#0d2318' }} />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-5">

      {/* HEADER */}
      <div
        className="rounded-2xl p-5"
        style={{ backgroundColor: '#0d2318', border: '1px solid #1a3a20' }}
      >
        <span className="text-xs font-mono uppercase tracking-widest" style={{ color: '#4a6a4a' }}>
          Ajustes
        </span>
        <h1 className="text-xl font-bold text-white mt-1">⚙️ Configuración</h1>
        <p className="text-sm mt-0.5" style={{ color: '#6b9e6e' }}>
          Gestiona tu cuenta y notificaciones
        </p>
      </div>

      {/* CUENTA */}
      <div
        className="rounded-2xl p-4 flex items-center gap-3"
        style={{ backgroundColor: '#0d2318', border: '1px solid #1a3a20' }}
      >
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg shrink-0"
          style={{ backgroundColor: '#1a3a20', color: '#a3d9a5' }}
        >
          {user?.email?.[0].toUpperCase()}
        </div>
        <div>
          <p className="font-bold text-white">{user?.email?.split('@')[0]}</p>
          <p className="text-xs" style={{ color: '#6b9e6e' }}>{user?.email}</p>
        </div>
      </div>

      {/* TELEGRAM */}
      <div
        className="rounded-2xl p-5 space-y-4"
        style={{ backgroundColor: '#0d2318', border: '1px solid #1a3a20' }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
            style={{ backgroundColor: '#1a3a20' }}
          >
            ✈️
          </div>
          <div>
            <h2 className="font-semibold text-white">Notificaciones Telegram</h2>
            <p className="text-xs" style={{ color: '#6b9e6e' }}>Recibe alertas directo en tu celular</p>
          </div>
        </div>

        {connected ? (
          <div className="space-y-3">
            <div
              className="flex items-center gap-3 rounded-xl px-4 py-3"
              style={{ backgroundColor: '#0a2a10', border: '1px solid #2d6a35' }}
            >
              <span className="text-2xl">✅</span>
              <div>
                <p className="font-medium" style={{ color: '#4ade80' }}>Telegram conectado</p>
                <p className="text-xs" style={{ color: '#6b9e6e' }}>Recibirás alertas automáticamente</p>
              </div>
            </div>
            <button
              onClick={disconnect}
              className="w-full py-2.5 rounded-xl text-sm transition"
              style={{ backgroundColor: '#0a1a0f', color: '#6b9e6e', border: '1px solid #1a3a20' }}
            >
              Desconectar Telegram
            </button>
          </div>
        ) : code ? (
          <div className="space-y-3">
            <div
              className="rounded-xl p-4 text-center space-y-3"
              style={{ backgroundColor: '#0a1a0f' }}
            >
              <p className="text-sm text-white">
                Se abrió Telegram. Presiona <b>Start</b> y vuelve aquí.
              </p>
              <div
                className="rounded-xl py-3"
                style={{ backgroundColor: '#0d2318' }}
              >
                <p className="text-xs mb-1" style={{ color: '#4a6a4a' }}>Tu código</p>
                <p className="text-3xl font-bold tracking-widest" style={{ color: '#4ade80' }}>{code}</p>
              </div>
              <p className="text-xs" style={{ color: '#4a6a4a' }}>
                El bot lo recibe automáticamente
              </p>
            </div>
            <button
              onClick={checkConnection}
              disabled={checking}
              className="w-full text-white font-semibold py-3 rounded-xl transition disabled:opacity-50"
              style={{ backgroundColor: '#2d6a35' }}
            >
              {checking ? 'Verificando...' : '✅ Ya presioné Start — Verificar'}
            </button>
            <button
              onClick={() => window.open(`https://t.me/${BOT_USERNAME}?start=${code}`, '_blank')}
              className="w-full py-2.5 rounded-xl text-sm transition"
              style={{ backgroundColor: '#0a1a0f', color: '#6b9e6e', border: '1px solid #1a3a20' }}
            >
              📱 Volver a abrir Telegram
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div
              className="rounded-xl p-4 text-center space-y-2"
              style={{ backgroundColor: '#0a1a0f' }}
            >
              <p className="text-3xl">📵</p>
              <p className="text-sm text-white">Telegram no está conectado</p>
              <p className="text-xs" style={{ color: '#6b9e6e' }}>
                Conecta para recibir alertas cuando tus plantas necesiten cuidado
              </p>
            </div>
            <button
              onClick={startConnect}
              disabled={connecting}
              className="w-full text-white font-semibold py-3 rounded-xl transition disabled:opacity-50"
              style={{ backgroundColor: '#1a6aaa' }}
            >
              {connecting ? 'Generando código...' : '📱 Conectar Telegram'}
            </button>
          </div>
        )}
      </div>

      {/* HERRAMIENTAS */}
      <div
        className="rounded-2xl p-4 space-y-2"
        style={{ backgroundColor: '#0d2318', border: '1px solid #1a3a20' }}
      >
        <p className="text-xs font-semibold mb-3 uppercase tracking-widest" style={{ color: '#4a6a4a' }}>
          🛠️ Herramientas
        </p>

        {[
          { icon: '🧪', label: 'Simulador de lecturas', desc: 'Envía datos de prueba', path: '/simulador' },
          { icon: '📈', label: 'Historial de lecturas', desc: 'Ve la evolución de tus plantas', path: '/historial' },
          { icon: '📡', label: 'Gestionar sensores', desc: 'Agrega, edita o elimina sensores', path: '/sensores' },
        ].map((item, i) => (
          <button
            key={i}
            onClick={() => navigate(item.path)}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition text-left"
            style={{ backgroundColor: '#0a1a0f' }}
          >
            <span className="text-2xl">{item.icon}</span>
            <div className="flex-1">
              <p className="text-sm font-medium text-white">{item.label}</p>
              <p className="text-xs" style={{ color: '#6b9e6e' }}>{item.desc}</p>
            </div>
            <span style={{ color: '#2d6a35' }}>›</span>
          </button>
        ))}
      </div>

      {/* CERRAR SESIÓN */}
      <button
        onClick={signOut}
        className="w-full py-3 rounded-2xl text-sm font-medium transition"
        style={{ backgroundColor: '#1a0808', color: '#f87171', border: '1px solid #5a1a1a' }}
      >
        🚪 Cerrar sesión
      </button>

    </div>
  )
}