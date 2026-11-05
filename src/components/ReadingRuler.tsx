import { useEffect, useRef, useState, type ReactNode } from 'react'

const STORAGE_KEY = 'lectornkt-regla'

function readPref(): boolean {
  try { return localStorage.getItem(STORAGE_KEY) === '1' } catch { return false }
}
function writePref(on: boolean) {
  try { localStorage.setItem(STORAGE_KEY, on ? '1' : '0') } catch { /* sin almacenamiento */ }
}

/**
 * Regla de lectura: una franja que resalta el renglón donde va el estudiante
 * y atenúa el resto. Se mueve con el mouse, tocando el renglón o con las flechas ↑ ↓.
 * El estudiante decide si la activa; la preferencia se recuerda en su navegador.
 */
export default function ReadingRuler({ children }: { children: ReactNode }) {
  const [on, setOn] = useState(readPref)
  const [line, setLine] = useState(0)
  const [metrics, setMetrics] = useState({ lh: 29, lines: 1 })
  const boxRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = boxRef.current
    if (!el) return
    const measure = () => {
      const lh = parseFloat(getComputedStyle(el).lineHeight) || 29
      setMetrics({ lh, lines: Math.max(1, Math.round(el.scrollHeight / lh)) })
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    if (!on) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); setLine(l => Math.min(metrics.lines - 1, l + 1)) }
      if (e.key === 'ArrowUp') { e.preventDefault(); setLine(l => Math.max(0, l - 1)) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [on, metrics.lines])

  function moveTo(clientY: number) {
    const el = boxRef.current
    if (!el || !on) return
    const y = clientY - el.getBoundingClientRect().top
    setLine(Math.max(0, Math.min(metrics.lines - 1, Math.floor(y / metrics.lh))))
  }

  function toggle() {
    setOn(v => { writePref(!v); return !v })
  }

  const top = line * metrics.lh

  return (
    <div>
      <div className="flex justify-end mb-2">
        <button
          onClick={toggle}
          className={`font-body text-xs px-3 py-1.5 rounded-lg border ${
            on ? 'bg-gold-300/40 border-gold-400 text-ink-800' : 'border-parchment-300 text-ink-500 hover:bg-parchment-100'
          }`}
        >
          📏 Regla de lectura: {on ? 'activada' : 'desactivada'}
        </button>
      </div>
      <div
        ref={boxRef}
        className="relative"
        onMouseMove={e => moveTo(e.clientY)}
        onClick={e => moveTo(e.clientY)}
        onTouchStart={e => moveTo(e.touches[0].clientY)}
      >
        {children}
        {on && (
          <>
            <div className="pointer-events-none absolute inset-x-[-8px] top-0 bg-parchment-50/70" style={{ height: top }} />
            <div
              className="pointer-events-none absolute inset-x-[-8px] rounded border-y-2 border-gold-400 bg-gold-300/20"
              style={{ top, height: metrics.lh }}
            />
            <div
              className="pointer-events-none absolute inset-x-[-8px] bottom-0 bg-parchment-50/70"
              style={{ top: top + metrics.lh }}
            />
          </>
        )}
      </div>
      {on && <p className="mt-2 font-body text-[11px] text-ink-400">Mueve la regla con el mouse, tocando el renglón o con las flechas ↑ ↓ del teclado.</p>}
    </div>
  )
}
