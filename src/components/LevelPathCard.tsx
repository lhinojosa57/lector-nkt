import { levelName, type Language } from '@/lib/lec'
import type { LevelProgress } from '@/lib/levelApi'

function Bar({ label, value, ok }: { label: string; value: number; ok: boolean }) {
  const pct = Math.max(0, Math.min(100, Math.round(value * 100)))
  return (
    <div>
      <p className="font-body text-xs text-ink-700">{label}</p>
      <div className="mt-1 h-2 rounded-full bg-parchment-200 overflow-hidden" aria-hidden>
        <div className={`h-full rounded-full ${ok ? 'bg-emerald-500' : 'bg-amber-400'}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

/** Tarjeta "Camino al Nivel N+1" con las mismas cuentas de la regla de subida. */
export default function LevelPathCard({ language, progress }: { language: Language; progress: LevelProgress | null }) {
  if (!progress) return null
  const langLabel = language === 'es' ? 'Español' : 'Inglés'
  const box = 'bg-parchment-50 border border-parchment-200 rounded-xl p-3 space-y-2 min-w-0'

  if (progress.provisional) {
    return (
      <div className={box}>
        <p className="font-body text-[11px] uppercase tracking-wide text-ink-400">{langLabel}</p>
        <p className="font-body text-sm text-ink-700">Haz tu diagnóstico para ubicar tu nivel</p>
      </div>
    )
  }
  if (progress.max) {
    return (
      <div className={box}>
        <p className="font-body text-[11px] uppercase tracking-wide text-ink-400">{langLabel}</p>
        <p className="font-body text-sm text-ink-700">Llegaste al nivel más alto</p>
      </div>
    )
  }

  const next = progress.level + 1
  const c = progress.comprehension
  const k = progress.compliance
  const compLabel = c.considered < c.needCount
    ? `📖 Llevas ${c.considered} de ${c.needCount} lecturas en tu nivel`
    : `📖 Comprensión: ${c.greens} de tus últimas ${c.considered} en verde · necesitas ${c.needGreens}`
  const compValue = c.considered < c.needCount ? c.considered / c.needCount : Math.min(1, c.greens / c.needGreens)
  const kLabel = k.counted === 0
    ? '✅ Sin asignadas vencidas'
    : `✅ Cumplimiento: ${k.completed} de ${k.counted} asignadas · necesitas 80%`
  const kValue = k.counted === 0 ? 1 : k.completed / k.counted

  return (
    <div className={box}>
      <p className="font-body text-[11px] uppercase tracking-wide text-ink-400">{langLabel}</p>
      <p className="font-display text-sm font-semibold text-ink-800">Camino al Nivel {next} · {levelName(next)}</p>
      <Bar label={compLabel} value={compValue} ok={c.ok} />
      <Bar label={kLabel} value={kValue} ok={k.ok} />
      {!progress.accuracy.ok && (
        <p className="font-body text-xs text-ink-700">🎙️ Cuida tu precisión en voz alta: necesitas 95% o más</p>
      )}
    </div>
  )
}
