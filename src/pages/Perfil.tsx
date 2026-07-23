import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { usePremium } from '../context/PremiumContext'
import { useNavigate } from 'react-router-dom'
import { handlePurchase } from '../lib/stripe'

const COUNTRIES = [
  { name: 'Perú', flag: '🇵🇪' },
  { name: 'Argentina', flag: '🇦🇷' },
  { name: 'Bolivia', flag: '🇧🇴' },
  { name: 'Brasil', flag: '🇧🇷' },
  { name: 'Chile', flag: '🇨🇱' },
  { name: 'Colombia', flag: '🇨🇴' },
  { name: 'Ecuador', flag: '🇪🇨' },
  { name: 'México', flag: '🇲🇽' },
  { name: 'España', flag: '🇪🇸' },
  { name: 'Estados Unidos', flag: '🇺🇸' },
  { name: 'Venezuela', flag: '🇻🇪' },
  { name: 'Uruguay', flag: '🇺🇾' },
  { name: 'Paraguay', flag: '🇵🇾' },
  { name: 'Otro', flag: '🌎' },
]

type Profile = {
  full_name: string
  birth_date: string
  country: string
  flag: string
}

export default function Perfil() {
  const { user } = useAuth()
  const { isPremium } = usePremium()
  const navigate = useNavigate()

  const [profile, setProfile] = useState<Profile>({
    full_name: '',
    birth_date: '',
    country: '',
    flag: ''
  })

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [totalPlants, setTotalPlants] = useState(0)
  const [memberSince, setMemberSince] = useState('')
  const [isRedirecting, setIsRedirecting] = useState(false)

  useEffect(() => {
    loadAll()
  }, [user])

  const loadAll = async () => {
    if (!user) return

    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profileData) {
      setProfile({
        full_name: profileData.full_name ?? '',
        birth_date: profileData.birth_date ?? '',
        country: profileData.country ?? '',
        flag: profileData.flag ?? ''
      })
    }

    const { count } = await supabase
      .from('spaces')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .not('plant_id', 'is', null)

    setTotalPlants(count ?? 0)

    setMemberSince(
      new Date(user.created_at)
        .toLocaleDateString(
          'es-PE',
          {
            day: '2-digit',
            month: 'long',
            year: 'numeric'
          }
        )
    )

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
        country: profile.country,
        flag: profile.flag,
        updated_at: new Date().toISOString()
      })

    setSaving(false)
    setSaved(true)

    setTimeout(() => {
      setSaved(false)
    }, 3000)
  }

  const handleStripeCheckout = async () => {
    if (!user || !user.email || isRedirecting) return
    try {
      setIsRedirecting(true)
      await handlePurchase(user.id, user.email)
    } catch (err) {
      console.error('Error al redirigir a Stripe:', err)
    } finally {
      setIsRedirecting(false)
    }
  }

  const getInitials = () => {
    if (profile.full_name) {
      const parts = profile.full_name.trim().split(/\s+/)
      if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase()
      }
      return parts[0][0].toUpperCase()
    }
    return user?.email?.[0]?.toUpperCase() ?? '?'
  }

  const getAge = () => {
    if (!profile.birth_date) return null

    const birth = new Date(profile.birth_date)
    const today = new Date()

    let age = today.getFullYear() - birth.getFullYear()
    const month = today.getMonth() - birth.getMonth()

    if (month < 0 || (month === 0 && today.getDate() < birth.getDate())) {
      age--
    }
    return age
  }

  if (loading) {
    return (
      <div className="w-full min-h-[60vh] flex flex-col justify-center items-center space-y-4 bg-[#f4f7f5]">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-bold text-slate-400">Cargando perfil...</p>
      </div>
    )
  }

  return (
    <div className="w-full min-h-screen bg-[#f4f7f5] p-3 sm:p-6 lg:p-8 flex justify-center">
      <div className="w-full max-w-[1200px] space-y-6 pb-16 font-sans text-slate-800">

        {/* HEADER DE LA PÁGINA */}
        <div className="space-y-1 bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-xs">
          <h1 className="text-xl sm:text-2xl font-black text-[#1e293b] tracking-tight">
            Mi Perfil 👤
          </h1>
          <p className="text-xs text-slate-400 font-semibold leading-relaxed">
            Gestiona los detalles de tu cuenta de Secret Garden
          </p>
        </div>

        {/* DISTRIBUCIÓN EN 2 COLUMNAS PARA PC (O 1 COLUMNA EN MÓVIL) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* COLUMNA IZQUIERDA: RESUMEN DE USUARIO Y STATS (Ocupa 5 columnas en PC) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white rounded-[2rem] border border-[#51e29d]/60 p-5 sm:p-6 flex flex-col gap-5 shadow-[0_4px_20px_-4px_rgba(81,226,157,0.12)]">
              <div className="flex gap-4 items-center">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center text-xl sm:text-2xl font-black shrink-0 border border-emerald-200 bg-[#e2faee] text-[#009660] shadow-xs">
                  {getInitials()}
                </div>

                <div className="min-w-0 flex-1">
                  <h2 className="font-extrabold text-slate-800 text-sm sm:text-base truncate leading-tight">
                    {profile.full_name || 'Usuario'}
                  </h2>
                  <p className="text-[11px] text-slate-400 font-bold truncate">
                    {user?.email}
                  </p>

                  {profile.country && (
                    <p className="text-[11px] mt-1 text-[#009660] font-black flex items-center gap-1">
                      <span>{profile.flag}</span> {profile.country}
                    </p>
                  )}

                  <div className="mt-2.5 flex items-center gap-2 flex-wrap">
                    {isPremium ? (
                      <span className="text-[9px] font-black px-2.5 py-1 rounded-full uppercase leading-none shadow-xs bg-amber-100/60 text-amber-600 border border-amber-200">
                        👑 Premium
                      </span>
                    ) : (
                      <button
                        onClick={handleStripeCheckout}
                        disabled={isRedirecting}
                        className="text-[9px] font-black px-2.5 py-1 rounded-full uppercase leading-none shadow-xs bg-emerald-100 text-[#009660] border border-emerald-200 hover:bg-emerald-200 transition-all cursor-pointer flex items-center gap-1 disabled:opacity-60"
                      >
                        {isRedirecting ? '⚡ Cargando...' : '⚡ Obtener Premium'}
                      </button>
                    )}
                    
                    {getAge() && (
                      <span className="text-[10px] text-slate-400 font-bold">
                        · {getAge()} años
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* STATS */}
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                <div className="rounded-2xl p-3.5 text-center bg-[#f8faf9] border border-slate-100 shadow-xs">
                  <p className="text-xl text-[#009660] font-black">
                    {totalPlants}
                  </p>
                  <p className="text-[10px] text-slate-400 font-bold mt-0.5">
                    Plantas activas
                  </p>
                </div>

                <div className="rounded-2xl p-3.5 text-center bg-[#f8faf9] border border-slate-100 shadow-xs flex flex-col justify-center">
                  <p className="text-[10px] text-slate-700 font-extrabold leading-tight">
                    {memberSince}
                  </p>
                  <p className="text-[10px] text-slate-400 font-bold mt-1">
                    Miembro desde
                  </p>
                </div>
              </div>
            </div>

            {/* BOTÓN CONFIGURACIÓN */}
            <button
              onClick={() => navigate('/configuracion')}
              className="w-full p-4 rounded-2xl bg-white border border-[#51e29d]/60 hover:bg-slate-50 flex justify-between items-center transition-colors shadow-[0_4px_20px_-4px_rgba(81,226,157,0.12)] cursor-pointer text-xs font-black text-slate-700"
            >
              <span className="flex items-center gap-2">⚙️ Configuración y Sensores</span>
              <span className="text-slate-400">❯</span>
            </button>
          </div>

          {/* COLUMNA DERECHA: FORMULARIO DE EDICIÓN (Ocupa 7 columnas en PC) */}
          <div className="lg:col-span-7">
            <div className="bg-white rounded-[2rem] border border-[#51e29d]/60 p-6 sm:p-8 space-y-4 shadow-[0_4px_20px_-4px_rgba(81,226,157,0.12)]">
              <h3 className="text-xs text-[#009660] font-black tracking-wider uppercase pl-1">
                ✏️ Editar Información
              </h3>

              {/* Campo: Nombre completo */}
              <div className="space-y-1.5">
                <label className="block text-[11px] text-slate-400 font-bold">
                  Nombre completo
                </label>
                <input
                  value={profile.full_name}
                  onChange={e =>
                    setProfile({
                      ...profile,
                      full_name: e.target.value
                    })
                  }
                  placeholder="Nombre completo"
                  className="w-full rounded-xl p-3.5 text-slate-700 bg-[#f8fafc] border border-slate-200/60 focus:border-emerald-500 focus:bg-white outline-none text-xs font-bold transition-all shadow-xs"
                />
              </div>

              {/* Campo: Fecha de nacimiento */}
              <div className="space-y-1.5">
                <label className="block text-[11px] text-slate-400 font-bold">
                  Fecha de nacimiento
                </label>
                <input
                  type="date"
                  value={profile.birth_date}
                  onChange={e =>
                    setProfile({
                      ...profile,
                      birth_date: e.target.value
                    })
                  }
                  className="w-full rounded-xl p-3.5 text-slate-700 bg-[#f8fafc] border border-slate-200/60 focus:border-emerald-500 focus:bg-white outline-none text-xs font-bold transition-all shadow-xs"
                />
              </div>

              {/* Campo: País */}
              <div className="space-y-1.5">
                <label className="block text-[11px] text-slate-400 font-bold">
                  País
                </label>
                <div className="relative">
                  <select
                    value={profile.country}
                    onChange={e => {
                      const c = COUNTRIES.find(x => x.name === e.target.value)
                      setProfile({
                        ...profile,
                        country: c?.name ?? '',
                        flag: c?.flag ?? ''
                      })
                    }}
                    className="w-full rounded-xl p-3.5 text-slate-700 bg-[#f8fafc] border border-slate-200/60 focus:border-emerald-500 focus:bg-white outline-none text-xs font-bold transition-all appearance-none cursor-pointer shadow-xs"
                  >
                    <option value="">
                      Selecciona tu país 🌎
                    </option>
                    {COUNTRIES.map(c => (
                      <option
                        key={c.name}
                        value={c.name}
                      >
                        {c.flag} {c.name}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-slate-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                    </svg>
                  </div>
                </div>
              </div>

              {saved && (
                <div className="text-emerald-600 text-[11px] font-black text-center bg-emerald-50 py-3 rounded-xl border border-emerald-100 shadow-xs">
                  ✓ Perfil actualizado con éxito
                </div>
              )}

              <div className="pt-2">
                <button
                  onClick={saveProfile}
                  disabled={saving}
                  className="w-full rounded-xl py-3.5 text-white font-black text-xs bg-[#10b981] hover:bg-[#059669] transition-colors shadow-xs cursor-pointer disabled:opacity-60"
                >
                  {saving ? 'Guardando...' : '💾 Guardar cambios'}
                </button>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  )
}