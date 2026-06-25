import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

const navItems = [
  { to: '/', icon: '🏡', label: 'Huerto' },
  { to: '/plantas', icon: '🌿', label: 'Plantas' },
  { to: '/sensores', icon: '📡', label: 'Sensores' },
  { to: '/alertas', icon: '🔔', label: 'Alertas' },
  { to: '/historial', icon: '📊', label: 'Historial' },
  { to: '/simulador', icon: '⚙️', label: 'Simulador' },
]

export default function Layout({ children }: { children: React.ReactNode }) {
  const { signOut } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">

      {/* TOP BAR */}
      <header className="sticky top-0 z-10 bg-slate-950/80 backdrop-blur border-b border-slate-800 px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🌿</span>
          <span className="font-bold text-lg">Mi Huerto</span>
        </div>
        <button
          onClick={handleSignOut}
          className="text-slate-400 hover:text-white text-sm transition"
        >
          Salir
        </button>
      </header>

      {/* CONTENT */}
      <main className="p-5 pb-28 max-w-2xl mx-auto">
        {children}
      </main>

      {/* BOTTOM NAV */}
      <nav className="fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 px-2 py-2">
        <div className="flex justify-around max-w-2xl mx-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 px-3 py-1 rounded-xl transition text-xs ${
                  isActive
                    ? 'text-green-400'
                    : 'text-slate-500 hover:text-slate-300'
                }`
              }
            >
              <span className="text-xl">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>

    </div>
  )
}