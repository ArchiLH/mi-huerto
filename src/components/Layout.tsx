import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import AlertPopup from './AlertPopup'
import Chatbot from './Chatbot'
import { useState } from 'react'

const navItems = [
  { to: '/', icon: '🏡', label: 'Huerto' },
  { to: '/plantas', icon: '🌿', label: 'Plantas' },
  { to: '/dashboard', icon: '📊', label: 'Dashboard' },
  { to: '/alertas', icon: '🔔', label: 'Alertas' },
  { to: '/configuracion', icon: '⚙️', label: 'Config' },
]


export default function Layout({ children }: { children: React.ReactNode }) {
  const { signOut } = useAuth()
  const navigate = useNavigate()
  const [showChat, setShowChat] = useState(false)

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  return (
    <div className="min-h-screen text-white" style={{ backgroundColor: '#0a1a0f' }}>

      {/* TOP BAR */}
      <header
        className="sticky top-0 z-10 backdrop-blur border-b px-5 py-3 flex items-center justify-between"
        style={{ backgroundColor: '#0a1a0faa', borderColor: '#1a3a20' }}
      >
        <div className="flex items-center gap-2">
          <span className="text-2xl">🌿</span>
          <span className="font-bold text-lg" style={{ color: '#a3d9a5' }}>Mi Huerto</span>
        </div>

        <div className="flex items-center gap-3">
          {/* BOTÓN CHATBOT */}
          <button
            onClick={() => setShowChat(true)}
            className="transition hover:scale-110 text-xl"
            title="Asistente IA"
          >
            🤖
          </button>
          <button
            onClick={handleSignOut}
            className="text-sm transition"
            style={{ color: '#6b9e6e' }}
          >
            Salir
          </button>
        </div>
      </header>

      {/* CONTENT */}
      <main className="p-5 pb-28 max-w-2xl mx-auto">
        {children}
      </main>

      {/* BOTTOM NAV */}
      <nav
        className="fixed bottom-0 left-0 right-0 border-t px-2 py-2"
        style={{ backgroundColor: '#0f2317', borderColor: '#1a3a20' }}
      >
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

      {/* CHATBOT */}
      {showChat && <Chatbot onClose={() => setShowChat(false)} />}

      {/* ALERTA EMERGENTE */}
      <AlertPopup />

    </div>
  )
}