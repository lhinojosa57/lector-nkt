import { useState, useRef, useEffect } from 'react'
import { useAuth } from '@/lib/auth'

const TEXTO_DIAGNOSTICO = {
  id: '98c0dbf4-7911-4025-a3bc-31ba4e83e9c0',
  title: 'El fuego que lo cambió todo',
  body: 'Hace aproximadamente un millón de años, un grupo de homínidos descubrió algo que cambiaría para siempre la historia de la vida en la Tierra: el fuego. Nadie sabe con certeza cómo ocurrió. Quizás fue un rayo que encendió un árbol seco, o la lava de un volcán que rozó la hierba del camino. Lo que sí sabemos es que, en algún momento, uno de nuestros antepasados decidió no huir del fuego, sino acercarse a él.\n\nEsa decisión lo cambió todo. Con el fuego, los humanos pudieron cocinar sus alimentos. Cocinar hace que la comida sea más fácil de digerir y libera más energía. Los científicos creen que esta mayor energía permitió que el cerebro humano creciera con el paso de las generaciones. En otras palabras: el fuego nos ayudó a pensar mejor.\n\nPero el fuego no solo transformó la biología. También transformó la vida social. Alrededor de una fogata, las personas se reunían a hablar, a contar historias, a planear la cacería del día siguiente. El fuego fue, quizás, la primera sala de clases de la humanidad.',
  wordCount: 168,
}

type ReadingState = 'permission' | 'ready' | 'recording' | 'done'

interface Props {
  onComplete: (audioBlob: Blob, wordsRead: number) => void
}

export default function DiagnosticReading({ onComplete }: Props) {
  const { profile } = useAuth()
  const [state, setState] = useState<ReadingState>('permission')
  const [secondsLeft, setSecondsLeft] = useState(60)
  const [permissionError, setPermissionError] = useState('')

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop())
    }
  }, [])

  const requestPermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      setState('ready')
    } catch {
      setPermissionError('No se pudo acceder al micrófono. Verifica los permisos del navegador.')
    }
  }

  const startRecording = () => {
    if (!streamRef.current) return
    chunksRef.current = []

    const mediaRecorder = new MediaRecorder(streamRef.current)
    mediaRecorderRef.current = mediaRecorder

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data)
    }

    mediaRecorder.start(1000)
    setState('recording')
    setSecondsLeft(60)

    timerRef.current = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) {
          stopRecording()
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  const stopRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current)
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop())
        setState('done')
        // Estimamos palabras leídas basado en tiempo (se corregirá con transcripción)
        const estimatedWords = Math.round(TEXTO_DIAGNOSTICO.wordCount * (60 / 60))
        onComplete(blob, estimatedWords)
      }
    }
  }

  const circumference = 2 * Math.PI * 54
  const progress = (secondsLeft / 60) * circumference

  return (
    <div className="min-h-screen bg-ink-900 flex flex-col">
      
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-ink-700">
        <div>
          <p className="font-display text-parchment-100 font-semibold">Diagnóstico inicial</p>
          <p className="text-ink-400 text-xs font-body mt-0.5">Lee en voz alta — 1 minuto</p>
        </div>
        {state === 'recording' && (
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-red-400 text-xs font-mono">Grabando</span>
          </div>
        )}
      </div>

      {/* Pantalla de permisos */}
      {state === 'permission' && (
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-sm w-full text-center">
            <div className="w-20 h-20 bg-teal-900 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
              </svg>
            </div>
            <h2 className="font-display text-2xl font-bold text-parchment-100 mb-3">
              Necesitamos escucharte
            </h2>
            <p className="font-body text-ink-400 mb-8 leading-relaxed">
              El sistema mide tus palabras por minuto automáticamente mientras lees en voz alta. Tu grabación se guarda de forma privada.
            </p>
            {permissionError && (
              <p className="text-red-400 text-sm font-body mb-4 bg-red-900/20 rounded-lg p-3">
                {permissionError}
              </p>
            )}
            <button
              onClick={requestPermission}
              className="w-full bg-teal-600 text-white font-body font-semibold py-4 rounded-xl hover:bg-teal-500 transition-colors"
            >
              Activar micrófono
            </button>
          </div>
        </div>
      )}

      {/* Pantalla lista para grabar */}
      {state === 'ready' && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 gap-8">
          <div className="max-w-lg w-full">
            <div className="bg-ink-800 rounded-xl p-6 border border-ink-700 mb-8">
              <p className="text-xs font-mono text-ink-400 uppercase tracking-wider mb-3">
                {TEXTO_DIAGNOSTICO.title}
              </p>
              <p className="font-body text-parchment-300 leading-relaxed text-sm line-clamp-4">
                {TEXTO_DIAGNOSTICO.body.substring(0, 200)}...
              </p>
            </div>
            <div className="text-center">
              <p className="text-ink-400 font-body text-sm mb-6">
                Cuando presiones el botón, comienza a leer en voz alta desde el principio. El sistema se detiene automáticamente al minuto.
              </p>
              <button
                onClick={startRecording}
                className="bg-teal-600 text-white font-display font-bold text-xl px-12 py-5 rounded-full hover:bg-teal-500 transition-colors"
              >
                ▶ Iniciar lectura
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pantalla de grabación activa */}
      {state === 'recording' && (
        <div className="flex-1 flex flex-col p-6">
          
          {/* Timer */}
          <div className="flex justify-center mb-6">
            <div className="relative w-32 h-32">
              <svg className="w-32 h-32 -rotate-90" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="54" fill="none" stroke="#1f2937" strokeWidth="8"/>
                <circle
                  cx="60" cy="60" r="54"
                  fill="none"
                  stroke={secondsLeft > 20 ? '#0d9488' : '#ef4444'}
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={circumference - progress}
                  className="transition-all duration-1000"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="font-mono text-4xl font-bold text-parchment-100">
                  {secondsLeft}
                </span>
              </div>
            </div>
          </div>

          {/* Texto completo */}
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-2xl mx-auto bg-parchment-50 rounded-xl p-8 border-l-4 border-teal-500">
              <p className="font-display text-lg font-semibold text-ink-800 mb-4">
                {TEXTO_DIAGNOSTICO.title}
              </p>
              {TEXTO_DIAGNOSTICO.body.split('\n\n').map((paragraph, i) => (
                <p key={i} className="font-body text-ink-700 leading-loose mb-4 text-base">
                  {paragraph}
                </p>
              ))}
            </div>
          </div>

          {/* Botón terminar antes */}
          <div className="flex justify-center mt-4">
            <button
              onClick={stopRecording}
              className="text-ink-400 hover:text-ink-200 font-body text-sm transition-colors"
            >
              Terminar antes del minuto
            </button>
          </div>
        </div>
      )}
    </div>
  )
}