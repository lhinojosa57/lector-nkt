import { useState } from 'react'
import { subjectStyle } from '@/lib/covers'
import { coverUrl } from '@/lib/coverApi'

type Size = 'sm' | 'md' | 'lg'

const WIDTH: Record<Size, string> = { sm: 'w-12', md: 'w-[140px]', lg: 'w-[180px]' }
const SPINE = 'inset 6px 0 8px -4px rgba(0,0,0,.35), 2px 4px 10px rgba(0,0,0,.18)'

/**
 * Portada de una lectura: la imagen que subió el docente o, si no hay (o no carga),
 * una portada provisional con el color y el motivo de su materia.
 */
export default function ReadingCover({ title, subject, coverPath, size = 'md', className = '' }: {
  title: string
  subject: string
  coverPath: string | null
  size?: Size
  className?: string
}) {
  const [failedPath, setFailedPath] = useState<string | null>(null)
  const url = coverPath && failedPath !== coverPath ? coverUrl(coverPath) : null
  const base = `relative shrink-0 aspect-[2/3] overflow-hidden rounded-[3px_6px_6px_3px] ${WIDTH[size]} ${className}`

  if (url) {
    return (
      <div className={base} style={{ boxShadow: SPINE }}>
        <img
          src={url}
          alt={`Portada de ${title}`}
          loading="lazy"
          onError={() => setFailedPath(coverPath)}
          className="absolute inset-0 w-full h-full object-cover"
        />
        <span aria-hidden className="absolute inset-0" style={{ boxShadow: 'inset 6px 0 8px -4px rgba(0,0,0,.35)' }} />
      </div>
    )
  }

  const st = subjectStyle(subject)
  return (
    <div
      role="img"
      lang="es"
      aria-label={`Portada de ${title}`}
      className={`${base} flex flex-col justify-between ${size === 'sm' ? '' : 'pb-3'}`}
      style={{ background: st.bg, color: st.fg, boxShadow: SPINE }}
    >
      <span
        aria-hidden
        className={`absolute pointer-events-none select-none ${size === 'sm' ? 'inset-0 flex items-center justify-center text-xl opacity-60' : '-right-3 -bottom-3 text-7xl opacity-20'}`}
      >
        {st.motif}
      </span>
      {size !== 'sm' && (
        <>
          <span className="relative px-3 pl-4 pt-3 font-body text-[10px] uppercase tracking-wider opacity-90 line-clamp-2">{subject}</span>
          {/* Sin padding abajo: si lo llevara, la 5ª línea recortada se asomaría por él (el espacio lo da la portada). */}
          <span className={`relative px-3 pl-4 font-display font-bold leading-tight line-clamp-4 break-words hyphens-auto ${size === 'lg' ? 'text-lg' : 'text-base'}`}>
            {title}
          </span>
        </>
      )}
    </div>
  )
}
