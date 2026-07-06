import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useNavigate } from 'react-router-dom'

const NATIONALITIES = [
  'Peruana', 'Argentina', 'Boliviana', 'Brasileña', 'Chilena',
  'Colombiana', 'Costarricense', 'Cubana', 'Dominicana', 'Ecuatoriana',
  'Guatemalteca', 'Hondureña', 'Mexicana', 'Nicaragüense', 'Panameña',
  'Paraguaya', 'Salvadoreña', 'Uruguaya', 'Venezolana', 'Española',
  'Estadounidense', 'Otra'
]

type Profile = {
  full_name: string
  birth_date: string
  nationality: string
}

export default function Perfil() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [profile, setProfile] = useState<Profile>({
    full_name: '',
    birth_date: '',
    nationality: '',
  })
  const [isPremium, setIsPremium] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [totalPlants, setTotalPlants] = useState(0)
  const [memberSince, setMemberSince] = useState('')

  useEffect(() => { loadAll() }, [])

  const loadAll = async () => {
    if (!user) return

    // Cargar perfil
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profileData) {
      setProfile({
        full_name: profileData.full_name ?? '',
        birth_date: profileData.birth_date ?? '',
        nationality: profileData.nationality ?? '',
      })
    }

    // Cargar plan
    const { data: settings } = await supabase
      .from('user_settings')
      .select('is_premium')
      .eq('id', user.id)
      .single()

    setIsPremium(settings?.is_premium ?? false)

    // Contar plantas
    const { count } = await supabase
      .from('spaces')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .not('plant_id', 'is', null)

    setTotalPlants(count ?? 0)

    // Fecha de registro
    const date = new Date(user.created_at)
    setMemberSince(date.toLocaleDateString('es-PE', {
      day: '2-digit', month: 'long', year: 'numeric'
    }))

    setLoading(false)
  }

  const saveProfile = async () => {
    if (!user) return
    setSaving(true)

    await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        full_name: profile.full_name,
        birth_date: profile.birth_date || null,
        nationality: profile.nationality,
        updated_at: new Date().toISOString(),
      })

    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const getInitials = () => {
    if (profile.full_name) {
      return profile.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    }
    return user?.email?.[0].toUpperCase() ?? '?'
  }

  const getAge = () => {
    if (!profile.birth_date) return null
    const birth = new Date(profile.birth_date)
    const today = new Date()
    let age = today.getFullYear() - birth.getFullYear()
    const m = today.getMonth() - birth.getMonth()
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
    return age
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-32 rounded-2xl animate-pulse" style={{ backgroundColor: '#0f2317' }} />
        <div className="h-48 rounded-2xl animate-pulse" style={{ backgroundColor: '#0f2317' }} />
      </div>
    )
  }

  return (
    <div className="space-y-5">

      {/* HEADER */}
      <div>
        <h1 className="text-2xl font-bold">👤 Mi Perfil</h1>
        <p className="text-sm mt-1" style={{ color: '#6b9e6e' }}>
          Tu información personal
        </p>
      </div>

      {/* TARJETA DE PERFIL */}
      <div
        className="rounded-2xl p-5"
        style={{ backgroundColor: '#0f2317', border: '1px solid #1a3a20' }}
      >
        <div className="flex items-center gap-4">
          {/* AVATAR */}
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold shrink-0"
            style={{ backgroundColor: '#1a3a20', color: '#a3d9a5', border: '2px solid #2d6a35' }}
          >
            {getInitials()}
          </div>

          {/* INFO */}
          <div className="flex-1 min-w-0">
            <h2 className="font-bold text-lg text-white truncate">
              {profile.full_name || user?.email?.split('@')[0]}
            </h2>
            <p className="text-xs truncate" style={{ color: '#6b9e6e' }}>
              {user?.email}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <span
                className="text-xs px-2 py-0.5 rounded-full font-medium"
                style={{
                  backgroundColor: isPremium ? '#3a2a00' : '#1a3a20',
                  color: isPremium ? '#fbbf24' : '#a3d9a5',
                  border: `1px solid ${isPremium ? '#b45309' : '#2d6a35'}`
                }}
              >
                {isPremium ? '⭐ Premium' : '🌱 Free'}
              </span>
              {getAge() && (
                <span className="text-xs" style={{ color: '#6b9e6e' }}>
                  {getAge()} años
                </span>
              )}
            </div>
          </div>
        </div>

        {/* STATS */}
        <div className="grid grid-cols-2 gap-3 mt-4">
          <div
            className="rounded-xl p-3 text-center"
            style={{ backgroundColor: '#0a1a0f' }}
          >
            <p className="text-2xl font-bold text-green-400">{totalPlants}</p>
            <p className="text-xs mt-0.5" style={{ color: '#6b9e6e' }}>Plantas activas</p>
          </div>
          <div
            className="rounded-xl p-3 text-center"
            style={{ backgroundColor: '#0a1a0f' }}
          >
            <p className="text-xs font-bold text-white">{memberSince}</p>
            <p className="text-xs mt-0.5" style={{ color: '#6b9e6e' }}>Miembro desde</p>
          </div>
        </div>
      </div>

      {/* FORMULARIO */}
      <div
        className="rounded-2xl p-5 space-y-4"
        style={{ backgroundColor: '#0f2317', border: '1px solid #1a3a20' }}
      >
        <h3 className="font-semibold text-white">✏️ Editar información</h3>

        {/* NOMBRE */}
        <div>
          <label className="text-xs mb-1.5 block" style={{ color: '#6b9e6e' }}>
            Nombre completo
          </label>
          <input
            type="text"
            placeholder="Tu nombre completo"
            value={profile.full_name}
            onChange={e => setProfile({ ...profile, full_name: e.target.value })}
            className="w-full text-white placeholder-slate-500 rounded-xl px-4 py-3 outline-none"
            style={{ backgroundColor: '#0a1a0f', border: '1px solid #1a3a20' }}
            onFocus={e => e.target.style.borderColor = '#4ade80'}
            onBlur={e => e.target.style.borderColor = '#1a3a20'}
          />
        </div>

        {/* FECHA DE NACIMIENTO */}
        <div>
          <label className="text-xs mb-1.5 block" style={{ color: '#6b9e6e' }}>
            Fecha de nacimiento
          </label>
          <input
            type="date"
            value={profile.birth_date}
            onChange={e => setProfile({ ...profile, birth_date: e.target.value })}
            className="w-full text-white rounded-xl px-4 py-3 outline-none"
            style={{
              backgroundColor: '#0a1a0f',
              border: '1px solid #1a3a20',
              colorScheme: 'dark'
            }}
            onFocus={e => e.target.style.borderColor = '#4ade80'}
            onBlur={e => e.target.style.borderColor = '#1a3a20'}
          />
        </div>

        {/* NACIONALIDAD */}
        <div>
          <label className="text-xs mb-1.5 block" style={{ color: '#6b9e6e' }}>
            Nacionalidad
          </label>
          <select
            value={profile.nationality}
            onChange={e => setProfile({ ...profile, nationality: e.target.value })}
            className="w-full text-white rounded-xl px-4 py-3 outline-none"
            style={{
              backgroundColor: '#0a1a0f',
              border: '1px solid #1a3a20',
              colorScheme: 'dark'
            }}
            onFocus={e => e.target.style.borderColor = '#4ade80'}
            onBlur={e => e.target.style.borderColor = '#1a3a20'}
          >
            <option value="">Selecciona tu nacionalidad</option>
            {NATIONALITIES.map(n => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>

        {/* GUARDAR */}
        {saved && (
          <div
            className="rounded-xl px-4 py-3 text-sm text-center"
            style={{ backgroundColor: '#0a2a10', border: '1px solid #2d6a35', color: '#a3d9a5' }}
          >
            ✅ Perfil actualizado correctamente
          </div>
        )}

        <button
          onClick={saveProfile}
          disabled={saving}
          className="w-full text-white font-semibold rounded-xl py-3 transition disabled:opacity-50"
          style={{ backgroundColor: '#2d6a35' }}
        >
          {saving ? 'Guardando...' : '💾 Guardar cambios'}
        </button>
      </div>

      {/* SEGURIDAD */}
      <div
        className="rounded-2xl p-5 space-y-3"
        style={{ backgroundColor: '#0f2317', border: '1px solid #1a3a20' }}
      >
        <h3 className="font-semibold text-white">🔒 Seguridad</h3>
        <button
          onClick={() => navigate('/configuracion')}
          className="w-full flex items-center gap-3 rounded-xl px-4 py-3 transition text-left"
          style={{ backgroundColor: '#0a1a0f' }}
        >
          <span className="text-xl">⚙️</span>
          <div>
            <p className="text-sm font-medium text-white">Configuración</p>
            <p className="text-xs" style={{ color: '#6b9e6e' }}>Telegram, sensores y más</p>
          </div>
          <span className="ml-auto" style={{ color: '#6b9e6e' }}>›</span>
        </button>
      </div>

    </div>
  )
}