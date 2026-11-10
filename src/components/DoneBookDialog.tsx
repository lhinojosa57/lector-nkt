import { useEffect, useRef } from 'react'
import ReadingCover from './ReadingCover'
import { comprehensionLight, modeLabel } from '@/lib/lec'
import type { DoneBook } from '@/lib/shelves'
import type { ShelfReading } from '@/lib/studentShelvesApi'

/** Ficha de una lectura realizada (al tocar su costilla). */
export default function DoneBookDialog({ book, onClose, onReadAgain }: {
  book: DoneBook & { reading: ShelfReading }
  onClose: () => void
  onReadAgain: () => void
}) {
  const closeRef = useRef<HTMLButtonElement>(null)
  useEffect(() => { closeRef.current?.focus() }, [])
  const { latest, reading, times } = book
  const light = latest.comprehension !== null ? comprehensionLight(latest.comprehension) : null
  const titleId = `done-${book.readingId}`

  return (
    <div
      className="fixed inset-0 z-50 bg-ink-900/50 flex items-center justify-center p-4"
      onClick={onClose}
      onKeyDown={e => { if (e.key === 'Escape') onClose() }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={e => e.stopPropagation()}
        className="bg-parchment-50 rounded-xl w-full max-w-md border border-parchment-200 p-5 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex gap-4">
          <ReadingCover title={reading.title} subject={reading.subject} coverPath={reading.coverPath} size="md" className="hidden sm:block" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <h2 id={titleId} className="font-display text-lg font-bold text-ink-900 leading-tight break-words">{reading.title}</h2>
            <p className="font-body text-xs text-ink-500">
              {reading.subject} · {modeLabel(latest.mode)} · {new Date(latest.completedAt).toLocaleDateString('es-MX', { timeZone: 'America/Mexico_City' })}
            </p>
            {latest.comprehension !== null && light ? (
              <p className="font-body text-sm text-ink-800">
                Comprensión: <strong>{Math.round(latest.comprehension)}%</strong> · {light.label}
              </p>
            ) : (
              <p className="font-body text-sm text-ink-500">Esta lectura no tenía preguntas.</p>
            )}
            {latest.wcpm !== null && (
              <p className="font-body text-sm text-ink-800">
                Fluidez: <strong>{Math.round(latest.wcpm)}</strong> palabras correctas por minuto
                {latest.accuracy !== null && <> · {Math.round(latest.accuracy)}% de precisión</>}
              </p>
            )}
            {latest.mode === 'aloud' && latest.wcpm === null && (
              <p className="font-body text-xs text-ink-500">Tu docente todavía no revisa tu grabación.</p>
            )}
            {latest.comment && (
              <p className="font-body text-sm text-ink-600 italic">Tu docente: “{latest.comment}”</p>
            )}
            {times > 1 && <p className="font-body text-xs text-ink-500">La leíste {times} veces</p>}
          </div>
        </div>
        <div className="flex gap-3 mt-5">
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="flex-1 border border-parchment-300 text-ink-700 py-2.5 rounded-lg font-body text-sm hover:bg-sepia-100"
          >
            Cerrar
          </button>
          <button
            type="button"
            onClick={onReadAgain}
            className="flex-1 bg-teal-600 text-white py-2.5 rounded-lg font-body text-sm font-medium hover:bg-teal-500"
          >
            Volver a leer
          </button>
        </div>
      </div>
    </div>
  )
}
