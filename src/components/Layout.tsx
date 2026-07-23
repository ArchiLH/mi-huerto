import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import AlertPopup from './AlertPopup'
import Chatbot from './Chatbot'
import { useState, useEffect } from 'react'
import { App as CapacitorApp } from '@capacitor/app'
import { supabase } from '../lib/supabase'
import { handlePurchase } from '../lib/stripe'

const navItems = [
  { to: '/', icon: '🏠', label: 'Mi Huerto' },
  { to: '/alertas', icon: '🔔', label: 'Alertas' },
  { to: '/reportes', icon: '📊', label: 'Historial' },
  { to: '/plantas', icon: '🌿', label: 'Mis Plantas' },
  { to: '/sensores', icon: '📡', label: 'Sensores' },
  { to: '/configuracion', icon: '⚙️', label: 'Configuración' },
]

export default function Layout({ children }: { children: React.ReactNode }) {
  const { signOut, user } = useAuth()
  const navigate = useNavigate()

  const [showChat, setShowChat] = useState(false)
  const [profileName, setProfileName] = useState('')
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    if (typeof window === 'undefined') return true
    return window.innerWidth >= 1024
  })
  const [isPremium, setIsPremium] = useState(false)
  const [isRedirecting, setIsRedirecting] = useState(false)

  const refreshPremiumStatus = async () => {
    if (!user) return
    const { data } = await supabase
      .from('user_settings')
      .select('is_premium')
      .eq('id', user.id)
      .single()

    if (data) {
      setIsPremium(data.is_premium)
    }
  }

  useEffect(() => {
    if (!user) return

    const loadUserData = async () => {
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
      refreshPremiumStatus()
    }

    loadUserData()

    const channel = supabase
      .channel(`user-settings-changes-${user.id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'user_settings', filter: `id=eq.${user.id}` },
      (payload) => {
        const nuevoEstado = (payload.new as { is_premium?: boolean })?.is_premium
        if (typeof nuevoEstado === 'boolean') {
          setIsPremium(nuevoEstado)
        }
      })
      .subscribe()

    const setupAppListener = async () => {
      const listener = await CapacitorApp.addListener('appStateChange', ({ isActive }) => {
        if (isActive) {
          refreshPremiumStatus()
        }
      })
      return listener
    }

    let appListener: any;
    setupAppListener().then(l => appListener = l)

    return () => {
      supabase.removeChannel(channel)
      if (appListener) appListener.remove()
    }
  }, [user])

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  const handleStripeCheckout = async () => {
    if (!user || !user.email) return
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

  const getInitials = (name: string) => {
    if (!name) return 'U'
    const parts = name.trim().split(/\s+/)
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase()
    }
    return parts[0][0].toUpperCase()
  }

  const userInitials = getInitials(displayName)

  return (
    <div className="min-h-screen w-full bg-[#e2f3ec] text-slate-800 font-sans antialiased flex overflow-x-hidden">

      {/* OVERLAY MÓVIL */}
      {isSidebarOpen && (
        <div
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 bg-black/50 z-40 backdrop-blur-xs lg:hidden"
        />
      )}

      {/* SIDEBAR */}
      <aside
        className={`fixed lg:relative inset-y-0 left-0 z-50 bg-[#113824] text-white flex flex-col shrink-0 transition-all duration-300 ease-in-out overflow-hidden ${
          isSidebarOpen 
            ? 'w-[240px] translate-x-0' 
            : 'w-[240px] -translate-x-full lg:w-0 lg:translate-x-0'
        }`}
      >
        <div className="w-[240px] h-full flex flex-col">
          <div className="flex-1 min-h-0 overflow-y-auto p-5 space-y-6">
            <button onClick={() => { if (window.innerWidth < 1024) setIsSidebarOpen(false); navigate('/') }} className="flex items-center gap-3 pb-2 text-left transition-transform active:scale-95 cursor-pointer">
              <div className="w-11 h-11 bg-white rounded-2xl p-1.5 flex items-center justify-center shadow-md shrink-0">
                <img src="/logo.png" className="w-full h-full object-contain" />
              </div>
              <div>
                <h2 className="font-black text-base tracking-tight leading-tight">Secret Garden</h2>
                <p className="text-[11px] text-emerald-300/80 font-medium">Jardín Inteligente</p>
              </div>
            </button>
            <hr className="border-emerald-800/60" />
            <div>
              <p className="text-[10px] font-black tracking-widest text-emerald-400/60 mb-2 pl-1">NAVEGACIÓN</p>
              <nav className="space-y-1">
                {navItems.map(item => (
                  <NavLink 
                    key={item.to} 
                    to={item.to} 
                    end={item.to === '/'} 
                    onClick={() => { if (window.innerWidth < 1024) setIsSidebarOpen(false) }}
                    className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${isActive ? 'bg-[#184e32]' : 'hover:bg-[#15432b]'}`}
                  >
                    <span className="text-base">{item.icon}</span><span>{item.label}</span>
                  </NavLink>
                ))}
              </nav>
            </div>
          </div>

          <div className="shrink-0 p-5 pt-4 space-y-3 border-t border-emerald-800/60">
            {isPremium ? (
              <div className="bg-[#244b36] text-amber-400 text-xs font-extrabold px-3 py-2 rounded-xl flex items-center justify-between">
                <span>👑 Plan Premium</span><span className="text-[10px] bg-amber-400 text-emerald-900 px-1.5 rounded font-black">ACTIVO</span>
              </div>
            ) : (
              <button onClick={handleStripeCheckout} disabled={isRedirecting} className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-xs font-extrabold px-3 py-2.5 rounded-xl cursor-pointer">
                {isRedirecting ? '⚡ Cargando...' : '⚡ Obtener Premium'}
              </button>
            )}
            
            <div 
              onClick={() => navigate('/perfil')}
              className="bg-[#184a30] rounded-xl p-3 flex items-center gap-3 cursor-pointer hover:bg-[#15432b] transition-colors"
            >
              <div className="w-9 h-9 rounded-full bg-emerald-700 text-emerald-200 flex items-center justify-center font-bold text-xs shrink-0">{userInitials}</div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-white truncate">{displayName}</p>
                <p className="text-[10px] text-emerald-300/60 truncate">{user?.email}</p>
              </div>
            </div>

            <button onClick={handleSignOut} className="w-full text-left px-3 py-2 text-xs font-bold text-emerald-300/80 hover:bg-[#15432b] rounded-lg transition-colors cursor-pointer">Cerrar sesión</button>
          </div>
        </div>
      </aside>

      {/* CONTENEDOR DERECHO */}
      <div className="min-h-screen flex-1 flex flex-col min-w-0 relative bg-[#e2f3ec]">
        <header className="bg-white border-b border-slate-100/80 px-4 py-3 flex items-center justify-between sticky top-0 z-40">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(v => !v)}
              aria-label="Toggle Sidebar"
              className="inline-flex items-center justify-center h-9 w-9 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 active:bg-slate-200 shadow-sm cursor-pointer"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 pointer-events-none shrink-0">
                <rect width="18" height="18" x="3" y="3" rx="2" />
                <path d="M9 3v18" />
              </svg>
              <span className="sr-only">Toggle Sidebar</span>
            </button>
            <button onClick={() => navigate('/')} className="flex items-center gap-2 transition-transform active:scale-95 cursor-pointer">
              <img src="/logo.png" alt="Secret Garden" className="w-7 h-7 object-contain" />
              <span className="font-black text-sm text-slate-700">Secret Garden</span>
            </button>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Sistema activo
            </div>

            <button
              onClick={() => navigate('/perfil')}
              className="w-9 h-9 rounded-full flex items-center justify-center font-black text-xs tracking-tighter shrink-0 bg-[#e2faee] text-[#009660] border border-emerald-200 shadow-xs hover:scale-105 transition-transform cursor-pointer"
              title="Ir a mi perfil"
            >
              {userInitials}
            </button>
          </div>
        </header>

        {/* CONTENIDO PRINCIPAL CENTRADO Y RESPONSIVE */}
        <main className="w-full flex-1 flex flex-col justify-start items-center bg-[#e2f3ec]">
          <div className="w-full max-w-[1500px] px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
            {children}
          </div>
        </main>

        {/* CHATBOT Y BOTONES FLOTANTES */}
        {showChat && (
          <div className="fixed bottom-24 right-4 left-4 sm:left-auto sm:right-5 sm:w-[360px] z-50 animate-fadeIn">
            <Chatbot onClose={() => setShowChat(false)} />
          </div>
        )}

        <div className="fixed bottom-5 right-5 z-50">
          <button onClick={() => setShowChat(!showChat)} className="w-14 h-14 bg-white rounded-full shadow-md border border-slate-100 flex items-center justify-center transition-all transform active:scale-90 relative cursor-pointer">
            <img src="/logo.png" className="w-9 h-9 object-contain" />
            <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-amber-400 rounded-full border border-white"></span>
          </button>
        </div>

        <AlertPopup />
      </div>
    </div>
  )
}