import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function ResetPassword() {
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  const handleReset = async () => {
    setLoading(true)
    setError('')

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      setLoading(false)
      return
    }

    const { error } = await supabase.auth.updateUser({ password })

    if (error) setError(error.message)
    else setDone(true)

    setLoading(false)
  }

  if (done) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center p-6 text-center"
        style={{ backgroundColor: '#0a1a0f' }}
      >
        <div className="text-6xl mb-4">✅</div>
        <h1 className="text-2xl font-bold text-white mb-2">¡Contraseña actualizada!</h1>
        <p className="text-sm mb-6" style={{ color: '#6b9e6e' }}>
          Ya puedes iniciar sesión con tu nueva contraseña
        </p>
        <button
          onClick={() => window.location.href = '/'}
          className="w-full max-w-xs text-white font-bold py-3 rounded-2xl transition"
          style={{ backgroundColor: '#2d6a35' }}
        >
          Ir al inicio 🌿
        </button>
      </div>
    )
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-6"
      style={{ backgroundColor: '#0a1a0f' }}
    >
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🔑</div>
          <h1 className="text-2xl font-bold text-white">Nueva contraseña</h1>
          <p className="text-sm mt-1" style={{ color: '#6b9e6e' }}>
            Ingresa tu nueva contraseña
          </p>
        </div>

        <div
          className="rounded-2xl p-6 space-y-4"
          style={{ backgroundColor: '#0f2317', border: '1px solid #1a3a20' }}
        >
          {error && (
            <div className="bg-red-900/50 border border-red-500/50 text-red-400 text-sm rounded-xl p-3">
              {error}
            </div>
          )}

          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Nueva contraseña"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleReset()}
              className="w-full text-white placeholder-slate-500 rounded-xl px-4 py-3 pr-12 outline-none"
              style={{ backgroundColor: '#0a1a0f', border: '1px solid #1a3a20' }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-lg"
              style={{ color: '#6b9e6e' }}
            >
              {showPassword ? '🙈' : '👁️'}
            </button>
          </div>

          <button
            onClick={handleReset}
            disabled={loading}
            className="w-full text-white font-semibold rounded-xl py-3 transition disabled:opacity-50"
            style={{ backgroundColor: '#2d6a35' }}
          >
            {loading ? 'Actualizando...' : '🔑 Actualizar contraseña'}
          </button>
        </div>
      </div>
    </div>
  )
}