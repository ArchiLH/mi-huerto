import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useNavigate } from 'react-router-dom'

const COUNTRIES = [
  { name:'Perú', flag:'🇵🇪' },
  { name:'Argentina', flag:'🇦🇷' },
  { name:'Bolivia', flag:'🇧🇴' },
  { name:'Brasil', flag:'🇧🇷' },
  { name:'Chile', flag:'🇨🇱' },
  { name:'Colombia', flag:'🇨🇴' },
  { name:'Ecuador', flag:'🇪🇨' },
  { name:'México', flag:'🇲🇽' },
  { name:'España', flag:'🇪🇸' },
  { name:'Estados Unidos', flag:'🇺🇸' },
  { name:'Venezuela', flag:'🇻🇪' },
  { name:'Uruguay', flag:'🇺🇾' },
  { name:'Paraguay', flag:'🇵🇾' },
  { name:'Otro', flag:'🌎' },
]

type Profile = {
  full_name:string
  birth_date:string
  country:string
  flag:string
}

export default function Perfil(){
  const {user}=useAuth()
  const navigate=useNavigate()

  const [profile,setProfile]=useState<Profile>({
    full_name:'',
    birth_date:'',
    country:'',
    flag:''
  })

  const [isPremium,setIsPremium]=useState(false)
  const [loading,setLoading]=useState(true)
  const [saving,setSaving]=useState(false)
  const [saved,setSaved]=useState(false)
  const [totalPlants,setTotalPlants]=useState(0)
  const [memberSince,setMemberSince]=useState('')

  useEffect(()=>{
    loadAll()
  },[user])

  const loadAll=async()=>{
    if(!user)return

    const {data:profileData}=await supabase
      .from('profiles')
      .select('*')
      .eq('id',user.id)
      .single()

    if(profileData){
      setProfile({
        full_name:profileData.full_name ?? '',
        birth_date:profileData.birth_date ?? '',
        country:profileData.country ?? '',
        flag:profileData.flag ?? ''
      })
    }

    const {data:settings}=await supabase
      .from('user_settings')
      .select('is_premium')
      .eq('id',user.id)
      .single()

    setIsPremium(settings?.is_premium ?? false)

    const {count}=await supabase
      .from('spaces')
      .select('*',{count:'exact',head:true})
      .eq('user_id',user.id)
      .not('plant_id','is',null)

    setTotalPlants(count ?? 0)

    setMemberSince(
      new Date(user.created_at)
        .toLocaleDateString(
          'es-PE',
          {
            day:'2-digit',
            month:'long',
            year:'numeric'
          }
        )
    )

    setLoading(false)
  }

  const saveProfile=async()=>{
    if(!user)return
    setSaving(true)

    await supabase
      .from('profiles')
      .upsert({
        id:user.id,
        full_name:profile.full_name,
        birth_date:profile.birth_date || null,
        country:profile.country,
        flag:profile.flag,
        updated_at:new Date().toISOString()
      })

    setSaving(false)
    setSaved(true)

    setTimeout(()=>{
      setSaved(false)
    },3000)
  }

  const getInitials=()=>{
    if(profile.full_name){
      return profile.full_name
        .split(' ')
        .map(n=>n[0])
        .join('')
        .toUpperCase()
        .slice(0,2)
    }
    return user?.email?.[0]?.toUpperCase() ?? '?'
  }

  const getAge=()=>{
    if(!profile.birth_date)return null

    const birth=new Date(profile.birth_date)
    const today=new Date()

    let age = today.getFullYear() - birth.getFullYear()
    const month = today.getMonth() - birth.getMonth()

    if(month<0 || (month===0 && today.getDate()<birth.getDate())){
      age--
    }
    return age
  }

  if(loading){
    return(
      <div
        className="h-40 rounded-2xl animate-pulse"
        style={{ backgroundColor:'#0d2318' }}
      />
    )
  }

  return(
    <div className="space-y-5">

      {/* Cabecera Mi Perfil */}
      <div
        className="rounded-2xl p-5"
        style={{
          backgroundColor:'#0d2318',
          border:'1px solid #1a3a20'
        }}
      >
        <span
          className="text-xs uppercase"
          style={{ color:'#4a6a4a' }}
        >
          Cuenta
        </span>
        <h1 className="text-xl font-bold text-white mt-1">
          👤 Mi Perfil
        </h1>
      </div>

      {/* Tarjeta de Información de Usuario */}
      <div
        className="rounded-2xl p-5"
        style={{
          backgroundColor:'#0d2318',
          border:'1px solid #1a3a20'
        }}
      >
        <div className="flex gap-4 items-center">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold"
            style={{
              backgroundColor:'#1a3a20',
              color:'#a3d9a5'
            }}
          >
            {getInitials()}
          </div>

          <div>
            <h2 className="font-bold text-white">
              {profile.full_name || 'Usuario'}
            </h2>
            <p className="text-xs" style={{ color:'#6b9e6e' }}>
              {user?.email}
            </p>

            {profile.country && (
              <p className="text-xs mt-1" style={{ color:'#a3d9a5' }}>
                {profile.flag} {profile.country}
              </p>
            )}

            <div className="mt-2 flex items-center gap-2">
              <span
                className="text-xs px-2 py-1 rounded-full"
                style={{
                  backgroundColor:isPremium?'#3a2a00':'#0a2a10',
                  color:isPremium?'#fbbf24':'#4ade80'
                }}
              >
                {isPremium?'⭐ Premium':'🌱 Free'}
              </span>
              {getAge() && (
                <span className="text-xs text-white">
                  {getAge()} años
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 mt-4">
          <div
            className="rounded-xl p-3 text-center"
            style={{ backgroundColor:'#0a1a0f' }}
          >
            <p className="text-2xl text-green-400 font-bold">
              {totalPlants}
            </p>
            <p className="text-xs text-slate-400">
              Plantas activas
            </p>
          </div>

          <div
            className="rounded-xl p-3 text-center"
            style={{ backgroundColor:'#0a1a0f' }}
          >
            <p className="text-xs text-white">
              {memberSince}
            </p>
            <p className="text-xs text-slate-400">
              Miembro desde
            </p>
          </div>
        </div>
      </div>

      {/* Formulario EDITAR INFORMACIÓN (Diseño de la imagen replicado) */}
      <div
        className="rounded-2xl p-5 space-y-4"
        style={{
          backgroundColor:'#0d2318',
          border:'1px solid #1a3a20'
        }}
      >
        <h3 className="text-sm text-green-300">
          ✏️ EDITAR INFORMACIÓN
        </h3>

        {/* Campo: Nombre completo */}
        <div className="space-y-1">
          <label className="block text-xs" style={{ color: '#6b9e6e' }}>
            Nombre completo
          </label>
          <input
            value={profile.full_name}
            onChange={e=>
              setProfile({
                ...profile,
                full_name:e.target.value
              })
            }
            placeholder="Nombre completo"
            className="w-full rounded-xl p-3 text-white"
            style={{ backgroundColor:'#0a1a0f' }}
          />
        </div>

        {/* Campo: Fecha de nacimiento */}
        <div className="space-y-1">
          <label className="block text-xs" style={{ color: '#6b9e6e' }}>
            Fecha de nacimiento
          </label>
          <input
            type="date"
            value={profile.birth_date}
            onChange={e=>
              setProfile({
                ...profile,
                birth_date:e.target.value
              })
            }
            className="w-full rounded-xl p-3 text-white"
            style={{ backgroundColor:'#0a1a0f' }}
          />
        </div>

        {/* Campo NUEVO: País (Reemplaza visualmente a Nacionalidad) */}
        <div className="space-y-1">
          <label className="block text-xs" style={{ color: '#6b9e6e' }}>
            País
          </label>
          <select
            value={profile.country}
            onChange={e=>{
              const c=COUNTRIES.find(x=>x.name===e.target.value)
              setProfile({
                ...profile,
                country:c?.name ?? '',
                flag:c?.flag ?? ''
              })
            }}
            className="w-full rounded-xl p-3 text-white"
            style={{ backgroundColor:'#0a1a0f' }}
          >
            <option value="">
              Selecciona tu país 🌎
            </option>
            {COUNTRIES.map(c=>(
              <option
                key={c.name}
                value={c.name}
              >
                {c.flag} {c.name}
              </option>
            ))}
          </select>
        </div>

        {saved && (
          <div className="text-green-400 text-sm text-center">
            ✅ Perfil actualizado
          </div>
        )}

        <button
          onClick={saveProfile}
          disabled={saving}
          className="w-full rounded-xl py-3 text-white font-bold"
          style={{ backgroundColor:'#2d6a35' }}
        >
          {saving ? 'Guardando...' : '💾 Guardar cambios'}
        </button>
      </div>

      {/* Botón Configuración */}
      <button
        onClick={()=>navigate('/configuracion')}
        className="w-full p-4 rounded-2xl text-left flex justify-between items-center"
        style={{ backgroundColor:'#0d2318' }}
      >
        <span>⚙️ Configuración</span>
        <span style={{ color: '#4a6a4a' }}>❯</span>
      </button>

    </div>
  )
}