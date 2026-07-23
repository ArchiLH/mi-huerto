import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'

export default function Configuracion() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [profileName, setProfileName] = useState('')

  useEffect(() => {
    if (!user) return
    const fetchProfileName = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single()
      
      if (data?.full_name) {
        setProfileName(data.full_name)
      } else {
        setProfileName(user.email?.split('@')[0] ?? 'Usuario')
      }
    }
    fetchProfileName()
  }, [user])

  // Obtener dos iniciales (Ej: "Jesus Dominguez" -> "JD")
  const getInitials = (name: string) => {
    if (!name) return 'U'
    const parts = name.trim().split(/\s+/)
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase()
    }
    return parts[0][0].toUpperCase()
  }

  const userInitials = getInitials(profileName || user?.email || '')
  const displayName = profileName || user?.email?.split('@')[0] || 'Usuario'

  return (
    <div className="w-full min-h-screen bg-[#f4f7f5] p-3 sm:p-6 lg:p-8 flex justify-center">
      <div className="w-full max-w-[1200px] space-y-6 pb-16 font-sans text-slate-800">

        {/* HEADER DE AJUSTES */}
        <div className="space-y-1 bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-xs">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
            Ajustes
          </span>
          <h1 className="text-xl sm:text-2xl font-black text-[#1e293b] tracking-tight flex items-center gap-2">
            Configuración ⚙️
          </h1>
          <p className="text-xs text-slate-400 font-semibold">
            Gestiona los detalles de tu cuenta y dispositivos
          </p>
        </div>

        {/* CONTENEDOR CENTRAL */}
        <div className="max-w-xl mx-auto space-y-5">
          
          {/* TARJETA DE USUARIO (Clickeable para ir al Perfil) */}
          <div 
            onClick={() => navigate('/perfil')}
            className="bg-white rounded-[2rem] p-5 sm:p-6 flex items-center justify-between gap-4 border border-[#51e29d]/60 shadow-[0_4px_20px_-4px_rgba(81,226,157,0.12)] hover:border-emerald-400 transition-all cursor-pointer group"
          >
            <div className="flex items-center gap-4 min-w-0">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xs shrink-0 bg-[#e2faee] text-[#009660] border border-emerald-200 shadow-xs">
                {userInitials}
              </div>
              <div className="min-w-0">
                <p className="font-extrabold text-xs sm:text-sm text-slate-800 truncate group-hover:text-emerald-700 transition-colors">
                  {displayName}
                </p>
                <p className="text-[10px] text-slate-400 font-bold truncate">
                  {user?.email}
                </p>
              </div>
            </div>
            <span className="text-slate-400 group-hover:translate-x-1 transition-transform font-bold text-sm">❯</span>
          </div>

          {/* HERRAMIENTAS */}
          <div className="bg-white rounded-[2rem] p-5 sm:p-6 border border-[#51e29d]/60 shadow-[0_4px_20px_-4px_rgba(81,226,157,0.12)] space-y-3">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 pl-1">
              🛠️ Herramientas y Accesos
            </p>

            <div className="space-y-2">
              {[
                { icon: '👤', label: 'Editar perfil y datos', desc: 'Cambia tu nombre, país y fecha', path: '/perfil' },
                { icon: '🧪', label: 'Simulador de lecturas', desc: 'Envía datos de prueba', path: '/simulador' },
                { icon: '📈', label: 'Historial de lecturas', desc: 'Ve la evolución de tus plantas', path: '/reportes' },
                { icon: '📡', label: 'Gestionar sensores', desc: 'Configura tus dispositivos', path: '/sensores' },
              ].map((item, i) => (
                <button
                  key={i}
                  onClick={() => navigate(item.path)}
                  className="w-full flex items-center gap-3 px-4 py-3 bg-[#f8faf9] hover:bg-slate-100/80 rounded-2xl border border-slate-100 transition-all text-left cursor-pointer shadow-3xs"
                >
                  <span className="text-xl shrink-0">{item.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-black text-slate-800">{item.label}</p>
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
            className="w-full py-4 rounded-2xl text-xs font-black bg-red-50 text-red-600 border border-red-200/80 hover:bg-red-100 transition shadow-xs cursor-pointer"
          >
            🚪 Cerrar sesión
          </button>

        </div>

      </div>
    </div>
  )
}