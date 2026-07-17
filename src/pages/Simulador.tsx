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

  return (
    <div className="w-full max-w-md mx-auto px-5 pt-6 pb-10 space-y-5">
      {/* HEADER */}
      <div className="space-y-1">
        <h1 className="text-2xl font-black text-[#1e293b] tracking-tight">🧪 Simulador</h1>
        <p className="text-xs text-slate-400 font-semibold">Envía lecturas de prueba a tus sensores</p>
      </div>

      {/* ESTADO TELEGRAM */}
      <div className={`flex items-center gap-2 rounded-2xl px-5 py-4 text-xs font-bold border ${telegramEnabled && userChatId ? 'bg-[#e2faee] text-[#009660] border-emerald-100' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
        <span>{telegramEnabled && userChatId ? '✅' : '⚠️'}</span>
        <span>{telegramEnabled && userChatId ? 'Telegram conectado' : 'Telegram no configurado'}</span>
      </div>

      {sensors.length === 0 ? (
        <div className="bg-white rounded-[2rem] border border-slate-100 p-10 text-center shadow-3xs">
          <p className="text-4xl mb-3">📡</p>
          <p className="text-xs font-bold text-slate-400">Primero agrega un sensor en Sensores</p>
        </div>
      ) : (
        <>
          {/* SELECTOR */}
          <div className="bg-white rounded-[2rem] border border-slate-100 p-5 shadow-3xs space-y-3">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">📡 Seleccionar Sensor</p>
            {sensors.map(s => (
              <button
                key={s.id}
                onClick={() => setSelectedSensor(s)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-bold transition-all ${selectedSensor?.id === s.id ? 'bg-[#10b981] text-white' : 'bg-[#f8fafc] text-slate-600 hover:bg-slate-100'}`}
              >
                <span>{s.name}</span>
                <span className="opacity-70">{s.spaces?.name}</span>
              </button>
            ))}
          </div>

          {/* INPUTS */}
          <div className="bg-white rounded-[2rem] border border-slate-100 p-6 shadow-3xs space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 mb-1.5 block uppercase">Temp (°C)</label>
                <input type="number" value={temperature} onChange={e => setTemperature(e.target.value)} className="w-full rounded-xl px-4 py-3 bg-[#f8fafc] border border-slate-100 text-xs font-bold text-slate-700 focus:border-[#4ade80] outline-none" />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 mb-1.5 block uppercase">Hum (%)</label>
                <input type="number" value={humidity} onChange={e => setHumidity(e.target.value)} className="w-full rounded-xl px-4 py-3 bg-[#f8fafc] border border-slate-100 text-xs font-bold text-slate-700 focus:border-[#4ade80] outline-none" />
              </div>
            </div>

            <div className="flex gap-2">
              <button onClick={() => { setTemperature((Math.random() * 50).toFixed(1)); setHumidity((Math.random() * 100).toFixed(1)) }} className="flex-1 py-3 rounded-xl text-[10px] font-black bg-slate-100 text-slate-600 hover:bg-slate-200 transition">🎲 Aleatorios</button>
              <button onClick={() => selectedSensor && (setTemperature(String(selectedSensor.max_temp + 5)), setHumidity(String(selectedSensor.min_humidity - 5)))} className="flex-1 py-3 rounded-xl text-[10px] font-black bg-red-50 text-red-600 hover:bg-red-100 transition">⚠️ Críticos</button>
            </div>

            {lastResult && (
              <div className={`rounded-xl px-4 py-3 text-[10px] font-bold ${lastResult.includes('alerta') ? 'bg-amber-50 text-amber-700 border border-amber-100' : 'bg-[#e2faee] text-[#009660] border border-emerald-100'}`}>
                {lastResult}
              </div>
            )}

            <button
              onClick={sendReading}
              disabled={loading}
              className="w-full text-white font-black rounded-xl py-3 text-xs bg-[#10b981] hover:bg-[#059669] transition shadow-3xs disabled:opacity-50"
            >
              {loading ? 'Enviando...' : '📤 Enviar lectura'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}