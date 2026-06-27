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

    // Cargar sensores
    const { data } = await supabase
      .from('sensors')
      .select('*, spaces(name)')
      .order('id')

    setSensors((data as Sensor[]) ?? [])
    if (data && data.length > 0) setSelectedSensor(data[0] as Sensor)

    // Cargar configuración de Telegram del usuario
    const { data: settings } = await supabase
      .from('user_settings')
      .select('telegram_chat_id, telegram_enabled')
      .eq('id', user.id)
      .single()

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

    // Insertar lectura
    const { error } = await supabase.from('readings').insert({
      sensor_id: selectedSensor.id,
      temperature: temp,
      humidity: hum,
    })

    if (error) {
      alert('Error al guardar lectura: ' + error.message)
      setLoading(false)
      return
    }

    // Generar alertas si supera umbrales
    const alerts = []

    if (temp > selectedSensor.max_temp) {
      alerts.push({
        sensor_id: selectedSensor.id,
        type: 'temp_high',
        value: temp,
        threshold: selectedSensor.max_temp,
        care_message: careMessages.temp_high,
        acknowledged: false,
      })
    }

    if (temp < selectedSensor.min_temp) {
      alerts.push({
        sensor_id: selectedSensor.id,
        type: 'temp_low',
        value: temp,
        threshold: selectedSensor.min_temp,
        care_message: careMessages.temp_low,
        acknowledged: false,
      })
    }

    if (hum > selectedSensor.max_humidity) {
      alerts.push({
        sensor_id: selectedSensor.id,
        type: 'humidity_high',
        value: hum,
        threshold: selectedSensor.max_humidity,
        care_message: careMessages.humidity_high,
        acknowledged: false,
      })
    }

    if (hum < selectedSensor.min_humidity) {
      alerts.push({
        sensor_id: selectedSensor.id,
        type: 'humidity_low',
        value: hum,
        threshold: selectedSensor.min_humidity,
        care_message: careMessages.humidity_low,
        acknowledged: false,
      })
    }

    if (alerts.length > 0) {
      // Guardar alertas en Supabase
      await supabase.from('alerts').insert(alerts)

      // Enviar Telegram solo si el usuario lo tiene activado
      if (telegramEnabled && userChatId) {
        for (const alert of alerts) {
          const mensaje = `
🌿 <b>Mi Huerto — Alerta</b>

${alertTypeLabel[alert.type]}

📍 Sensor: <b>${selectedSensor.name}</b>
📦 Espacio: <b>${selectedSensor.spaces?.name ?? 'Sin espacio'}</b>
🌡️ Temperatura: <b>${temp}°C</b>
💧 Humedad: <b>${hum}%</b>

💡 <i>${alert.care_message}</i>

⏰ ${new Date().toLocaleString('es-PE', {
  day: '2-digit', month: '2-digit', year: 'numeric',
  hour: '2-digit', minute: '2-digit'
})}
          `.trim()

          await sendTelegramAlert(mensaje, userChatId)
        }
        setLastResult(`✅ Lectura guardada + ⚠️ ${alerts.length} alerta(s) generada(s) + 📨 Telegram enviado`)
      } else {
        setLastResult(`✅ Lectura guardada + ⚠️ ${alerts.length} alerta(s) generada(s)`)
      }
    } else {
      setLastResult('✅ Lectura guardada — todo dentro de los rangos normales')
    }

    setLoading(false)
  }

  const sendRandom = () => {
    const temp = (Math.random() * 50).toFixed(1)
    const hum = (Math.random() * 100).toFixed(1)
    setTemperature(temp)
    setHumidity(hum)
  }

  const sendCritical = () => {
    if (!selectedSensor) return
    setTemperature(String(selectedSensor.max_temp + 10))
    setHumidity(String(selectedSensor.min_humidity - 10))
  }

  return (
    <div className="space-y-5">

      {/* HEADER */}
      <div>
        <h1 className="text-2xl font-bold">🧪 Simulador</h1>
        <p className="text-slate-400 text-sm mt-1">
          Envía lecturas de prueba para ver cómo reacciona el sistema
        </p>
      </div>

      {/* ESTADO TELEGRAM */}
      <div className={`rounded-xl px-4 py-3 text-sm flex items-center gap-2 ${
        telegramEnabled && userChatId
          ? 'bg-green-900/30 border border-green-500/30 text-green-400'
          : 'bg-slate-800 border border-slate-700 text-slate-400'
      }`}>
        <span>{telegramEnabled && userChatId ? '✅' : '⚠️'}</span>
        <span>
          {telegramEnabled && userChatId
            ? 'Telegram conectado — recibirás alertas'
            : 'Telegram no configurado — ve a ⚙️ Config para activarlo'}
        </span>
      </div>

      {sensors.length === 0 ? (
        <div className="bg-slate-900 rounded-2xl p-10 text-center">
          <p className="text-4xl mb-3">📡</p>
          <p className="text-slate-400">Primero agrega un sensor en la sección Sensores</p>
        </div>
      ) : (
        <>
          {/* SELECTOR DE SENSOR */}
          <div className="bg-slate-900 rounded-2xl p-4 space-y-3">
            <p className="text-sm font-semibold text-slate-300">📡 Sensor</p>
            <div className="space-y-2">
              {sensors.map(s => (
                <button
                  key={s.id}
                  onClick={() => setSelectedSensor(s)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm transition ${
                    selectedSensor?.id === s.id
                      ? 'bg-green-600 text-white'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  <span>{s.name}</span>
                  <span className="text-xs opacity-70">{s.spaces?.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* RANGOS DEL SENSOR */}
          {selectedSensor && (
            <div className="bg-slate-900 rounded-2xl p-4">
              <p className="text-sm font-semibold text-slate-300 mb-3">
                📋 Rangos normales de {selectedSensor.name}
              </p>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-slate-800 rounded-xl p-3 text-center">
                  <p className="text-orange-400 font-bold">
                    {selectedSensor.min_temp}° - {selectedSensor.max_temp}°C
                  </p>
                  <p className="text-slate-400 text-xs mt-1">Temperatura</p>
                </div>
                <div className="bg-slate-800 rounded-xl p-3 text-center">
                  <p className="text-blue-400 font-bold">
                    {selectedSensor.min_humidity}% - {selectedSensor.max_humidity}%
                  </p>
                  <p className="text-slate-400 text-xs mt-1">Humedad</p>
                </div>
              </div>
            </div>
          )}

          {/* INPUTS */}
          <div className="bg-slate-900 rounded-2xl p-4 space-y-4">
            <p className="text-sm font-semibold text-slate-300">📤 Enviar lectura</p>

            <div>
              <label className="text-xs text-slate-400 mb-1 block">
                🌡️ Temperatura (°C)
              </label>
              <input
                type="number"
                value={temperature}
                onChange={e => setTemperature(e.target.value)}
                className="w-full bg-slate-800 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            <div>
              <label className="text-xs text-slate-400 mb-1 block">
                💧 Humedad (%)
              </label>
              <input
                type="number"
                value={humidity}
                onChange={e => setHumidity(e.target.value)}
                className="w-full bg-slate-800 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            {/* BOTONES RÁPIDOS */}
            <div className="flex gap-2">
              <button
                onClick={sendRandom}
                className="flex-1 bg-slate-700 hover:bg-slate-600 text-white text-xs py-2 rounded-xl transition"
              >
                🎲 Valores aleatorios
              </button>
              <button
                onClick={sendCritical}
                className="flex-1 bg-red-900 hover:bg-red-800 text-red-400 text-xs py-2 rounded-xl transition"
              >
                ⚠️ Valores críticos
              </button>
            </div>

            {/* RESULTADO */}
            {lastResult && (
              <div className={`rounded-xl px-4 py-3 text-sm ${
                lastResult.includes('alerta')
                  ? 'bg-amber-900/30 border border-amber-500/30 text-amber-400'
                  : 'bg-green-900/30 border border-green-500/30 text-green-400'
              }`}>
                {lastResult}
              </div>
            )}

            <button
              onClick={sendReading}
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-semibold rounded-xl py-3 transition"
            >
              {loading ? 'Enviando...' : '📤 Enviar lectura'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}