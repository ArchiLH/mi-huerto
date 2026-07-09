import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './hooks/useAuth'
import { useEffect } from 'react'
import { App as CapApp } from '@capacitor/app'
import Login from './pages/Login'
import Layout from './components/Layout'
import MiHuerto from './pages/MiHuerto'
import Espacios from './pages/Espacios'
import Alertas from './pages/Alertas'
import Sensores from './pages/Sensores'
import Historial from './pages/Historial'
import Plantas from './pages/Plantas'
import Simulador from './pages/Simulador'
import Configuracion from './pages/Configuracion'
import Dashboard from './pages/Dashboard'
import Success from './pages/Success'
import Perfil from './pages/Perfil'
import ResetPassword from './pages/ResetPassword'


function AppRoutes() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()

  // Deep link handler para APK
  useEffect(() => {
    CapApp.addListener('appUrlOpen', (data) => {
      const url = data.url
      if (url.includes('reset-password') || url.includes('type=recovery')) {
        const hash = url.includes('#') ? '#' + url.split('#')[1] : ''
        window.location.href = '/reset-password' + hash
      }
      if (url.includes('success') && url.includes('user_id')) {
        const params = url.split('?')[1] ?? ''
        navigate(`/success?${params}`)
        
      }
    })

    return () => {
      CapApp.removeAllListeners()
    }
  }, [])

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: '#0a1a0f' }}
      >
        <div className="text-center space-y-3">
          <div className="text-5xl animate-bounce">🌱</div>
          <p className="text-sm" style={{ color: '#6b9e6e' }}>
            Cargando tu huerto...
          </p>
        </div>
      </div>
    )
  }

  // Páginas sin Layout
  if (window.location.pathname === '/success') {
    return <Success />
  }

  if (window.location.pathname === '/reset-password') {
    return <ResetPassword />
  }

  if (!user) return <Login />

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<MiHuerto />} />
        <Route path="/espacios/:id" element={<Espacios />} />
        <Route path="/alertas" element={<Alertas />} />
        <Route path="/sensores" element={<Sensores />} />
        <Route path="/historial" element={<Historial />} />
        <Route path="/plantas" element={<Plantas />} />
        <Route path="/simulador" element={<Simulador />} />
        <Route path="/configuracion" element={<Configuracion />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/perfil" element={<Perfil />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Layout>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}