import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isRegister, setIsRegister] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

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

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-5">
      <div className="w-full max-w-sm">

        {/* LOGO */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-3">🌿</div>
          <h1 className="text-3xl font-bold text-white">Mi Huerto</h1>
          <p className="text-slate-400 text-sm mt-1">Tu huerto inteligente</p>
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
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-slate-800 text-white placeholder-slate-500 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-green-500"
          />

          <input
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
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
            {isRegister ? '¿Ya tienes cuenta? Inicia sesión' : '¿No tienes cuenta? Regístrate'}
          </button>
        </div>
      </div>
    </div>
  )
}