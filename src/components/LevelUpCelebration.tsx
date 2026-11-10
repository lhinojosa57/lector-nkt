import { useEffect, useRef, useState } from 'react'
import LevelBadge, { levelMotto } from './LevelBadge'
import { levelName } from '@/lib/lec'
import { markLevelSeen, type LevelUpChange } from '@/lib/levelApi'

/** Felicitación por subir de nivel. Se muestra una sola vez (seen_at). */
export default function LevelUpCelebration({ change, onClose }: { change: LevelUpChange; onClose: () => void }) {
  const btnRef = useRef<HTMLButtonElement>(null)
  const [busy, setBusy] = useState(false)
  useEffect(() => { btnRef.current?.focus() }, [change.id])

  async function close() {
    if (busy) return
    setBusy(true)
    await markLevelSeen(change.id)
    setBusy(false)
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-ink-900/60 flex items-center justify-center p-4"
      onKeyDown={e => { if (e.key === 'Escape') void close() }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="levelup-title"
        className="bg-parchment-50 rounded-2xl w-full max-w-sm border border-parchment-200 p-6 text-center space-y-3"
      >
        <div className="flex justify-center"><LevelBadge level={change.to_level} /></div>
        <h2 id="levelup-title" className="font-display text-xl font-bold text-ink-900">
          ¡Subiste al Nivel {change.to_level} · {levelName(change.to_level)}!
        </h2>
        <p className="font-body text-sm italic text-ink-600">{levelMotto(change.to_level)}</p>
        <p className="font-body text-sm text-ink-700">
          Tu nivel de lectura {change.language === 'es' ? 'en español' : 'en inglés'} subió por tu constancia y tu comprensión.
        </p>
        <button
          ref={btnRef}
          type="button"
          onClick={() => void close()}
          disabled={busy}
          className="w-full bg-teal-600 text-white py-2.5 rounded-lg font-body text-sm font-medium hover:bg-teal-500 disabled:opacity-60"
        >
          ¡Vamos!
        </button>
      </div>
    </div>
  )
}
