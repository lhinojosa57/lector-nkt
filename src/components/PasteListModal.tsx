import { useMemo, useState } from 'react'
import { parseRosterPaste } from '@/lib/roster'
import { applyPaste } from '@/lib/rosterApi'

type Mode = 'grados' | 'bajas'

/** Diálogo "Pegar lista": grados (correo, grado) o bajas (correo). */
export default function PasteListModal({ cycle, onClose, onApplied }: {
  cycle: string
  onClose: () => void
  onApplied: () => void
}) {
  const [mode, setMode] = useState<Mode>('grados')
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<{ updated: number; notFound: string[] } | null>(null)

  const preview = useMemo(() => parseRosterPaste(text), [text])
  const usable = mode === 'grados' ? preview.rows.filter(r => r.grade !== null) : preview.rows
  const withoutGrade = mode === 'grados' ? preview.rows.filter(r => r.grade === null) : []

  async function apply() {
    setBusy(true)
    setError('')
    try {
      const r = await applyPaste(text, mode, cycle)
      setResult({ updated: r.updated, notFound: r.notFound })
      onApplied()
    } catch (err) {
      console.error(err)
      setError('No se pudo aplicar la lista. Inténtalo de nuevo.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-ink-900/50 flex items-center justify-center p-4"
      onKeyDown={e => { if (e.key === 'Escape') onClose() }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="paste-title"
        aria-describedby="paste-desc"
        className="bg-parchment-50 rounded-xl w-full max-w-lg border border-parchment-200 p-6 space-y-4 max-h-[90vh] overflow-y-auto"
      >
        <h2 id="paste-title" className="font-display text-lg font-bold text-ink-800">Pegar lista · ciclo {cycle}</h2>

        <div role="radiogroup" aria-label="Tipo de lista" className="flex gap-2">
          {(['grados', 'bajas'] as Mode[]).map(m => (
            <button
              key={m}
              role="radio"
              aria-checked={mode === m}
              onClick={() => { setMode(m); setResult(null) }}
              className={`font-body text-sm px-3 py-1.5 rounded-lg border ${
                mode === m ? 'bg-teal-600 border-teal-600 text-white' : 'border-parchment-300 text-ink-700 hover:bg-parchment-100'
              }`}
            >
              {m === 'grados' ? 'Grados' : 'Bajas'}
            </button>
          ))}
        </div>

        <p id="paste-desc" className="font-body text-sm text-ink-600">
          {mode === 'grados'
            ? 'Pega dos columnas: correo y grado (por ejemplo 7°, 2 o Tercero). Puedes copiarlas de una hoja de cálculo o de Classroom.'
            : 'Pega los correos de los estudiantes que se dan de baja, uno por renglón. Su historial se conserva.'}
        </p>

        <textarea
          autoFocus
          aria-label="Lista pegada"
          value={text}
          onChange={e => { setText(e.target.value); setResult(null) }}
          rows={8}
          placeholder={mode === 'grados' ? 'ana.lopez@nikolatesla.edu.mx\t7°' : 'ana.lopez@nikolatesla.edu.mx'}
          className="w-full border border-parchment-300 rounded-lg px-3 py-2 font-mono text-sm text-ink-800 bg-white focus:border-teal-400"
        />

        {text.trim() && (
          <div aria-live="polite" className="font-body text-sm text-ink-700 space-y-1">
            <p>
              <strong>{usable.length}</strong> {usable.length === 1 ? 'fila válida' : 'filas válidas'}
              {preview.invalid.length + withoutGrade.length > 0 && <> · <strong className="text-crimson-500">{preview.invalid.length + withoutGrade.length}</strong> con problema</>}
            </p>
            {preview.invalid.length > 0 && (
              <ul className="text-xs text-crimson-500 list-disc pl-5">
                {preview.invalid.map(i => <li key={i.line}>Renglón {i.line}: <span className="font-mono">{i.text}</span></li>)}
              </ul>
            )}
            {withoutGrade.length > 0 && (
              <p className="text-xs text-crimson-500">Sin grado: {withoutGrade.map(r => r.email).join(', ')}</p>
            )}
          </div>
        )}

        {result && (
          <div role="status" className="font-body text-sm bg-teal-50 text-teal-800 border border-teal-200 rounded-lg px-3 py-2 space-y-1">
            <p>Se {result.updated === 1 ? 'actualizó 1 estudiante' : `actualizaron ${result.updated} estudiantes`}.</p>
            {result.notFound.length > 0 && (
              <p className="text-crimson-500">No encontramos estos correos: {result.notFound.join(', ')}</p>
            )}
          </div>
        )}
        {error && <p role="alert" className="font-body text-sm text-crimson-500">{error}</p>}

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 border border-parchment-300 text-ink-700 py-2.5 rounded-lg font-body text-sm hover:bg-sepia-100">
            {result ? 'Cerrar' : 'Cancelar'}
          </button>
          <button
            onClick={apply}
            disabled={usable.length === 0 || busy}
            className="flex-1 bg-teal-600 text-white py-2.5 rounded-lg font-body text-sm font-medium hover:bg-teal-500 disabled:opacity-40"
          >
            {busy ? 'Aplicando…' : mode === 'grados' ? 'Aplicar grados' : 'Dar de baja'}
          </button>
        </div>
      </div>
    </div>
  )
}
