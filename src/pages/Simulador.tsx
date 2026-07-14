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
          const mensaje = `🌿 <b>Mi Huerto — Alerta</b>\n\n${alertTypeLabel[alert.type]}\n\n📍 Sensor: <b>${selectedSensor.name}</b>\n📦 Espacio: <b>${selectedSensor.spaces?.name ?? 'Sin espacio'}</b>\n🌡️ Temperatura: <b>${temp}°C</b>\n💧 Humedad: <b>${hum}%</b>\n\n💡 <i>${alert.care_message}</i>\n\n⏰ ${new Date().toLocaleString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`.trim()
          await sendTelegramAlert(mensaje, userChatId)
        }
        setLastResult(`✅ Lectura guardada + ⚠️ ${alerts.length} alerta(s) + 📨 Telegram enviado`)
      } else {
        setLastResult(`✅ Lectura guardada + ⚠️ ${alerts.length} alerta(s) generada(s)`)
      }
    } else {
      setLastResult('✅ Lectura guardada — todo dentro de los rangos normales')
    }

    setLoading(false)
  }

  const sendRandom = () => {
    setTemperature((Math.random() * 50).toFixed(1))
    setHumidity((Math.random() * 100).toFixed(1))
  }

  const sendCritical = () => {
    if (!selectedSensor) return
    setTemperature(String(selectedSensor.max_temp + 10))
    setHumidity(String(selectedSensor.min_humidity - 10))
  }

  return (
    <div className="space-y-5">

      {/* HEADER */}
      <div
        className="rounded-2xl p-5"
        style={{ backgroundColor: '#0d2318', border: '1px solid #1a3a20' }}
      >
        <span className="text-xs font-mono uppercase tracking-widest" style={{ color: '#4a6a4a' }}>
          Herramienta de prueba
        </span>
        <h1 className="text-xl font-bold text-white mt-1">🧪 Simulador</h1>
        <p className="text-sm mt-0.5" style={{ color: '#6b9e6e' }}>
          Envía lecturas de prueba a tus sensores
        </p>
      </div>

      {/* ESTADO TELEGRAM */}
      <div
        className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm"
        style={{
          backgroundColor: telegramEnabled && userChatId ? '#0a2a10' : '#0d2318',
          border: `1px solid ${telegramEnabled && userChatId ? '#2d6a35' : '#1a3a20'}`,
          color: telegramEnabled && userChatId ? '#4ade80' : '#6b9e6e'
        }}
      >
        <span>{telegramEnabled && userChatId ? '✅' : '⚠️'}</span>
        <span>
          {telegramEnabled && userChatId
            ? 'Telegram conectado — recibirás alertas'
            : 'Telegram no configurado — ve a ⚙️ Config'}
        </span>
      </div>

      {sensors.length === 0 ? (
        <div
          className="rounded-2xl p-10 text-center"
          style={{ backgroundColor: '#0d2318', border: '1px solid #1a3a20' }}
        >
          <p className="text-4xl mb-3">📡</p>
          <p style={{ color: '#6b9e6e' }}>Primero agrega un sensor en Sensores</p>
        </div>
      ) : (
        <>
          {/* SELECTOR */}
          <div
            className="rounded-2xl p-4 space-y-2"
            style={{ backgroundColor: '#0d2318', border: '1px solid #1a3a20' }}
          >
            <p className="text-xs font-semibold mb-2 uppercase tracking-widest" style={{ color: '#4a6a4a' }}>
              📡 Sensor
            </p>
            {sensors.map(s => (
              <button
                key={s.id}
                onClick={() => setSelectedSensor(s)}
                className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm transition"
                style={{
                  backgroundColor: selectedSensor?.id === s.id ? '#2d6a35' : '#0a1a0f',
                  border: `1px solid ${selectedSensor?.id === s.id ? '#2d6a35' : '#1a3a20'}`,
                  color: selectedSensor?.id === s.id ? 'white' : '#a3d9a5'
                }}
              >
                <span>{s.name}</span>
                <span className="text-xs opacity-70">{s.spaces?.name}</span>
              </button>
            ))}
          </div>

          {/* RANGOS */}
          {selectedSensor && (
            <div
              className="rounded-2xl p-4"
              style={{ backgroundColor: '#0d2318', border: '1px solid #1a3a20' }}
            >
              <p className="text-xs font-semibold mb-3 uppercase tracking-widest" style={{ color: '#4a6a4a' }}>
                📋 Rangos de {selectedSensor.name}
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl p-3 text-center" style={{ backgroundColor: '#0a1a0f' }}>
                  <p style={{ color: '#f97316' }} className="font-bold">
                    {selectedSensor.min_temp}° – {selectedSensor.max_temp}°C
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: '#4a6a4a' }}>Temperatura</p>
                </div>
                <div className="rounded-xl p-3 text-center" style={{ backgroundColor: '#0a1a0f' }}>
                  <p style={{ color: '#38bdf8' }} className="font-bold">
                    {selectedSensor.min_humidity}% – {selectedSensor.max_humidity}%
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: '#4a6a4a' }}>Humedad</p>
                </div>
              </div>
            </div>
          )}

          {/* INPUTS */}
          <div
            className="rounded-2xl p-4 space-y-4"
            style={{ backgroundColor: '#0d2318', border: '1px solid #1a3a20' }}
          >
            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#4a6a4a' }}>
              📤 Enviar lectura
            </p>

            <div>
              <label className="text-xs mb-1.5 block" style={{ color: '#6b9e6e' }}>
                🌡️ Temperatura (°C)
              </label>
              <input
                type="number"
                value={temperature}
                onChange={e => setTemperature(e.target.value)}
                className="w-full text-white rounded-xl px-4 py-3 outline-none"
                style={{ backgroundColor: '#0a1a0f', border: '1px solid #1a3a20' }}
                onFocus={e => e.target.style.borderColor = '#4ade80'}
                onBlur={e => e.target.style.borderColor = '#1a3a20'}
              />
            </div>

            <div>
              <label className="text-xs mb-1.5 block" style={{ color: '#6b9e6e' }}>
                💧 Humedad (%)
              </label>
              <input
                type="number"
                value={humidity}
                onChange={e => setHumidity(e.target.value)}
                className="w-full text-white rounded-xl px-4 py-3 outline-none"
                style={{ backgroundColor: '#0a1a0f', border: '1px solid #1a3a20' }}
                onFocus={e => e.target.style.borderColor = '#4ade80'}
                onBlur={e => e.target.style.borderColor = '#1a3a20'}
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={sendRandom}
                className="flex-1 py-2 rounded-xl text-xs transition"
                style={{ backgroundColor: '#1a3a20', color: '#4ade80' }}
              >
                🎲 Aleatorios
              </button>
              <button
                onClick={sendCritical}
                className="flex-1 py-2 rounded-xl text-xs transition"
                style={{ backgroundColor: '#1a0808', color: '#f87171' }}
              >
                ⚠️ Críticos
              </button>
            </div>

            {lastResult && (
              <div
                className="rounded-xl px-4 py-3 text-sm"
                style={{
                  backgroundColor: lastResult.includes('alerta') ? '#1a1208' : '#0a2a10',
                  border: `1px solid ${lastResult.includes('alerta') ? '#5a3a10' : '#2d6a35'}`,
                  color: lastResult.includes('alerta') ? '#fbbf24' : '#4ade80'
                }}
              >
                {lastResult}
              </div>
            )}

            <button
              onClick={sendReading}
              disabled={loading}
              className="w-full text-white font-semibold rounded-xl py-3 transition disabled:opacity-50"
              style={{ backgroundColor: '#2d6a35' }}
            >
              {loading ? 'Enviando...' : '📤 Enviar lectura'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}