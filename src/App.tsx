import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './hooks/useAuth'
import Login from './pages/Login'
import Layout from './components/Layout'
import MiHuerto from './pages/MiHuerto'
import Espacios from './pages/Espacios'
import Alertas from './pages/Alertas'
import Sensores from './pages/Sensores'
import Historial from './pages/Historial'
import Plantas from './pages/Plantas'
import Simulador from './pages/Simulador'

function AppRoutes() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="text-center space-y-3">
          <div className="text-5xl animate-bounce">🌱</div>
          <p className="text-slate-400 text-sm">Cargando tu huerto...</p>
        </div>
      </div>
    )
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