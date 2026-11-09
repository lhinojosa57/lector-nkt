import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'

const STORAGE_KEY = 'lectornkt-regla'

function readPref(): boolean {
  try { return localStorage.getItem(STORAGE_KEY) === '1' } catch { return false }
}
function writePref(on: boolean) {
  try { localStorage.setItem(STORAGE_KEY, on ? '1' : '0') } catch { /* sin almacenamiento */ }
}

interface Line { top: number; height: number }

/**
 * Lee los renglones reales del texto (como los dibujó el navegador), para que la
 * regla caiga exacto en cada renglón con cualquier tamaño de letra o espaciado.
 */
function measureLines(box: HTMLElement): Line[] {
  // Solo nodos de texto: si se mide el contenedor completo, el navegador también
  // devuelve el rectángulo de los bloques (párrafos), que se "come" el primer renglón.
  const boxTop = box.getBoundingClientRect().top
  const range = document.createRange()
  const walker = document.createTreeWalker(box, NodeFilter.SHOW_TEXT)
  const rects: DOMRect[] = []
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    if (!n.textContent?.trim()) continue
    range.selectNodeContents(n)
    for (const r of Array.from(range.getClientRects())) {
      if (r.width > 1 && r.height > 1) rects.push(r)
    }
  }
  rects.sort((a, b) => a.top - b.top)
  const lines: Line[] = []
  for (const r of rects) {
    const top = r.top - boxTop
    const last = lines[lines.length - 1]
    if (last && Math.abs(last.top - top) < r.height / 2) {
      // mismo renglón: ampliar
      const bottom = Math.max(last.top + last.height, top + r.height)
      last.top = Math.min(last.top, top)
      last.height = bottom - last.top
    } else {
      lines.push({ top, height: r.height })
    }
  }
  return lines.sort((a, b) => a.top - b.top)
}

/**
 * Regla de lectura: una franja que resalta el renglón donde va el estudiante
 * y atenúa el resto. Se mueve con el mouse, tocando el renglón o con las flechas ↑ ↓.
 * El estudiante decide si la activa; la preferencia se recuerda en su navegador.
 */
export default function ReadingRuler({ children }: { children: ReactNode }) {
  const [on, setOn] = useState(readPref)
  const [lineIdx, setLineIdx] = useState(0)
  const [lines, setLines] = useState<Line[]>([])
  const boxRef = useRef<HTMLDivElement>(null)

  const measure = useCallback(() => {
    if (boxRef.current) setLines(measureLines(boxRef.current))
  }, [])

  useEffect(() => {
    const el = boxRef.current
    if (!el) return
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    if (el.firstElementChild) ro.observe(el.firstElementChild)
    document.fonts?.ready.then(measure).catch(() => {})
    return () => ro.disconnect()
  }, [measure, on])

  useEffect(() => {
    if (!on) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); setLineIdx(l => Math.min(lines.length - 1, l + 1)) }
      if (e.key === 'ArrowUp') { e.preventDefault(); setLineIdx(l => Math.max(0, l - 1)) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [on, lines.length])

  function moveTo(clientY: number) {
    const el = boxRef.current
    if (!el || !on || lines.length === 0) return
    const y = clientY - el.getBoundingClientRect().top
    let best = 0
    let bestDist = Infinity
    lines.forEach((ln, i) => {
      const d = Math.abs(ln.top + ln.height / 2 - y)
      if (d < bestDist) { bestDist = d; best = i }
    })
    setLineIdx(best)
  }

  function toggle() {
    setOn(v => { writePref(!v); return !v })
  }

  const current = lines[Math.min(lineIdx, lines.length - 1)]
  const pad = 4

  return (
    <div>
      <div className="flex justify-end mb-2">
        <button
          onClick={toggle}
          aria-pressed={on}
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
        {on && current && (
          <>
            <div
              className="pointer-events-none absolute inset-x-[-8px] top-0 bg-parchment-50/70"
              style={{ height: Math.max(0, current.top - pad) }}
            />
            <div
              className="pointer-events-none absolute inset-x-[-8px] rounded border-y-2 border-gold-400 bg-gold-300/20"
              style={{ top: current.top - pad, height: current.height + pad * 2 }}
            />
            <div
              className="pointer-events-none absolute inset-x-[-8px] bottom-0 bg-parchment-50/70"
              style={{ top: current.top + current.height + pad }}
            />
          </>
        )}
      </div>
      {on && <p className="mt-2 font-body text-[11px] text-ink-500">Mueve la regla con el mouse, tocando el renglón o con las flechas ↑ ↓ del teclado.</p>}
    </div>
  )
}
