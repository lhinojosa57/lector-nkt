import { useEffect, useRef, useState } from 'react'

const LIMIT_SECONDS = 60

interface Props {
  onDone: (seconds: number, audio: Blob) => void
  uploadEnabled: boolean
}

type State = 'idle' | 'asking' | 'denied' | 'recording' | 'done'

/** Graba hasta 1 minuto de lectura en voz alta. */
export default function AloudRecorder({ onDone, uploadEnabled }: Props) {
  const [state, setState] = useState<State>('idle')
  const [secondsLeft, setSecondsLeft] = useState(LIMIT_SECONDS)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const startedAtRef = useRef(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => () => {
    if (timerRef.current) clearInterval(timerRef.current)
    streamRef.current?.getTracks().forEach(t => t.stop())
  }, [])

  useEffect(() => () => { if (audioUrl) URL.revokeObjectURL(audioUrl) }, [audioUrl])

  async function startRecording() {
    setState('asking')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const recorder = new MediaRecorder(stream)
      recorderRef.current = recorder
      chunksRef.current = []
      recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      recorder.onstop = () => {
        const seconds = Math.min(LIMIT_SECONDS, Math.max(1, Math.round((Date.now() - startedAtRef.current) / 1000)))
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' })
        stream.getTracks().forEach(t => t.stop())
        setAudioUrl(URL.createObjectURL(blob))
        setState('done')
        onDone(seconds, blob)
      }
      recorder.start()
      startedAtRef.current = Date.now()
      setSecondsLeft(LIMIT_SECONDS)
      setState('recording')
      timerRef.current = setInterval(() => {
        const left = LIMIT_SECONDS - Math.floor((Date.now() - startedAtRef.current) / 1000)
        setSecondsLeft(Math.max(0, left))
        if (left <= 0) stopRecording()
      }, 250)
    } catch (err) {
      console.error(err)
      setState('denied')
    }
  }

  function stopRecording() {
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = null
    if (recorderRef.current && recorderRef.current.state !== 'inactive') recorderRef.current.stop()
  }

  return (
    <div className="sticky top-0 z-10 bg-ink-800 text-parchment-50 rounded-xl px-5 py-4">
      {state === 'idle' && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="font-body text-sm">Cuando estés lista(o), presiona grabar y lee el texto en voz alta. Tienes 1 minuto.</p>
          <button onClick={startRecording} className="font-body text-sm bg-crimson-500 hover:bg-crimson-400 px-4 py-2 rounded-lg">
            ● Grabar
          </button>
        </div>
      )}
      {state === 'asking' && <p className="font-body text-sm">Permite el uso del micrófono en la ventana de tu navegador...</p>}
      {state === 'denied' && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="font-body text-sm">No pudimos usar el micrófono. Revisa que esté conectado y que el navegador tenga permiso.</p>
          <button onClick={startRecording} className="font-body text-sm bg-parchment-50 text-ink-800 px-4 py-2 rounded-lg">Intentar de nuevo</button>
        </div>
      )}
      {state === 'recording' && (
        <div className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-crimson-400 animate-pulse" />
            <span className="font-mono text-xl">0:{String(secondsLeft).padStart(2, '0')}</span>
          </span>
          <button onClick={stopRecording} className="font-body text-sm bg-parchment-50 text-ink-800 px-4 py-2 rounded-lg">
            Terminé
          </button>
        </div>
      )}
      {state === 'done' && (
        <div className="space-y-2">
          <p className="font-body text-sm">
            ✓ Grabación lista. Ahora termina de leer el texto con calma y pasa a las preguntas.
            {!uploadEnabled && <span className="block text-xs text-parchment-300 mt-1">Versión de prueba: la grabación todavía no se envía.</span>}
          </p>
          {audioUrl && <audio controls src={audioUrl} className="w-full" />}
        </div>
      )}
    </div>
  )
}
