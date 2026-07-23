import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { sendTelegramAlert } from '../lib/telegram'

type Sensor = {
  id: number
  name: string
  min_temp: number
  max_temp: number
  min_humidity: number
  max_humidity: number
  spaces?: { name: string } | null
}

const careMessages: Record<string, string> = {
  temp_high: '🌡️ Mueve la planta a un lugar más fresco o añade sombra.',
  temp_low: '🧣 Protege la planta del frío, cúbrela por las noches.',
  humidity_high: '💨 Mejora la ventilación y reduce el riego.',
  humidity_low: '💧 Riega la planta o aumenta la humedad del ambiente.',
}

const alertTypeLabel: Record<string, string> = {
  temp_high: '🌡️ Temperatura muy alta',
  temp_low: '🥶 Temperatura muy baja',
  humidity_high: '💧 Exceso de humedad',
  humidity_low: '🏜️ Poca humedad',
}

export default function Simulador() {
  const { user } = useAuth()
  const [sensors, setSensors] = useState<Sensor[]>([])
  const [selectedSensor, setSelectedSensor] = useState<Sensor | null>(null)
  const [temperature, setTemperature] = useState('22')
  const [humidity, setHumidity] = useState('60')
  const [loading, setLoading] = useState(false)
  const [lastResult, setLastResult] = useState<string | null>(null)
  const [userChatId, setUserChatId] = useState<string | null>(null)
  const [telegramEnabled, setTelegramEnabled] = useState(false)

  const loadSensors = async () => {
    if (!user) return
    const { data } = await supabase.from('sensors').select('*, spaces(name)').order('id')
    setSensors((data as Sensor[]) ?? [])
    if (data && data.length > 0) setSelectedSensor(data[0] as Sensor)

    const { data: settings } = await supabase
      .from('user_settings').select('telegram_chat_id, telegram_enabled').eq('id', user.id).single()
    if (settings) {
      setUserChatId(settings.telegram_chat_id ?? null)
      setTelegramEnabled(settings.telegram_enabled ?? false)
    }
  }

  useEffect(() => { loadSensors() }, [])

  useEffect(() => {
    const originalBg = document.body.style.backgroundColor
    document.body.style.backgroundColor = '#e2f3ec'
    return () => {
      document.body.style.backgroundColor = originalBg
    }
  }, [])

  const sendReading = async () => {
    if (!selectedSensor) { alert('Selecciona un sensor'); return }
    const temp = Number(temperature)
    const hum = Number(humidity)
    setLoading(true)
    setLastResult(null)

    const { error } = await supabase.from('readings').insert({
      sensor_id: selectedSensor.id, temperature: temp, humidity: hum,
    })

    if (error) { alert('Error: ' + error.message); setLoading(false); return }

    const alerts = []
    if (temp > selectedSensor.max_temp) alerts.push({ sensor_id: selectedSensor.id, type: 'temp_high', value: temp, threshold: selectedSensor.max_temp, care_message: careMessages.temp_high, acknowledged: false })
    if (temp < selectedSensor.min_temp) alerts.push({ sensor_id: selectedSensor.id, type: 'temp_low', value: temp, threshold: selectedSensor.min_temp, care_message: careMessages.temp_low, acknowledged: false })
    if (hum > selectedSensor.max_humidity) alerts.push({ sensor_id: selectedSensor.id, type: 'humidity_high', value: hum, threshold: selectedSensor.max_humidity, care_message: careMessages.humidity_high, acknowledged: false })
    if (hum < selectedSensor.min_humidity) alerts.push({ sensor_id: selectedSensor.id, type: 'humidity_low', value: hum, threshold: selectedSensor.min_humidity, care_message: careMessages.humidity_low, acknowledged: false })

    if (alerts.length > 0) {
      await supabase.from('alerts').insert(alerts)
      if (telegramEnabled && userChatId) {
        for (const alert of alerts) {
          const mensaje = `🌿 <b>Mi Huerto — Alerta</b>\n\n${alertTypeLabel[alert.type]}\n\n📍 Sensor: <b>${selectedSensor.name}</b>\n📦 Espacio: <b>${selectedSensor.spaces?.name ?? 'Sin espacio'}</b>\n🌡️ Temperatura: <b>${temp}°C</b>\n💧 Humedad: <b>${hum}%</b>\n\n💡 <i>${alert.care_message}</i>`.trim()
          await sendTelegramAlert(mensaje, userChatId)
        }
        setLastResult(`✅ Enviado + ⚠️ ${alerts.length} alerta(s) + 📨 Telegram`)
      } else {
        setLastResult(`✅ Enviado + ⚠️ ${alerts.length} alerta(s) generada(s)`)
      }
    } else {
      setLastResult('✅ Lectura guardada — todo normal')
    }
    setLoading(false)
  }

  if (loading && sensors.length === 0) {
    return (
      <div className="w-full min-h-screen bg-[#e2f3ec] flex flex-col justify-center items-center space-y-4">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-bold text-slate-400">Cargando simulador...</p>
      </div>
    )
  }

  return (
    <div className="w-full min-h-screen bg-[#e2f3ec] p-3 sm:p-6 lg:p-8 flex justify-center">
      <div className="w-full max-w-[1400px] space-y-6 pb-16 font-sans text-slate-800">

        {/* HEADER DE LA PÁGINA */}
        <div className="space-y-1 bg-white p-4 sm:p-6 rounded-3xl border border-slate-100 shadow-xs">
          <h1 className="text-xl sm:text-2xl font-black text-[#1e293b] tracking-tight">
            🧪 Simulador de lecturas
          </h1>
          <p className="text-xs text-slate-400 font-semibold leading-relaxed">
            Envía datos de prueba a tus sensores para verificar alertas y notificaciones
          </p>
        </div>

        {/* ESTADO TELEGRAM */}
        <div className={`flex items-center gap-2.5 rounded-3xl px-5 py-3.5 text-xs font-extrabold border shadow-xs ${
          telegramEnabled && userChatId 
            ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
            : 'bg-slate-100 text-slate-500 border-slate-200'
        }`}>
          <span>{telegramEnabled && userChatId ? '✅' : '⚠️'}</span>
          <span>{telegramEnabled && userChatId ? 'Telegram conectado y activo' : 'Telegram no configurado'}</span>
        </div>

        {sensors.length === 0 ? (
          <div className="bg-white rounded-3xl border-2 border-dashed border-slate-200 p-10 flex flex-col items-center justify-center text-center shadow-xs py-16">
            <p className="text-4xl mb-3">📡</p>
            <p className="text-xs font-bold text-slate-400">Primero agrega un sensor en la sección de Sensores</p>
          </div>
        ) : (
          /* DISTRIBUCIÓN EN 2 COLUMNAS PARA PC (O 1 COLUMNA EN MÓVIL) */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* COLUMNA IZQUIERDA: SELECTOR DE SENSORES */}
            <div className="lg:col-span-5 bg-white rounded-3xl border border-[#51e29d]/60 p-5 sm:p-6 shadow-[0_4px_20px_-4px_rgba(81,226,157,0.12)] space-y-3">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">
                📡 Seleccionar Sensor
              </p>
              <div className="space-y-2">
                {sensors.map(s => (
                  <button
                    key={s.id}
                    onClick={() => setSelectedSensor(s)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                      selectedSensor?.id === s.id 
                        ? 'bg-[#10b981] text-white shadow-xs' 
                        : 'bg-[#f8faf9] text-slate-600 hover:bg-slate-100 border border-slate-100'
                    }`}
                  >
                    <span className="font-extrabold">{s.name}</span>
                    <span className="opacity-80 text-[11px]">{s.spaces?.name ?? 'Sin espacio'}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* COLUMNA DERECHA: PANEL DE CONTROLES E INPUTS */}
            <div className="lg:col-span-7 bg-white rounded-3xl border border-[#51e29d]/60 p-6 sm:p-8 shadow-[0_4px_20px_-4px_rgba(81,226,157,0.12)] space-y-5">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">
                ⚙️ Valores de Prueba
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-slate-500 mb-1.5 block uppercase">Temperatura (°C)</label>
                  <input 
                    type="number" 
                    value={temperature} 
                    onChange={e => setTemperature(e.target.value)} 
                    className="w-full rounded-2xl px-4 py-3.5 bg-[#f8fafc] border border-slate-200/60 text-xs font-bold text-slate-700 focus:border-emerald-500 focus:bg-white outline-none shadow-xs transition-all" 
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-500 mb-1.5 block uppercase">Humedad (%)</label>
                  <input 
                    type="number" 
                    value={humidity} 
                    onChange={e => setHumidity(e.target.value)} 
                    className="w-full rounded-2xl px-4 py-3.5 bg-[#f8fafc] border border-slate-200/60 text-xs font-bold text-slate-700 focus:border-emerald-500 focus:bg-white outline-none shadow-xs transition-all" 
                  />
                </div>
              </div>

              {/* BOTONES DE ACCIÓN RÁPIDA */}
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => { setTemperature((Math.random() * 50).toFixed(1)); setHumidity((Math.random() * 100).toFixed(1)) }} 
                  className="py-3 rounded-2xl text-[10px] font-black bg-slate-100 text-slate-600 hover:bg-slate-200 transition cursor-pointer shadow-3xs"
                >
                  🎲 Valores Aleatorios
                </button>
                <button 
                  onClick={() => selectedSensor && (setTemperature(String(selectedSensor.max_temp + 5)), setHumidity(String(selectedSensor.min_humidity - 5)))} 
                  className="py-3 rounded-2xl text-[10px] font-black bg-red-50 text-red-600 hover:bg-red-100 transition cursor-pointer shadow-3xs border border-red-100"
                >
                  ⚠️ Forzar Críticos
                </button>
              </div>

              {lastResult && (
                <div className={`rounded-2xl px-4 py-3 text-xs font-bold shadow-xs ${
                  lastResult.includes('alerta') 
                    ? 'bg-amber-50 text-amber-700 border border-amber-200' 
                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                }`}>
                  {lastResult}
                </div>
              )}

              <button
                onClick={sendReading}
                disabled={loading}
                className="w-full text-white font-extrabold rounded-2xl py-3.5 text-xs bg-[#10b981] hover:bg-[#059669] transition shadow-xs cursor-pointer disabled:opacity-50"
              >
                {loading ? 'Enviando lectura...' : '📤 Enviar lectura simulada'}
              </button>
            </div>

          </div>
        )}

      </div>
    </div>
  )
}