import { BookOpen, Feather, Landmark, Newspaper, ScrollText, type LucideIcon } from 'lucide-react'
import { levelName } from '@/lib/lec'

/** Insignia de cada nivel lector: un ícono y un color propios. */
const BADGES: Record<number, { icon: LucideIcon; ring: string; bg: string; fg: string; motto: string }> = {
  1: { icon: Feather,    ring: 'ring-amber-300',   bg: 'bg-amber-100',   fg: 'text-amber-700',   motto: 'Cada palabra cuenta' },
  2: { icon: ScrollText, ring: 'ring-orange-300',  bg: 'bg-orange-100',  fg: 'text-orange-700',  motto: 'Narra lo que sucede' },
  3: { icon: BookOpen,   ring: 'ring-teal-300',    bg: 'bg-teal-50',     fg: 'text-teal-700',    motto: 'Busca las ideas detrás' },
  4: { icon: Newspaper,  ring: 'ring-sky-300',     bg: 'bg-sky-100',     fg: 'text-sky-700',     motto: 'Lee el mundo y lo explica' },
  5: { icon: Landmark,   ring: 'ring-violet-300',  bg: 'bg-violet-100',  fg: 'text-violet-700',  motto: 'Piensa, cuestiona y valora' },
}

export default function LevelBadge({ level, size = 'md' }: { level: number; size?: 'sm' | 'md' }) {
  const b = BADGES[level] ?? BADGES[2]
  const Icon = b.icon
  const box = size === 'sm' ? 'w-9 h-9' : 'w-14 h-14'
  const icon = size === 'sm' ? 18 : 28
  return (
    <div
      className={`${box} ${b.bg} ${b.fg} ring-2 ${b.ring} rounded-full flex items-center justify-center flex-shrink-0`}
      title={`Nivel ${level} · ${levelName(level)}`}
    >
      <Icon size={icon} strokeWidth={1.8} />
    </div>
  )
}

export function levelMotto(level: number) {
  return (BADGES[level] ?? BADGES[2]).motto
}
