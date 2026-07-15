import { useState, useRef, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'


type Message = {
  role: 'user' | 'bot'
  text: string
}



const QUICK_TIPS = [
  '💧 ¿Cuándo debo regar?',
  '🌡️ Temperatura ideal para mis plantas',
  '🪲 ¿Cómo combatir plagas?',
  '🌱 Consejos para mi huerto',
  '🍅 Cuidados del tomate',
  '🥬 ¿Por qué se ponen amarillas las hojas?',
]



export default function Chatbot(
{
 onClose
}:{
 onClose:()=>void
}
){


const {user}=useAuth()



const [messages,setMessages]=useState<Message[]>([

{
role:'bot',
text:
'¡Hola! 🌿 Soy HuertoBot, tu asistente de jardinería. Puedo ayudarte con riego, temperatura, humedad, plagas y cuidados de tus plantas.'
}

])



const [input,setInput]=useState('')

const [loading,setLoading]=useState(false)


const bottomRef=
useRef<HTMLDivElement>(null)


const inputRef=
useRef<HTMLInputElement>(null)



useEffect(()=>{

bottomRef.current?.scrollIntoView({
behavior:'smooth'
})

},[messages])



useEffect(()=>{

inputRef.current?.focus()

},[])




// =============================
// CONTEXTO DEL HUERTO
// =============================

const getPlantContext = async()=>{


if(!user){

return `
El usuario no tiene plantas registradas.
`

}



const {
data:spaces,
error
}=await supabase

.from('spaces')

.select(`

name,

plant_catalog(

name,

min_temp,

max_temp,

min_humidity,

max_humidity

)

`)

.eq(
'user_id',
user.id
)

.not(
'plant_id',
'is',
null
)



if(error){

console.log(error)

return `
No se pudo obtener información del huerto.
`

}



if(!spaces || spaces.length===0){

return `
El usuario todavía no tiene plantas registradas.
`

}




const plants = spaces.map(
(space:any)=>{


const plant =
space.plant_catalog


return `

🌱 ${plant?.name ?? 'Planta'}

Ubicación:
${space.name}

Temperatura ideal:
${plant?.min_temp ?? '-'}°C -
${plant?.max_temp ?? '-'}°C


Humedad ideal:
${plant?.min_humidity ?? '-'}% -
${plant?.max_humidity ?? '-'}%

`

}
).join('\n')




return `

Plantas del usuario:

${plants}

`

}





// =============================
// ENVIAR MENSAJE
// =============================


const sendMessage = async(
text?:string
)=>{


const userMsg =
(text ?? input).trim()



if(
!userMsg ||
loading
)return



setInput('')



setMessages(prev=>[

...prev,

{
role:'user',
text:userMsg
}

])



setLoading(true)



const plantContext =
await getPlantContext()



const systemPrompt = `

Eres HuertoBot 🌿

Eres un experto en huertos urbanos,
jardinería y agricultura inteligente.


Ayuda al usuario con:

- riego
- temperatura
- humedad
- enfermedades
- plagas
- fertilización
- cuidados de plantas


Responde siempre en español.

Sé amigable y claro.

Usa emojis ocasionalmente.


Información del huerto:

${plantContext}

`




try{


const {
data,
error

}=await supabase.functions.invoke(

'huerto-bot',

{

body:{

messages:[

{
role:'system',
content:systemPrompt
},

{
role:'user',
content:userMsg
}

]

}

}

)



if(error){

throw error

}



const botText =

data
?.choices
?.[0]
?.message
?.content

??

'🌱 No pude generar una respuesta.'





setMessages(prev=>[

...prev,

{

role:'bot',

text:botText

}

])




}catch(error){


console.error(
error
)


setMessages(prev=>[

...prev,

{

role:'bot',

text:
'❌ Error conectando con HuertoBot. Intenta nuevamente.'

}

])


}




setLoading(false)



}






return (

<div className="fixed inset-0 z-50 flex items-end justify-center p-4">


<div

className="absolute inset-0 bg-black/60 backdrop-blur-sm"

onClick={onClose}

/>



<div

className="relative w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl"

style={{

backgroundColor:'#0f2317',

border:'1px solid #1a3a20'

}}

>



<div

className="flex items-center justify-between px-4 py-3"

style={{

backgroundColor:'#0a1a0f',

borderBottom:'1px solid #1a3a20'

}}

>


<div className="flex items-center gap-3">


<div

className="w-10 h-10 rounded-full flex items-center justify-center text-xl"

style={{
backgroundColor:'#1a3a20'
}}

>

🤖

</div>



<div>

<p

className="font-bold text-sm"

style={{
color:'#a3d9a5'
}}

>

HuertoBot

</p>


<p className="text-xs text-green-400">

● Asistente IA activo

</p>


</div>


</div>



<button

onClick={onClose}

className="w-8 h-8 rounded-full"

style={{

backgroundColor:'#1a3a20'

}}

>

✕

</button>



</div>





<div className="h-80 overflow-y-auto p-4 space-y-3">


{messages.map((msg,i)=>(


<div

key={i}

className={`flex gap-2 ${
msg.role==='user'
?
'justify-end'
:
'justify-start'
}`}

>


{msg.role==='bot' && (

<div

className="w-7 h-7 rounded-full flex items-center justify-center"

style={{

backgroundColor:'#1a3a20'

}}

>

🌿

</div>

)}



<div

className="max-w-[80%] rounded-2xl px-4 py-2.5 text-sm"

style={{

backgroundColor:

msg.role==='bot'
?
'#1a3a20'
:
'#16a34a',

color:'white'

}}

>

{msg.text}

</div>


</div>


))}



{loading && (

<div className="text-green-400">

🌿 HuertoBot está pensando...

</div>

)}



<div ref={bottomRef}/>


</div>





{messages.length===1 && (

<div className="px-4 py-2 flex flex-wrap gap-2">


{QUICK_TIPS.map((tip,i)=>(


<button

key={i}

onClick={()=>sendMessage(tip)}

className="text-xs px-3 py-1.5 rounded-full"

style={{

border:'1px solid #2a5a30',

color:'#a3d9a5'

}}

>

{tip}

</button>


))}


</div>

)}





<div

className="p-3 flex gap-2"

style={{

borderTop:'1px solid #1a3a20'

}}

>


<input

ref={inputRef}

value={input}

onChange={
e=>setInput(e.target.value)
}

onKeyDown={
e=>
e.key==='Enter' &&
sendMessage()
}

placeholder="Pregunta sobre tus plantas..."

className="flex-1 px-4 py-2 rounded-xl text-white"

style={{

backgroundColor:'#0a1a0f'

}}

/>



<button

disabled={loading}

onClick={()=>sendMessage()}

className="px-4 rounded-xl text-white"

style={{

backgroundColor:'#2d6a35'

}}

>

↑

</button>



</div>



</div>


</div>


)

}