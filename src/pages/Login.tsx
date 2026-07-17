import { useState } from 'react'
import { supabase } from '../lib/supabase'

type ActiveTab = 'login' | 'register'

export default function Login() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    setLoading(true)
    setError('')
    setSuccessMsg('')
    
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError('Correo o contraseña incorrectos')
    setLoading(false)
  }

  const handleRegister = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    setLoading(true)
    setError('')
    setSuccessMsg('')

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      setLoading(false)
      return
    }

    const { error } = await supabase.auth.signUp({ email, password })
    if (error) {
      setError(error.message)
    } else {
      setSuccessMsg('✅ Revisa tu correo para confirmar tu cuenta')
    }
    setLoading(false)
  }

  const handleDemoMode = () => {
    alert('Entrando en modo demostración...')
  }

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-between p-4 bg-gradient-to-br from-[#cbf3de] via-[#e2faee] to-[#d3f6e5] text-slate-700 font-sans antialiased">
      
      {/* ESPACIADOR SUPERIOR MÓVIL */}
      <div className="w-full flex-1 flex flex-col items-center justify-center py-4">
        
        {/* HEADER / LOGO */}
        <div className="flex flex-col items-center mb-5 text-center px-4">
          <div className="w-20 h-20 bg-white rounded-2xl shadow-md p-2 flex items-center justify-center mb-2">
            <img 
              src="/logo.png" 
              alt="Secret Garden Logo" 
              className="w-full h-full object-contain"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none'
              }}
            />
            <span className="text-3xl absolute">🪴</span>
          </div>
          <h1 className="text-2xl font-black text-[#006642] tracking-tight">Secret Garden</h1>
          <p className="text-xs text-[#4b9372] font-semibold mt-0.5">Cuida tus plantas con sensores inteligentes</p>
        </div>

        {/* CONTENEDOR PRINCIPAL RESPONSIVE */}
        <div className="w-full max-w-sm sm:max-w-md bg-white rounded-[2rem] sm:rounded-[2.5rem] shadow-xl overflow-hidden border border-emerald-100/40">
          
          {/* SECCIÓN MODO DEMOSTRACIÓN */}
          <div className="bg-[#00c86f] p-4 sm:p-5 text-white text-center">
            <div className="flex items-center justify-center gap-1 font-bold text-base sm:text-lg mb-0.5">
              <span>✨</span>
              <h3>Modo demostración</h3>
            </div>
            <p className="text-[11px] sm:text-xs text-emerald-50 opacity-90 mb-3 max-w-[280px] mx-auto">
              Entra con datos de ejemplo ya cargados, sin registrarte.
            </p>
            <button
              onClick={handleDemoMode}
              className="w-full bg-white text-[#008f51] font-bold py-2.5 px-4 rounded-xl shadow-xs hover:bg-emerald-50 active:scale-[0.98] transition-all text-xs sm:text-sm flex items-center justify-center gap-1.5"
            >
              🌱 Entrar como invitado (demo)
            </button>
          </div>

          {/* TARJETAS COMPARATIVAS DE PLANES (Flex-row compacto en móviles) */}
          <div className="p-3 bg-emerald-50/30 flex gap-2 border-b border-emerald-100">
            {/* Card Free */}
            <div className="flex-1 bg-white rounded-xl p-2.5 border border-slate-100 shadow-2xs">
              <div className="flex items-center gap-1 text-[11px] font-bold text-slate-800 mb-1.5">
                <span className="text-blue-500">🏪</span> Free
              </div>
              <ul className="text-[10px] sm:text-[11px] text-slate-500 space-y-0.5">
                <li className="flex items-center gap-1">✅ <span className="text-slate-600 font-medium">4 espacios</span></li>
                <li className="flex items-center gap-1">✅ Temp y hum.</li>
                <li className="flex items-center gap-1">✅ Alertas básicas</li>
              </ul>
            </div>

            {/* Card Premium */}
            <div className="flex-1 bg-[#009660] rounded-xl p-2.5 text-white relative shadow-2xs">
              <span className="absolute -top-1.5 right-1.5 bg-amber-400 text-[8px] font-black px-1.5 py-0.2 rounded-full text-slate-900 uppercase tracking-wider">
                ★ PRO
              </span>
              <div className="flex items-center gap-1 text-[11px] font-bold mb-1.5">
                <span className="text-cyan-300">💎</span> Premium
              </div>
              <ul className="text-[10px] sm:text-[11px] text-emerald-50 space-y-0.5">
                <li className="flex items-center gap-1">✅ <span className="text-white font-medium">8 espacios</span></li>
                <li className="flex items-center gap-1">✅ Historial comp.</li>
                <li className="flex items-center gap-1">✅ Asistente IA</li>
              </ul>
            </div>
          </div>

          {/* SEPARADOR */}
          <div className="relative flex py-2 items-center justify-center my-0.5">
            <div className="absolute inset-0 flex items-center px-6">
              <div className="w-full border-t border-slate-200/70"></div>
            </div>
            <span className="relative px-3 bg-white text-[11px] text-slate-400 font-medium">o con tu cuenta</span>
          </div>

          {/* TABS (CON MUTADORES) */}
          <div className="px-4 mb-2">
            <div className="flex bg-slate-100/70 p-1 rounded-xl border border-slate-200/30">
              <button
                type="button"
                onClick={() => { setError(''); setSuccessMsg(''); setActiveTab('login') }}
                className={`flex-1 text-center py-2 rounded-lg text-xs sm:text-sm font-bold transition-all ${
                  activeTab === 'login' 
                    ? 'bg-white text-[#008f51] shadow-xs' 
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                Iniciar sesión
              </button>
              <button
                type="button"
                onClick={() => { setError(''); setSuccessMsg(''); setActiveTab('register') }}
                className={`flex-1 text-center py-2 rounded-lg text-xs sm:text-sm font-bold transition-all ${
                  activeTab === 'register' 
                    ? 'bg-white text-[#008f51] shadow-xs' 
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                Registrarse
              </button>
            </div>
          </div>

          {/* FORMULARIO */}
          <form 
            onSubmit={activeTab === 'login' ? handleLogin : handleRegister}
            className="px-5 pb-5 pt-2 space-y-3"
          >
            <p className="text-[11px] font-medium text-slate-400 text-center">
              {activeTab === 'login' ? 'Ingresa para ver cómo están tus plantas' : 'Crea tu cuenta en pocos segundos'} 🌱
            </p>

            {/* FEEDBACKS */}
            {error && (
              <div className="bg-red-50 border border-red-100 text-red-600 text-[11px] rounded-lg p-2.5 font-medium">
                {error}
              </div>
            )}
            {successMsg && (
              <div className="bg-emerald-50 border border-emerald-100 text-emerald-700 text-[11px] rounded-lg p-2.5 font-medium">
                {successMsg}
              </div>
            )}

            {/* INPUT EMAIL */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-500 block pl-1">Correo electrónico</label>
              <input
                type="email"
                required
                placeholder="ana@ejemplo.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full bg-slate-50/50 border border-slate-200 text-slate-800 placeholder-slate-400 rounded-xl px-3.5 py-2.5 outline-none transition focus:bg-white focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 text-sm"
              />
            </div>

            {/* INPUT CONTRASEÑA */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-500 block pl-1">Contraseña</label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-slate-50/50 border border-slate-200 text-slate-800 placeholder-slate-400 rounded-xl px-3.5 py-2.5 outline-none transition focus:bg-white focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 text-sm tracking-widest"
              />
            </div>

            {/* BOTÓN SUBMIT ENTRAR */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#009660] hover:bg-[#008051] text-white font-bold rounded-xl py-3 transition-all shadow-md active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-1.5 text-sm mt-3"
            >
              {loading ? (
                'Procesando...'
              ) : activeTab === 'login' ? (
                <>🏡 Entrar a mi huerto</>
              ) : (
                <>✨ Crear cuenta gratis</>
              )}
            </button>

            {/* LINK INFERIOR TOGGLE */}
            <div className="text-center pt-1">
              <button
                type="button"
                onClick={() => {
                  setError('')
                  setSuccessMsg('')
                  setActiveTab(activeTab === 'login' ? 'register' : 'login')
                }}
                className="text-[11px] text-slate-400 font-medium"
              >
                {activeTab === 'login' ? (
                  <>¿No tienes cuenta? <span className="text-[#009660] font-bold hover:underline">Regístrate gratis</span></>
                ) : (
                  <>¿Ya tienes una cuenta? <span className="text-[#009660] font-bold hover:underline">Inicia sesión</span></>
                )}
              </button>
            </div>
          </form>

        </div>
      </div>

      {/* FOOTER */}
      <footer className="w-full text-center pb-2 text-[10px] sm:text-xs text-[#528d70] font-medium flex items-center justify-center gap-1">
        Secret Garden © 2025 — Hecho con <span className="text-emerald-600 text-xs">💚</span>
      </footer>

    </div>
  )
}