import { useState, useEffect, useRef } from 'react'

interface SessionText {
  id: string
  title: string
  body: string
  word_count: number
}

interface Props {
  text: SessionText
  onComplete: (audioBlob: Blob, wordsRead: number) => void
}

type ReadingState = 'ready' | 'recording' | 'done'

export default function SessionReading({ text, onComplete }: Props) {
  const [state, setState] = useState<ReadingState>('ready')
  const [secondsLeft, setSecondsLeft] = useState(60)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  useEffect(() => {
    async function initMic() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        streamRef.current = stream
      } catch {
        console.error('No se pudo acceder al micrófono')
      }
    }
    initMic()
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop())
    }
  }, [])

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
        if (prev <= 1) { stopRecording(); return 0 }
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
        onComplete(blob, text.word_count)
      }
    }
  }

  const circumference = 2 * Math.PI * 54
  const progress = (secondsLeft / 60) * circumference

  return (
    <div className="min-h-screen bg-ink-900 flex flex-col">
      <div className="flex items-center justify-between px-6 py-4 border-b border-ink-700">
        <div>
          <p className="font-display text-parchment-100 font-semibold">Lectura del día</p>
          <p className="text-ink-400 text-xs font-body mt-0.5">Lee en voz alta · 1 minuto</p>
        </div>
        {state === 'recording' && (
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-red-400 text-xs font-mono">Grabando</span>
          </div>
        )}
        <span className="font-mono text-xs text-ink-500">2 / 4</span>
      </div>

      <div className="flex-1 flex flex-col p-6">

        {state === 'ready' && (
          <div className="flex-1 flex flex-col items-center justify-center">
            <div className="max-w-lg w-full">
              <div className="bg-ink-800 rounded-xl p-6 border border-ink-700 mb-8">
                <p className="text-xs font-mono text-ink-400 uppercase tracking-wider mb-3">
                  {text.title}
                </p>
                <p className="font-body text-parchment-300 text-sm leading-relaxed">
                  {text.body.substring(0, 200)}...
                </p>
              </div>
              <p className="text-ink-400 font-body text-sm text-center mb-6">
                Lee en voz alta desde el principio. El sistema se detiene al minuto.
              </p>
              <button
                onClick={startRecording}
                className="w-full bg-teal-600 text-white font-display font-bold text-xl py-5 rounded-full hover:bg-teal-500 transition-colors"
              >
                ▶ Iniciar lectura
              </button>
            </div>
          </div>
        )}

        {state === 'recording' && (
          <>
            <div className="flex justify-center mb-6">
              <div className="relative w-32 h-32">
                <svg className="w-32 h-32 -rotate-90" viewBox="0 0 120 120">
                  <circle cx="60" cy="60" r="54" fill="none" stroke="#1f2937" strokeWidth="8"/>
                  <circle cx="60" cy="60" r="54" fill="none"
                    stroke={secondsLeft > 20 ? '#0d9488' : '#ef4444'}
                    strokeWidth="8" strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={circumference - progress}
                    className="transition-all duration-1000"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="font-mono text-4xl font-bold text-parchment-100">{secondsLeft}</span>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              <div className="max-w-2xl mx-auto bg-parchment-50 rounded-xl p-8 border-l-4 border-teal-500">
                <p className="font-display text-lg font-semibold text-ink-800 mb-4">{text.title}</p>
                {text.body.split('\n\n').map((p, i) => (
                  <p key={i} className="font-body text-ink-700 leading-loose mb-4 text-base">{p}</p>
                ))}
              </div>
            </div>

            <div className="flex justify-center mt-4">
              <button onClick={stopRecording} className="text-ink-400 hover:text-ink-200 font-body text-sm">
                Terminar antes del minuto
              </button>
            </div>
          </>
        )}

      </div>
    </div>
  )
}