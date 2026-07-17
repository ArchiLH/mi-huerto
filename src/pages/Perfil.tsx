import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useNavigate } from 'react-router-dom'
import { handlePurchase } from '../lib/stripe' // ← Importamos tu función de Stripe

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
  const navigate = useNavigate()

  const [profile, setProfile] = useState<Profile>({
    full_name: '',
    birth_date: '',
    country: '',
    flag: ''
  })

  const [isPremium, setIsPremium] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [totalPlants, setTotalPlants] = useState(0)
  const [memberSince, setMemberSince] = useState('')
  const [isRedirecting, setIsRedirecting] = useState(false) // ← Estado de carga para Stripe

  useEffect(() => {
    loadAll()
  }, [user])

  const loadAll = async () => {
    if (!user) return

    // 1. Validar perfil
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

    // 2. Validar Premium real desde la base de datos
    const { data: settings } = await supabase
      .from('user_settings')
      .select('is_premium')
      .eq('id', user.id)
      .single()

    setIsPremium(settings?.is_premium ?? false)

    // 3. Cantidad de plantas activas
    const { count } = await supabase
      .from('spaces')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .not('plant_id', 'is', null)

    setTotalPlants(count ?? 0)

    // 4. Fecha de registro
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

  // FUNCIÓN ACTUALIZADA: Llama a handlePurchase con las credenciales reales del usuario
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
      return profile.full_name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
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
      <div className="w-full bg-[#f4f7f5]/40 min-h-screen px-5 pt-6 space-y-4">
        <div className="h-6 w-1/3 bg-slate-100 rounded-lg animate-pulse" />
        <div className="h-44 bg-white rounded-[2rem] animate-pulse border border-slate-100" />
      </div>
    )
  }

  return (
    <div className="w-full bg-[#f4f7f5]/40 min-h-screen px-5 pt-6 space-y-5 max-w-md mx-auto pb-10 font-sans text-slate-800">

      {/* Cabecera Mi Perfil */}
      <div className="space-y-1">
        <h1 className="text-2xl font-black text-[#1e293b] flex items-center gap-1.5 tracking-tight">
          👤 Mi Perfil
        </h1>
        <p className="text-xs text-slate-400 font-semibold">
          Gestiona los detalles de tu cuenta de Secret Garden
        </p>
      </div>

      {/* Tarjeta de Información de Usuario */}
      <div className="bg-white rounded-[2rem] border border-slate-100/85 p-5 flex flex-col gap-4 shadow-3xs">
        <div className="flex gap-4 items-center">
          <div className="w-16 h-16 rounded-full flex items-center justify-center text-lg font-black shrink-0 border-[2px] border-[#4ade80]"
            style={{
              backgroundColor: '#e2faee',
              color: '#0d2318'
            }}
          >
            {getInitials()}
          </div>

          <div className="min-w-0 flex-1">
            <h2 className="font-extrabold text-slate-800 text-sm truncate leading-tight">
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

            <div className="mt-2.5 flex items-center gap-2">
              {isPremium ? (
                <span className="text-[9px] font-black px-2.5 py-1 rounded-full uppercase leading-none shadow-3xs bg-amber-100/60 text-amber-600 border border-amber-200/40">
                  👑 Premium
                </span>
              ) : (
                <button
                  onClick={handleStripeCheckout}
                  disabled={isRedirecting}
                  className="text-[9px] font-black px-2.5 py-1 rounded-full uppercase leading-none shadow-3xs bg-emerald-100 text-[#009660] border border-[#4ade80]/40 hover:bg-[#4ade80]/20 active:scale-95 transition-all cursor-pointer flex items-center gap-1 disabled:opacity-60"
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

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 mt-1">
          <div className="rounded-2xl p-3 text-center bg-[#f8faf9] border border-slate-100/60 shadow-3xs">
            <p className="text-xl text-[#009660] font-black">
              {totalPlants}
            </p>
            <p className="text-[10px] text-slate-400 font-bold mt-0.5">
              Plantas activas
            </p>
          </div>

          <div className="rounded-2xl p-3 text-center bg-[#f8faf9] border border-slate-100/60 shadow-3xs flex flex-col justify-center">
            <p className="text-[10px] text-slate-700 font-extrabold leading-tight">
              {memberSince}
            </p>
            <p className="text-[10px] text-slate-400 font-bold mt-1">
              Miembro desde
            </p>
          </div>
        </div>
      </div>

      {/* Formulario EDITAR INFORMACIÓN */}
      <div className="bg-white rounded-[2rem] border border-slate-100/85 p-6 space-y-4 shadow-3xs">
        <h3 className="text-xs text-[#009660] font-black tracking-wider uppercase">
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
            className="w-full rounded-xl p-3 text-slate-700 bg-[#f8fafc] border border-slate-100 focus:border-[#4ade80] focus:bg-white outline-none text-xs font-bold transition-all"
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
            className="w-full rounded-xl p-3 text-slate-700 bg-[#f8fafc] border border-slate-100 focus:border-[#4ade80] focus:bg-white outline-none text-xs font-bold transition-all"
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
              className="w-full rounded-xl p-3 text-slate-700 bg-[#f8fafc] border border-slate-100 focus:border-[#4ade80] focus:bg-white outline-none text-xs font-bold transition-all appearance-none cursor-pointer"
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
          <div className="text-emerald-600 text-[11px] font-black text-center bg-[#e2faee] py-2 rounded-xl border border-emerald-100">
            ✓ Perfil actualizado con éxito
          </div>
        )}

        <button
          onClick={saveProfile}
          disabled={saving}
          className="w-full rounded-xl py-3 text-white font-black text-xs bg-[#10b981] hover:bg-[#059669] transition-colors shadow-3xs"
        >
          {saving ? 'Guardando...' : '💾 Guardar cambios'}
        </button>
      </div>

      {/* Botón Configuración */}
      <button
        onClick={() => navigate('/configuracion')}
        className="w-full p-4 rounded-[1.5rem] bg-white border border-slate-100/85 hover:bg-slate-50 flex justify-between items-center transition-colors shadow-3xs cursor-pointer text-xs font-black text-slate-700"
      >
        <span className="flex items-center gap-2">⚙️ Configuración</span>
        <span className="text-slate-300">❯</span>
      </button>

    </div>
  )
}