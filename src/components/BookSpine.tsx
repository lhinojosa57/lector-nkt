import { subjectStyle } from '@/lib/covers'
import type { Light } from '@/lib/lec'

const DOT: Record<Light, string> = { green: 'bg-emerald-500', yellow: 'bg-amber-400', red: 'bg-red-500' }

/** Costilla de un libro realizado. La altura varía un poco con la extensión, solo por estética. */
export default function BookSpine({ title, subject, words, light, pct, onClick }: {
  title: string
  subject: string
  words: number
  light: Light | null
  pct: number | null
  onClick: () => void
}) {
  const st = subjectStyle(subject)
  const height = 160 + Math.min(40, Math.round((words || 0) / 50))
  const label = `${title}, ${subject}, ${pct !== null ? `comprensión ${Math.round(pct)}%` : 'sin preguntas'}`
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={title}
      className="relative shrink-0 w-10 rounded-[3px] flex flex-col items-center justify-between py-2 hover:-translate-y-2 focus-visible:-translate-y-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 transition motion-reduce:transform-none motion-reduce:transition-none"
      style={{ height, background: st.bg, color: st.fg, boxShadow: 'inset -3px 0 6px rgba(0,0,0,.25), 1px 2px 4px rgba(0,0,0,.2)' }}
    >
      <span aria-hidden className="flex-1 min-h-0 overflow-hidden font-display text-xs font-semibold leading-none [writing-mode:vertical-rl] rotate-180 truncate">
        {title}
      </span>
      <span aria-hidden className={`mt-2 w-3 h-3 shrink-0 rounded-full ring-2 ring-white/70 ${light ? DOT[light] : 'bg-parchment-300'}`} />
    </button>
  )
}
