import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import AlertPopup from './AlertPopup'
import Chatbot from './Chatbot'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { handlePurchase } from '../lib/stripe' // ← Importamos tu función de Stripe

const navItems = [
  { to: '/', icon: '🏠', label: 'Mi Huerto' },
  { to: '/alertas', icon: '🔔', label: 'Alertas' },
  { to: '/reportes', icon: '📊', label: 'Historial' },
  { to: '/plantas', icon: '🌿', label: 'Mis Plantas' },
  { to: '/configuracion', icon: '📡', label: 'Sensores' },
]

export default function Layout({ children }: { children: React.ReactNode }) {
  const { signOut, user } = useAuth()
  const navigate = useNavigate()

  const [showChat, setShowChat] = useState(false)
  const [profileName, setProfileName] = useState('')
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isPremium, setIsPremium] = useState(false)
  const [isRedirecting, setIsRedirecting] = useState(false) // ← Estado de carga para Stripe

  useEffect(() => {
    if (!user) return
    
    const loadUserData = async () => {
      // Cargar Nombre de Perfil
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single()

      if (!profileError && profileData?.full_name) {
        setProfileName(profileData.full_name)
      } else {
        setProfileName(user.email?.split('@')[0] ?? 'Usuario')
      }

      // Cargar Estado Premium real de Base de Datos
      const { data: settingsData } = await supabase
        .from('user_settings')
        .select('is_premium')
        .eq('id', user.id)
        .single()

      setIsPremium(settingsData?.is_premium ?? false)
    }

    loadUserData()
  }, [user])

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  const getInitials = () => {
    if (profileName) {
      return profileName
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    }
    return user?.email?.[0]?.toUpperCase() ?? '?'
  }

  const handleStripeCheckout = async () => {
    if (!user || !user.email) return
    setIsMenuOpen(false)
    try {
      setIsRedirecting(true)
      await handlePurchase(user.id, user.email)
    } catch (err) {
      console.error('Error al iniciar compra con Stripe:', err)
    } finally {
      setIsRedirecting(false)
    }
  }

  const displayName = profileName || user?.email || 'Usuario'

  return (
    <div className="min-h-screen w-full bg-white text-slate-800 font-sans antialiased relative">
      
      {/* HEADER SUPERIOR */}
      <header className="bg-white border-b border-slate-100/80 px-4 py-3 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <button onClick={() => setIsMenuOpen(true)} className="p-1 text-slate-700 transition active:opacity-50">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="w-7 h-7 bg-emerald-50 rounded-lg flex items-center justify-center border border-emerald-100">
            <span className="text-sm">🪴</span>
          </div>
        </div>
        
        {/* BOTÓN CIRCULAR DE PERFIL */}
        <button
          onClick={() => navigate('/perfil')}
          className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-black transition-transform active:scale-95 shadow-3xs cursor-pointer"
          style={{
            backgroundColor: '#e2faee', 
            color: '#0d2318',           
            border: '1.5px solid #4ade80' 
          }}
        >
          {getInitials()}
        </button>
      </header>

      {/* OVERLAY DEL MENU SIDEBAR */}
      {isMenuOpen && <div onClick={() => setIsMenuOpen(false)} className="fixed inset-0 bg-black/50 z-50 backdrop-blur-xs" />}

      {/* MENÚ LATERAL HAMBURGUESA */}
      <aside className={`fixed top-0 bottom-0 left-0 w-[290px] bg-[#113824] text-white z-50 flex flex-col justify-between p-5 transition-transform duration-300 ${isMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="space-y-6">
          <div className="flex items-center gap-3 pb-2">
            <div className="w-12 h-12 bg-white rounded-2xl p-1.5 flex items-center justify-center shadow-md">
              <span className="text-2xl">🪴</span>
            </div>
            <div>
              <h2 className="font-black text-base tracking-tight leading-tight">Secret Garden</h2>
              <p className="text-[11px] text-emerald-300/80 font-medium">Jardín Inteligente</p>
            </div>
          </div>
          <hr className="border-emerald-800/60" />
          <div className="space-y-3">
            <p className="text-[10px] font-bold tracking-widest text-emerald-400/70 uppercase pl-2">Navegación</p>
            <nav className="space-y-1">
              {navItems.map(item => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  onClick={() => setIsMenuOpen(false)}
                  className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${isActive ? 'bg-[#184e32] text-white' : 'text-emerald-100/70 hover:bg-[#15432b]'}`}
                >
                  <span className="text-base">{item.icon}</span>
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </nav>
          </div>
        </div>
        <div className="space-y-4 pt-4 border-t border-emerald-800/60">
          
          {/* BANNER PREMIUM DINÁMICO DENTRO DEL MENÚ LATERAL */}
          {isPremium ? (
            <div className="bg-[#244b36] text-amber-400 text-xs font-extrabold px-3 py-2 rounded-xl flex items-center justify-between">
              <span>👑 Plan Premium</span>
              <span className="text-[10px] bg-amber-400 text-emerald-900 px-1.5 py-0.5 rounded font-black">ACTIVO</span>
            </div>
          ) : (
            <button 
              onClick={handleStripeCheckout}
              disabled={isRedirecting}
              className="w-full text-left bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white text-xs font-extrabold px-3 py-2.5 rounded-xl flex items-center justify-between transition-transform active:scale-98 shadow-sm cursor-pointer disabled:opacity-50"
            >
              <span>{isRedirecting ? '⚡ Cargando...' : '⚡ Obtener Premium'}</span>
              <span className="text-[10px] text-emerald-100 underline font-black">Stripe ›</span>
            </button>
          )}

          <div className="bg-[#184a30] rounded-xl p-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-emerald-700 text-emerald-200 flex items-center justify-center font-bold text-sm shrink-0">{displayName[0]?.toUpperCase()}</div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-white truncate">{displayName}</p>
              <p className="text-[10px] text-emerald-300/60 truncate">{user?.email}</p>
            </div>
          </div>
          <button onClick={handleSignOut} className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-emerald-300/80">Cerrar sesión</button>
        </div>
      </aside>

      {/* CONTENIDO DE LAS VISTAS */}
      <main className="w-full min-h-[calc(100vh-60px)] bg-white">
        <div className="max-w-md mx-auto">{children}</div>
      </main>

      {/* COMPONENTE CHATBOT VENTANA FLOTANTE */}
      {showChat && (
        <div className="fixed bottom-24 right-5 left-5 sm:left-auto sm:w-[360px] z-50 animate-fadeIn">
          <Chatbot onClose={() => setShowChat(false)} />
        </div>
      )}

      {/* BOTÓN FLOTANTE DINÁMICO */}
      <div className="fixed bottom-5 right-5 z-50">
        {showChat ? (
          <button
            onClick={() => setShowChat(false)}
            className="w-14 h-14 bg-[#009660] text-white rounded-full shadow-lg flex items-center justify-center text-xl transition-all transform active:scale-90"
          >
            ✕
          </button>
        ) : (
          <button
            onClick={() => setShowChat(true)}
            className="w-14 h-14 bg-white rounded-full shadow-md border border-slate-100 flex items-center justify-center transition-all transform active:scale-90 relative"
          >
            <img src="/logo.png" alt="Botón Chat" className="w-9 h-9 object-contain" />
            <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-amber-400 rounded-full border border-white"></span>
          </button>
        )}
      </div>

      <AlertPopup />
    </div>
  )
}