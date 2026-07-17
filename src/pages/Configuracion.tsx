import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useNavigate } from 'react-router-dom'

export default function Configuracion() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  return (
    <div className="w-full bg-[#f4f7f5]/40 min-h-screen px-5 pt-6 space-y-5 max-w-md mx-auto pb-10 font-sans text-slate-800">

      {/* HEADER DE AJUSTES */}
      <div className="space-y-1">
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
          Ajustes
        </span>
        <h1 className="text-2xl font-black text-[#1e293b] tracking-tight flex items-center gap-2">
          Configuración ⚙️
        </h1>
        <p className="text-xs text-slate-400 font-semibold">
          Gestiona los detalles de tu cuenta
        </p>
      </div>

      {/* TARJETA DE USUARIO */}
      <div className="bg-white rounded-[2rem] p-5 flex items-center gap-4 border border-slate-100/85 shadow-3xs">
        <div className="w-12 h-12 rounded-full flex items-center justify-center font-black text-lg shrink-0 bg-[#e2faee] text-[#009660]">
          {user?.email?.[0].toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="font-extrabold text-xs text-slate-800 truncate">
            {user?.email?.split('@')[0]}
          </p>
          <p className="text-[10px] text-slate-400 font-bold truncate">
            {user?.email}
          </p>
        </div>
      </div>

      {/* HERRAMIENTAS */}
      <div className="bg-white rounded-[2rem] p-6 border border-slate-100/85 shadow-3xs space-y-3">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
          🛠️ Herramientas
        </p>

        <div className="space-y-2">
          {[
            { icon: '🧪', label: 'Simulador de lecturas', desc: 'Envía datos de prueba', path: '/simulador' },
            { icon: '📈', label: 'Historial de lecturas', desc: 'Ve la evolución de tus plantas', path: '/reportes' },
            { icon: '📡', label: 'Gestionar sensores', desc: 'Configura tus dispositivos', path: '/configuracion' },
          ].map((item, i) => (
            <button
              key={i}
              onClick={() => navigate(item.path)}
              className="w-full flex items-center gap-3 px-4 py-3 bg-[#f8faf9] hover:bg-slate-100 rounded-xl border border-slate-100 transition-all text-left"
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
        className="w-full py-4 rounded-2xl text-xs font-black bg-red-50 text-red-600 border border-red-100 hover:bg-red-100 transition shadow-3xs"
      >
        🚪 Cerrar sesión
      </button>

    </div>
  )
}