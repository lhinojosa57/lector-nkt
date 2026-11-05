import { useEffect, useId, useRef, useState } from 'react'
import { SIZE_LABELS, type ReadingPrefs } from '@/lib/prefs'

/** Botón "Aa": tamaño de letra, contraste y espacio entre renglones. */
export default function ReadingPrefsControl({ prefs, update }: {
  prefs: ReadingPrefs
  update: (p: Partial<ReadingPrefs>) => void
}) {
  const [open, setOpen] = useState(false)
  const panelId = useId()
  const btnRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setOpen(false); btnRef.current?.focus() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const chip = (active: boolean) =>
    `font-body text-sm px-3 py-1.5 rounded-lg border ${active ? 'bg-ink-800 text-parchment-50 border-ink-800' : 'border-parchment-300 text-ink-700 bg-white hover:bg-parchment-100'}`

  return (
    <div className="relative">
      <button
        ref={btnRef}
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        aria-controls={panelId}
        className="font-body text-sm px-3 py-1.5 rounded-lg border border-parchment-300 text-ink-700 hover:bg-parchment-100"
      >
        <span aria-hidden>Aa</span>
        <span className="sr-only-lec">Ajustes de lectura: tamaño de letra y contraste</span>
      </button>
      {open && (
        <div
          id={panelId}
          role="group"
          aria-label="Ajustes de lectura"
          className="absolute right-0 top-full mt-2 z-40 w-72 bg-parchment-50 border border-parchment-300 rounded-xl shadow-raised p-4 space-y-4"
        >
          <fieldset>
            <legend className="font-body text-xs font-semibold text-ink-700 mb-2">Tamaño de letra</legend>
            <div className="flex flex-wrap gap-2">
              {SIZE_LABELS.map((label, i) => (
                <button
                  key={label}
                  onClick={() => update({ size: i as ReadingPrefs['size'] })}
                  aria-pressed={prefs.size === i}
                  className={chip(prefs.size === i)}
                  style={{ fontSize: `${0.8 + i * 0.15}rem` }}
                >
                  {label}
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend className="font-body text-xs font-semibold text-ink-700 mb-2">Colores</legend>
            <div className="flex flex-wrap gap-2">
              {([['normal', 'Normal'], ['high', 'Contraste alto'], ['dark', 'Oscuro']] as const).map(([v, label]) => (
                <button key={v} onClick={() => update({ theme: v })} aria-pressed={prefs.theme === v} className={chip(prefs.theme === v)}>
                  {label}
                </button>
              ))}
            </div>
          </fieldset>
          <label className="flex items-center gap-2 font-body text-sm text-ink-800">
            <input type="checkbox" checked={prefs.spacious} onChange={e => update({ spacious: e.target.checked })} />
            Más espacio entre renglones
          </label>
          <button onClick={() => { setOpen(false); btnRef.current?.focus() }} className="w-full font-body text-xs text-ink-500 hover:text-ink-700">
            Cerrar
          </button>
        </div>
      )}
    </div>
  )
}
