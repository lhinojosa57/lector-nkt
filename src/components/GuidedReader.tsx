import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'

/**
 * Lectura guiada: la app marca palabra por palabra a un ritmo fijo y se detiene
 * en los signos de puntuación (pausa corta en la coma, más larga en el punto,
 * los dos puntos y el punto y coma). Es para practicar el ritmo y las pausas;
 * no mide velocidad.
 */

const SPEEDS = [
  { label: 'Despacio', wpm: 80 },
  { label: 'Normal', wpm: 110 },
  { label: 'Ágil', wpm: 140 },
]

interface Token {
  word: string        // palabra sin el signo final
  punct: string       // signo(s) de puntuación al final ("" si no hay)
  pauseFactor: number // cuántas veces la duración base dura la pausa
  paragraphEnd: boolean
}

function pauseFor(punct: string): number {
  if (/[.!?…]/.test(punct)) return 2.5
  if (/[:;]/.test(punct)) return 2
  if (/[,—]/.test(punct)) return 1
  return 0
}

function tokenize(body: string): Token[][] {
  return body
    .split(/\n\s*\n/)
    .map(p => p.trim())
    .filter(Boolean)
    .map(p => {
      const words = p.split(/\s+/)
      return words.map((w, i) => {
        const m = w.match(/^(.*?)([.,;:!?…»"”)—]*)$/)
        const word = m ? m[1] : w
        const punct = m ? m[2] : ''
        const isLast = i === words.length - 1
        return { word, punct, pauseFactor: pauseFor(punct) + (isLast ? 1 : 0), paragraphEnd: isLast }
      })
    })
}

export default function GuidedReader({ body, onDone, textStyle }: { body: string; onDone: () => void; textStyle?: CSSProperties }) {
  const paragraphs = useMemo(() => tokenize(body), [body])
  const flat = useMemo(() => paragraphs.flat(), [paragraphs])

  const [speed, setSpeed] = useState(1)
  const [index, setIndex] = useState(-1)       // palabra actual (-1 = no ha empezado)
  const [pausing, setPausing] = useState(false) // true mientras dura la pausa del signo
  const [playing, setPlaying] = useState(false)
  const [finished, setFinished] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const doneRef = useRef(onDone)
  useEffect(() => { doneRef.current = onDone }, [onDone])

  useEffect(() => {
    if (!playing) return
    const base = 60000 / SPEEDS[speed].wpm
    const current = flat[index]

    if (index >= 0 && current && !pausing && current.pauseFactor > 0) {
      // Terminó la palabra y tiene signo: empieza la pausa
      timer.current = setTimeout(() => setPausing(true), base)
    } else {
      const wait = index < 0 ? 300 : pausing ? base * (current?.pauseFactor ?? 0) : base
      timer.current = setTimeout(() => {
        setPausing(false)
        if (index + 1 >= flat.length) {
          setPlaying(false)
          setFinished(true)
          doneRef.current()
        } else {
          setIndex(index + 1)
        }
      }, wait)
    }
    return () => { if (timer.current) clearTimeout(timer.current) }
  }, [playing, index, pausing, speed, flat])

  function restart() {
    setIndex(-1)
    setPausing(false)
    setFinished(false)
    setPlaying(true)
  }

  let k = -1
  return (
    <div className="space-y-4">
      <div className="sticky top-0 z-10 bg-ink-800 text-parchment-50 rounded-xl px-5 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {!playing && !finished && index < 0 && (
            <button onClick={() => setPlaying(true)} className="font-body text-sm bg-teal-500 hover:bg-teal-400 px-4 py-2 rounded-lg">▶ Empezar</button>
          )}
          {playing && (
            <button onClick={() => setPlaying(false)} className="font-body text-sm bg-parchment-50 text-ink-800 px-4 py-2 rounded-lg">⏸ Pausa</button>
          )}
          {!playing && !finished && index >= 0 && (
            <button onClick={() => setPlaying(true)} className="font-body text-sm bg-teal-500 hover:bg-teal-400 px-4 py-2 rounded-lg">▶ Continuar</button>
          )}
          {(index >= 0 || finished) && (
            <button onClick={restart} className="font-body text-sm border border-parchment-300 px-3 py-2 rounded-lg">↺ Otra vez</button>
          )}
        </div>
        <div className="flex items-center gap-1">
          {SPEEDS.map((s, i) => (
            <button
              key={s.label}
              onClick={() => setSpeed(i)}
              className={`font-body text-xs px-3 py-1.5 rounded-lg ${speed === i ? 'bg-parchment-50 text-ink-800' : 'text-parchment-200 hover:bg-ink-700'}`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <p className="font-body text-xs text-ink-500">
        Lee en voz alta siguiendo la palabra marcada. Cuando un signo se ponga rojo, haz la pausa: corta en la coma, más larga en el punto.
      </p>

      <div className="font-body text-lg text-ink-800 leading-relaxed space-y-5" style={textStyle}>
        {paragraphs.map((p, pi) => (
          <p key={pi}>
            {p.map(t => {
              k += 1
              const i = k
              const isCurrent = i === index
              const past = i < index || finished
              return (
                <span key={i}>
                  <span
                    className={`rounded px-0.5 transition-colors ${
                      isCurrent ? 'bg-gold-300 text-ink-900' : past ? 'text-ink-800' : 'text-ink-500'
                    }`}
                  >
                    {t.word}
                  </span>
                  {t.punct && (
                    <span
                      className={`font-bold transition-colors ${
                        isCurrent && pausing ? 'text-crimson-500 bg-crimson-200/40 rounded px-0.5' : ''
                      }`}
                    >
                      {t.punct}
                    </span>
                  )}
                  {' '}
                </span>
              )
            })}
          </p>
        ))}
      </div>
    </div>
  )
}
