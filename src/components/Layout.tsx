import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import AlertPopup from './AlertPopup'
import Chatbot from './Chatbot'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'


const navItems = [
  { to: '/', icon: '🏡', label: 'Huerto' },
  { to: '/plantas', icon: '🌿', label: 'Plantas' },
  { to: '/reportes', icon: '📊', label: 'Reportes' },
  { to: '/alertas', icon: '🔔', label: 'Alertas' },
  { to: '/configuracion', icon: '⚙️', label: 'Config' },
]



export default function Layout({
  children
}: {
  children: React.ReactNode
}) {


  const { signOut, user } = useAuth()

  const navigate = useNavigate()


  const [showChat,setShowChat] = useState(false)


  const [profileName,setProfileName] = useState('')




  // ============================
  // CARGAR NOMBRE DEL PERFIL
  // ============================

  useEffect(()=>{


    if(!user) return


    const loadProfileName = async()=>{


      const {data,error}=await supabase

      .from('profiles')

      .select('full_name')

      .eq('id',user.id)

      .single()



      if(error){

        console.log(error)

      }



      setProfileName(

        data?.full_name ||

        user.email ||

        ''

      )


    }



    loadProfileName()



  },[user])






  const handleChatClick=()=>{

    setShowChat(true)

  }







  const handleSignOut=async()=>{


    await signOut()

    navigate('/')


  }





  // Nombre que se muestra

  const displayName =

  profileName ||

  user?.email ||

  'Usuario'



  return (


<div

className="min-h-dvh flex flex-col text-white"

style={{

backgroundColor:'#0a1a0f'

}}

>



{/* HEADER */}

<header

className="sticky top-0 z-20 backdrop-blur px-5 py-3 flex items-center justify-between"

style={{

backgroundColor:'#0a1a0fcc',

borderBottom:'1px solid #1a3a20'

}}

>



{/* LOGO */}

<button

onClick={()=>navigate('/')}

className="flex items-center gap-2 transition hover:opacity-80"

>


<img

src="/logo.png"

alt="Mi Huerto"

className="w-14 h-14 rounded-2xl object-contain"

/>



<span

className="font-bold"

style={{

color:'#a3d9a5'

}}

>

Mi Huerto

</span>


</button>







{/* ACCIONES */}

<div className="flex items-center gap-3">





{/* PERFIL */}

<button

onClick={()=>navigate('/perfil')}

className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm"

style={{

backgroundColor:'#1a3a20',

color:'#a3d9a5'

}}

>


{

displayName[0]?.toUpperCase()

}


</button>






{/* CHATBOT */}

<button

onClick={handleChatClick}

className="text-xl"

title="HuertoBot IA"

>

🤖

</button>






{/* SALIR */}

<button

onClick={handleSignOut}

className="text-xs"

style={{

color:'#6b9e6e'

}}

>

Salir

</button>



</div>


</header>







{/* CONTENIDO */}

<main

className="flex-1 overflow-y-auto"

style={{

padding:'1rem',

paddingBottom:'7rem'

}}

>


<div className="max-w-2xl mx-auto">


{children}


</div>


</main>








{/* MENU */}

<nav

className="fixed bottom-0 left-0 right-0 z-30 px-2 py-2"

style={{

backgroundColor:'#0d2318',

borderTop:'1px solid #1a3a20',

paddingBottom:'max(0.5rem, env(safe-area-inset-bottom))'

}}

>


<div className="flex justify-around max-w-2xl mx-auto">


{

navItems.map(item=>(


<NavLink

key={item.to}

to={item.to}

end={item.to==='/'}

className={({isActive})=>

`

flex flex-col items-center gap-1 px-3 py-1 rounded-xl transition text-xs

${

isActive

?'text-green-400'

:'text-slate-500'

}

`

}


>


<span className="text-xl">

{item.icon}

</span>


<span>

{item.label}

</span>


</NavLink>


))


}



</div>


</nav>






{/* CHATBOT */}

{

showChat && (

<Chatbot

onClose={()=>setShowChat(false)}

/>

)

}






<AlertPopup />



</div>


  )

}