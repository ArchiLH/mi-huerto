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

    if (data?.telegram_chat_id && data?.telegram_enabled) {
      setConnected(true)
    }
    setLoading(false)
  }

  const startConnect = async () => {
    if (!user) return
    setConnecting(true)

    const newCode = generateCode()

    await supabase.from('telegram_codes').insert({
      user_id: user.id,
      code: newCode,
      used: false,
    })

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
    const confirm = window.confirm('¿Desconectar Telegram?')
    if (!confirm) return

    await supabase
      .from('user_settings')
      .upsert({
        id: user.id,
        telegram_chat_id: null,
        telegram_enabled: false,
      })

    setConnected(false)
    setCode(null)
  }

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="h-8 bg-slate-800 rounded-xl animate-pulse w-48" />
        <div className="h-40 bg-slate-800 rounded-2xl animate-pulse" />
      </div>
    )
  }

  return (
    <div className="space-y-5">

      <div>
        <h1 className="text-2xl font-bold">⚙️ Configuración</h1>
        <p className="text-slate-400 text-sm mt-1">Gestiona tu cuenta y notificaciones</p>
      </div>

      {/* CUENTA */}
      <div className="bg-slate-900 rounded-2xl p-4">
        <p className="text-xs text-slate-400 mb-1">Cuenta</p>
        <p className="font-medium">{user?.email}</p>
      </div>

      {/* TELEGRAM */}
      <div className="bg-slate-900 rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-3">
          <span className="text-3xl">✈️</span>
          <div>
            <h2 className="font-semibold">Notificaciones Telegram</h2>
            <p className="text-xs text-slate-400">Recibe alertas directo en tu celular</p>
          </div>
        </div>

        {connected ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3 bg-green-900/30 border border-green-500/30 rounded-xl px-4 py-3">
              <span className="text-2xl">✅</span>
              <div>
                <p className="font-medium text-green-400">Telegram conectado</p>
                <p className="text-xs text-slate-400">Recibirás alertas automáticamente</p>
              </div>
            </div>
            <button
              onClick={disconnect}
              className="w-full bg-slate-800 hover:bg-slate-700 text-slate-400 text-sm py-2.5 rounded-xl transition"
            >
              Desconectar Telegram
            </button>
          </div>
        ) : code ? (
          <div className="space-y-4">
            <div className="bg-slate-800 rounded-xl p-5 text-center space-y-3">
              <p className="text-slate-300 text-sm">
                Se abrió Telegram. Presiona <b className="text-white">Start</b> en el bot y luego vuelve aquí.
              </p>
              <div className="bg-slate-700 rounded-xl py-3">
                <p className="text-xs text-slate-400 mb-1">Tu código de conexión</p>
                <p className="text-3xl font-bold tracking-widest text-green-400">{code}</p>
              </div>
              <p className="text-xs text-slate-500">
                El bot lo recibe automáticamente, no necesitas escribirlo
              </p>
            </div>
            <button
              onClick={checkConnection}
              disabled={checking}
              className="w-full bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition"
            >
              {checking ? 'Verificando...' : '✅ Ya presioné Start — Verificar'}
            </button>
            <button
              onClick={() => window.open(`https://t.me/${BOT_USERNAME}?start=${code}`, '_blank')}
              className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm py-2.5 rounded-xl transition"
            >
              📱 Volver a abrir Telegram
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="bg-slate-800 rounded-xl p-4 text-center space-y-2">
              <p className="text-4xl">📵</p>
              <p className="text-slate-300 text-sm">Telegram no está conectado</p>
              <p className="text-slate-500 text-xs">
                Conecta Telegram para recibir alertas cuando tus plantas necesiten cuidado
              </p>
            </div>
            <button
              onClick={startConnect}
              disabled={connecting}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition"
            >
              {connecting ? 'Generando código...' : '📱 Conectar Telegram'}
            </button>
          </div>
        )}
      </div>

      {/* HERRAMIENTAS */}
      <div className="bg-slate-900 rounded-2xl p-4 space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-2xl">🛠️</span>
          <h2 className="font-semibold">Herramientas</h2>
        </div>

        <button
          onClick={() => navigate('/simulador')}
          className="w-full flex items-center gap-3 bg-slate-800 hover:bg-slate-700 px-4 py-3 rounded-xl transition"
        >
          <span className="text-2xl">🧪</span>
          <div className="text-left">
            <p className="text-sm font-medium">Simulador de lecturas</p>
            <p className="text-xs text-slate-400">Envía datos de prueba a tus sensores</p>
          </div>
          <span className="text-slate-500 ml-auto">›</span>
        </button>

        <button
          onClick={() => navigate('/historial')}
          className="w-full flex items-center gap-3 bg-slate-800 hover:bg-slate-700 px-4 py-3 rounded-xl transition"
        >
          <span className="text-2xl">📈</span>
          <div className="text-left">
            <p className="text-sm font-medium">Historial de lecturas</p>
            <p className="text-xs text-slate-400">Ve la evolución de tus plantas</p>
          </div>
          <span className="text-slate-500 ml-auto">›</span>
        </button>

        <button
          onClick={() => navigate('/sensores')}
          className="w-full flex items-center gap-3 bg-slate-800 hover:bg-slate-700 px-4 py-3 rounded-xl transition"
        >
          <span className="text-2xl">📡</span>
          <div className="text-left">
            <p className="text-sm font-medium">Gestionar sensores</p>
            <p className="text-xs text-slate-400">Agrega, edita o elimina sensores</p>
          </div>
          <span className="text-slate-500 ml-auto">›</span>
        </button>
      </div>

      {/* CERRAR SESIÓN */}
      <button
        onClick={signOut}
        className="w-full bg-red-900/30 hover:bg-red-900/50 border border-red-500/20 text-red-400 py-3 rounded-2xl transition text-sm font-medium"
      >
        🚪 Cerrar sesión
      </button>

    </div>
  )
}