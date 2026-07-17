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
      <div className="w-full bg-[#f4f7f5] min-h-screen px-5 pt-6 space-y-4">
        <div className="h-6 w-1/3 bg-slate-200/60 rounded-lg animate-pulse" />
        <div className="h-20 bg-white rounded-2xl animate-pulse border border-slate-100" />
        <div className="h-32 bg-white rounded-2xl animate-pulse border border-slate-100" />
      </div>
    )
  }

  return (
    <div className="w-full bg-[#f4f7f5] min-h-screen px-5 pt-6 space-y-5 max-w-md mx-auto pb-10 font-sans text-slate-700">

      {/* HEADER DE AJUSTES */}
      <div className="space-y-1">
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
          Ajustes
        </span>
        <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
          Configuración ⚙️
        </h1>
        <p className="text-xs text-slate-400 font-medium">
          Gestiona tu cuenta y notificaciones
        </p>
      </div>

      {/* CUENTA */}
      <div className="bg-white rounded-2xl p-4 flex items-center gap-4 border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
        <div className="w-12 h-12 rounded-full flex items-center justify-center font-extrabold text-lg shrink-0 bg-[#e2faee] text-[#009660]">
          {user?.email?.[0].toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="font-extrabold text-xs text-slate-800 truncate">
            {user?.email?.split('@')[0]}
          </p>
          <p className="text-[10px] text-slate-400 font-semibold truncate">
            {user?.email}
          </p>
        </div>
      </div>

      {/* TELEGRAM */}
      <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)] space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-50 text-xl flex items-center justify-center shrink-0 border border-sky-100/50">
            ✈️
          </div>
          <div>
            <h2 className="font-extrabold text-xs text-slate-800">Notificaciones Telegram</h2>
            <p className="text-[10px] text-slate-400 font-semibold">Recibe alertas directamente en tu celular</p>
          </div>
        </div>

        {connected ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3 rounded-xl px-4 py-3 bg-[#e2faee]/50 border border-emerald-100">
              <span className="text-xl shrink-0">✅</span>
              <div>
                <p className="text-xs font-bold text-[#008f51]">Telegram conectado</p>
                <p className="text-[10px] text-slate-400 font-semibold">Recibirás alertas de forma automática</p>
              </div>
            </div>
            <button
              onClick={disconnect}
              className="w-full py-2.5 rounded-xl text-xs font-bold bg-slate-50 hover:bg-slate-100 text-slate-500 border border-slate-200/60 transition-colors"
            >
              Desconectar Telegram
            </button>
          </div>
        ) : code ? (
          <div className="space-y-3">
            <div className="rounded-xl p-4 text-center space-y-3 bg-[#f8faf9] border border-slate-100">
              <p className="text-xs text-slate-500 font-bold leading-relaxed">
                Se abrió Telegram. Presiona <b className="text-slate-700">Start</b> y vuelve aquí.
              </p>
              
              <div className="rounded-xl py-2.5 bg-white border border-slate-200/50 shadow-3xs max-w-[200px] mx-auto">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-0.5">Tu código</p>
                <p className="text-2xl font-black tracking-widest text-[#009660]">{code}</p>
              </div>
            </div>
            
            <button
              onClick={checkConnection}
              disabled={checking}
              className="w-full text-white font-bold py-3 rounded-xl text-xs bg-[#009660] hover:bg-[#008152] transition disabled:opacity-50 shadow-3xs"
            >
              {checking ? 'Verificando...' : '✅ Ya presioné Start — Verificar'}
            </button>
            
            <button
              onClick={() => window.open(`https://t.me/${BOT_USERNAME}?start=${code}`, '_blank')}
              className="w-full py-2.5 rounded-xl text-xs font-bold bg-slate-50 text-slate-500 border border-slate-200/60 transition-colors"
            >
              📱 Volver a abrir Telegram
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="rounded-2xl p-5 text-center space-y-2.5 bg-[#fafbfc] border-2 border-dashed border-slate-200/80">
              <p className="text-3xl">📵</p>
              <h3 className="text-xs font-bold text-slate-700">Telegram no está conectado</h3>
              <p className="text-[10px] text-slate-400 font-semibold leading-relaxed max-w-[240px] mx-auto">
                Conéctalo para recibir alertas y cuidar de tus plantas a tiempo.
              </p>
            </div>
            <button
              onClick={startConnect}
              disabled={connecting}
              className="w-full text-white font-bold py-3 rounded-xl text-xs bg-[#229ED9] hover:bg-[#1a85b8] transition-colors disabled:opacity-50 shadow-3xs"
            >
              {connecting ? 'Generando código...' : '📱 Conectar Telegram'}
            </button>
          </div>
        )}
      </div>

      {/* HERRAMIENTAS ADICIONALES */}
      <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)] space-y-3">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
          🛠️ Herramientas
        </p>

        <div className="space-y-2">
          {[
            { icon: '🧪', label: 'Simulador de lecturas', desc: 'Envía datos de prueba', path: '/simulador' },
            { icon: '📈', label: 'Historial de lecturas', desc: 'Ve la evolución de tus plantas', path: '/historial' },
            { icon: '📡', label: 'Gestionar sensores', desc: 'Agrega, edita o elimina sensores', path: '/sensores' },
          ].map((item, i) => (
            <button
              key={i}
              onClick={() => navigate(item.path)}
              className="w-full flex items-center gap-3 px-4 py-3 bg-[#f8faf9] hover:bg-[#f3f6f4] rounded-xl border border-slate-100/50 transition-all text-left"
            >
              <span className="text-2xl shrink-0">{item.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-slate-800">{item.label}</p>
                <p className="text-[10px] text-slate-400 font-semibold truncate">{item.desc}</p>
              </div>
              <span className="text-[#009660] font-black text-lg">›</span>
            </button>
          ))}
        </div>
      </div>

      {/* BOTÓN CERRAR SESIÓN */}
      <button
        onClick={signOut}
        className="w-full py-3 rounded-2xl text-xs font-bold bg-red-50 text-red-600 border border-red-200/60 hover:bg-red-100 transition shadow-3xs"
      >
        🚪 Cerrar sesión
      </button>

    </div>
  )
}