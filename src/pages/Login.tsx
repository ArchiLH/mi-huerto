import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const demoSlides = [
  {
    emoji: '🏡',
    title: 'Tu huerto inteligente',
    description: 'Monitorea hasta 8 espacios de cultivo desde tu celular en tiempo real.',
    bg: 'from-green-900/40 to-slate-900',
  },
  {
    emoji: '📡',
    title: 'Sensores en tiempo real',
    description: 'Conecta sensores a tus plantas y recibe datos de temperatura y humedad al instante.',
    bg: 'from-blue-900/40 to-slate-900',
  },
  {
    emoji: '🔔',
    title: 'Alertas inteligentes',
    description: 'Te avisamos cuando una planta necesita agua, sombra o protección del frío.',
    bg: 'from-amber-900/40 to-slate-900',
  },
  {
    emoji: '✈️',
    title: 'Notificaciones Telegram',
    description: 'Recibe alertas directamente en tu Telegram sin importar dónde estés.',
    bg: 'from-purple-900/40 to-slate-900',
  },
  {
    emoji: '📊',
    title: 'Dashboard completo',
    description: 'Visualiza el estado de tu huerto con gráficas y estadísticas detalladas.',
    bg: 'from-cyan-900/40 to-slate-900',
  },
]

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isRegister, setIsRegister] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showAuth, setShowAuth] = useState(false)
  const [currentSlide, setCurrentSlide] = useState(0)

  useEffect(() => {
    if (showAuth) return
    const interval = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % demoSlides.length)
    }, 3000)
    return () => clearInterval(interval)
  }, [showAuth])

  const handleSubmit = async () => {
    setLoading(true)
    setError('')

    if (isRegister) {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) setError(error.message)
      else alert('Revisa tu correo para confirmar tu cuenta')
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError('Correo o contraseña incorrectos')
    }

    setLoading(false)
  }

  // PANTALLA DE DEMO
  if (!showAuth) {
    const slide = demoSlides[currentSlide]
    return (
      <div className={`min-h-screen bg-gradient-to-b ${slide.bg} flex flex-col transition-all duration-700`}>

        {/* LOGO */}
        <div className="flex items-center gap-2 px-6 pt-10">
          <span className="text-3xl">🌿</span>
          <span className="text-xl font-bold text-white">Mi Huerto</span>
        </div>

        {/* SLIDES */}
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
          <div className="text-8xl mb-6 animate-bounce">
            {slide.emoji}
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">
            {slide.title}
          </h2>
          <p className="text-slate-300 text-base leading-relaxed max-w-xs">
            {slide.description}
          </p>

          {/* DOTS */}
          <div className="flex gap-2 mt-8">
            {demoSlides.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentSlide(i)}
                className={`rounded-full transition-all ${
                  i === currentSlide
                    ? 'w-6 h-2 bg-green-400'
                    : 'w-2 h-2 bg-slate-600'
                }`}
              />
            ))}
          </div>
        </div>

        {/* PREVIEW CARDS */}
        <div className="px-6 mb-6">
          <div className="grid grid-cols-3 gap-2">
            {[
              { icon: '🍅', label: 'Tomate', temp: '24°C', hum: '65%', ok: true },
              { icon: '🥬', label: 'Lechuga', temp: '19°C', hum: '72%', ok: true },
              { icon: '🌶️', label: 'Ají', temp: '38°C', hum: '45%', ok: false },
            ].map((plant, i) => (
              <div
                key={i}
                className={`rounded-2xl p-3 text-center border ${
                  plant.ok
                    ? 'bg-slate-900/80 border-green-500/20'
                    : 'bg-red-900/20 border-red-500/30'
                }`}
              >
                <p className="text-2xl mb-1">{plant.icon}</p>
                <p className="text-xs font-medium text-white">{plant.label}</p>
                <p className="text-xs text-orange-400 mt-1">{plant.temp}</p>
                <p className="text-xs text-blue-400">{plant.hum}</p>
                {!plant.ok && (
                  <p className="text-xs text-red-400 mt-1">⚠️</p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* BOTONES */}
        <div className="px-6 pb-10 space-y-3">
          <button
            onClick={() => setShowAuth(true)}
            className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-4 rounded-2xl transition text-lg"
          >
            Comenzar ahora 🌱
          </button>
          <button
            onClick={() => { setShowAuth(true); setIsRegister(false) }}
            className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 py-3 rounded-2xl transition text-sm"
          >
            Ya tengo cuenta — Iniciar sesión
          </button>
        </div>

      </div>
    )
  }

  // PANTALLA DE AUTH
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">

      {/* BACK */}
      <button
        onClick={() => setShowAuth(false)}
        className="flex items-center gap-2 px-5 pt-8 text-slate-400 hover:text-white transition w-fit"
      >
        ← Volver
      </button>

      <div className="flex-1 flex items-center justify-center p-5">
        <div className="w-full max-w-sm">

          {/* LOGO */}
          <div className="text-center mb-8">
            <div className="text-5xl mb-3">🌿</div>
            <h1 className="text-2xl font-bold text-white">Mi Huerto</h1>
            <p className="text-slate-400 text-sm mt-1">
              {isRegister ? 'Crea tu cuenta gratis' : 'Bienvenido de vuelta'}
            </p>
          </div>

          {/* FORM */}
          <div className="bg-slate-900 rounded-2xl p-6 space-y-4">
            <h2 className="text-lg font-semibold text-white">
              {isRegister ? 'Crear cuenta' : 'Iniciar sesión'}
            </h2>

            {error && (
              <div className="bg-red-900/50 border border-red-500/50 text-red-400 text-sm rounded-xl p-3">
                {error}
              </div>
            )}

            <input
              type="email"
              placeholder="Correo electrónico"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full bg-slate-800 text-white placeholder-slate-500 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-green-500"
            />

            <input
              type="password"
              placeholder="Contraseña"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-slate-800 text-white placeholder-slate-500 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-green-500"
            />

            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-semibold rounded-xl py-3 transition"
            >
              {loading ? 'Cargando...' : isRegister ? 'Registrarme' : 'Entrar'}
            </button>

            <button
              onClick={() => setIsRegister(!isRegister)}
              className="w-full text-slate-400 text-sm hover:text-white transition"
            >
              {isRegister
                ? '¿Ya tienes cuenta? Inicia sesión'
                : '¿No tienes cuenta? Regístrate gratis'}
            </button>
          </div>

        </div>
      </div>
    </div>
  )
}