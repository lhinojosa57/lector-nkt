import { useEffect, useRef, useState } from 'react'
import { downloadAudio } from '@/lib/drive'

const SPEEDS = [0.5, 0.75, 1] as const

function fmt(s: number) {
  if (!Number.isFinite(s) || s < 0) s = 0
  const m = Math.floor(s / 60)
  const r = Math.floor(s % 60)
  return `${m}:${String(r).padStart(2, '0')}`
}

/**
 * Reproductor de la grabación para revisar fluidez: descarga el audio del Drive del
 * estudiante (permiso de solo lectura del docente) y lo reproduce en la app, con
 * velocidad lenta y "regresar 5 s" para marcar errores con calma.
 * Si Drive no lo entrega, muestra el reproductor de Drive como respaldo.
 */
export default function AudioReviewPlayer({
  fileId, email, fallbackSeconds,
}: { fileId: string; email?: string; fallbackSeconds?: number | null }) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [url, setUrl] = useState<string | null>(null)
  const [playing, setPlaying] = useState(false)
  const [time, setTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [speed, setSpeed] = useState<number>(1)
  const audioRef = useRef<HTMLAudioElement>(null)
  const fixingDuration = useRef(false)

  useEffect(() => () => { if (url) URL.revokeObjectURL(url) }, [url])

  async function load() {
    setStatus('loading')
    setErrorMsg('')
    try {
      const blob = await downloadAudio(fileId, email)
      setUrl(URL.createObjectURL(blob))
      setStatus('ready')
    } catch (err) {
      console.error(err)
      const msg = err instanceof Error ? err.message : ''
      setErrorMsg(
        msg.includes('ventana') ? 'Cerraste la ventana de Google. Vuelve a intentarlo para dar el permiso.'
          : msg.includes('403') || msg.includes('404') ? 'Tu cuenta no tiene acceso a esta grabación (¿perteneces al grupo de docentes?).'
          : 'No se pudo cargar la grabación aquí.'
      )
      setStatus('error')
    }
  }

  function onLoadedMetadata() {
    const a = audioRef.current
    if (!a) return
    a.playbackRate = speed
    if (Number.isFinite(a.duration)) { setDuration(a.duration); return }
    // Las grabaciones webm del navegador no traen duración: se fuerza a calcularla.
    fixingDuration.current = true
    a.currentTime = 1e101
  }

  function onDurationChange() {
    const a = audioRef.current
    if (!a || !Number.isFinite(a.duration)) return
    setDuration(a.duration)
    if (fixingDuration.current) {
      fixingDuration.current = false
      a.currentTime = 0
      setTime(0)
    }
  }

  function toggle() {
    const a = audioRef.current
    if (!a) return
    if (a.paused) void a.play()
    else a.pause()
  }

  function seek(to: number) {
    const a = audioRef.current
    if (!a) return
    a.currentTime = Math.max(0, Math.min(to, duration || to))
    setTime(a.currentTime)
  }

  function changeSpeed(s: number) {
    setSpeed(s)
    if (audioRef.current) audioRef.current.playbackRate = s
  }

  if (status === 'idle' || status === 'loading') {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={load}
          disabled={status === 'loading'}
          className="font-body text-sm font-semibold px-4 py-2.5 rounded-lg bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-60"
        >
          {status === 'loading' ? 'Cargando grabación…' : '▶ Escuchar grabación'}
        </button>
        <p className="font-body text-xs text-ink-500 flex-1 min-w-[200px]">
          La primera vez, Google te pedirá permiso para que LectorNKT lea las grabaciones que te compartieron.
        </p>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-3">
          <p role="alert" className="font-body text-sm text-crimson-500 flex-1">{errorMsg}</p>
          <button onClick={load} className="font-body text-xs px-3 py-1.5 rounded-lg border border-parchment-300 text-ink-700 hover:bg-parchment-100">
            Reintentar
          </button>
        </div>
        <p className="font-body text-xs text-ink-500">Mientras tanto, puedes escucharla con el reproductor de Drive:</p>
        <div className="rounded-lg overflow-hidden bg-[#202124]">
          <iframe
            title="Grabación del estudiante (Drive)"
            src={`https://drive.google.com/file/d/${fileId}/preview`}
            className="block w-full h-[170px] border-0"
            allow="autoplay"
          />
        </div>
      </div>
    )
  }

  const total = duration || fallbackSeconds || 0

  return (
    <div className="space-y-3">
      <audio
        ref={audioRef}
        src={url ?? undefined}
        preload="metadata"
        onLoadedMetadata={onLoadedMetadata}
        onDurationChange={onDurationChange}
        onTimeUpdate={e => { if (!fixingDuration.current) setTime(e.currentTarget.currentTime) }}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
      />
      <div className="flex items-center gap-3">
        <button
          onClick={toggle}
          aria-label={playing ? 'Pausar' : 'Reproducir'}
          className="shrink-0 w-12 h-12 rounded-full bg-teal-600 text-white text-lg flex items-center justify-center hover:bg-teal-700"
        >
          {playing ? '❚❚' : '▶'}
        </button>
        <button
          onClick={() => seek(time - 5)}
          aria-label="Regresar 5 segundos"
          className="shrink-0 font-body text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-parchment-300 text-ink-700 hover:bg-parchment-100"
        >
          ↺ 5 s
        </button>
        <input
          type="range"
          min={0}
          max={total || 1}
          step={0.1}
          value={Math.min(time, total || 1)}
          onChange={e => seek(Number(e.target.value))}
          aria-label="Avance de la grabación"
          className="flex-1 min-w-0 accent-teal-600"
        />
        <span className="shrink-0 font-body text-xs tabular-nums text-ink-600">{fmt(time)} / {fmt(total)}</span>
      </div>
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Velocidad">
        <span className="font-body text-xs text-ink-500">Velocidad:</span>
        {SPEEDS.map(s => (
          <button
            key={s}
            onClick={() => changeSpeed(s)}
            aria-pressed={speed === s}
            className={`font-body text-xs px-2.5 py-1 rounded-lg border ${
              speed === s ? 'bg-teal-600 border-teal-600 text-white' : 'border-parchment-300 text-ink-700 hover:bg-parchment-100'
            }`}
          >
            {s === 1 ? 'Normal' : `${s}×`}
          </button>
        ))}
      </div>
    </div>
  )
}
