import { Children, useId, type ReactNode } from 'react'

/** Estante: título, subtítulo, fila con recorrido lateral y repisa de madera. */
export default function Shelf({ title, subtitle, badge, children, empty, footer }: {
  title: string
  subtitle: string
  badge?: ReactNode
  children?: ReactNode
  empty?: string
  footer?: ReactNode
}) {
  const id = useId()
  const hasItems = Children.toArray(children).length > 0
  return (
    <section aria-labelledby={id} className="bg-parchment-50 border border-parchment-200 rounded-xl px-4 pt-4 pb-3 min-w-0">
      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
        <div className="min-w-0">
          <h2 id={id} className="font-display font-semibold text-ink-800">{title}</h2>
          <p className="font-body text-xs text-ink-500">{subtitle}</p>
        </div>
        {badge}
      </div>
      {hasItems ? (
        <div className="flex items-end gap-5 overflow-x-auto px-3 pb-0 pt-3">{children}</div>
      ) : (
        empty && <p className="font-body text-sm text-ink-500 px-3 py-6">{empty}</p>
      )}
      <div aria-hidden className="h-4 rounded bg-gradient-to-b from-[#8a5a33] to-[#6e4524] shadow" />
      {footer && <div className="mt-2">{footer}</div>}
    </section>
  )
}
