// Lógica pura de "Mi biblioteca" del estudiante (estantes, sugerencias e indicadores).
import type { Language, ReadingMode } from './lec'
import type { LevelProgress } from './levelApi'

export interface SuggestionCandidate {
  id: string
  language: Language
  levels: number[]
}

/** FNV-1a de 32 bits: barajado determinista (la misma semilla da el mismo orden). */
function fnv1a(s: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return h
}

/**
 * Elige hasta `n` lecturas para "Entrenamiento libre": de su nivel o uno abajo,
 * sin las que ya leyó. Si hay elegibles en dos idiomas, al menos una de cada uno.
 */
export function pickSuggestions(
  cands: SuggestionCandidate[],
  doneReadingIds: Set<string>,
  levels: Partial<Record<Language, number>>,
  seed: string,
  n = 3,
): string[] {
  const eligible = cands.filter(c => {
    const lv = levels[c.language]
    if (lv === undefined || doneReadingIds.has(c.id)) return false
    return c.levels.includes(lv) || c.levels.includes(lv - 1)
  })
  const sorted = eligible
    .map(c => ({ c, h: fnv1a(seed + c.id) }))
    .sort((a, b) => a.h - b.h || a.c.id.localeCompare(b.c.id))
    .map(x => x.c)

  const picked: SuggestionCandidate[] = []
  const langs = [...new Set(sorted.map(c => c.language))]
  if (langs.length >= 2 && n >= 2) {
    for (const lang of langs) {
      const first = sorted.find(c => c.language === lang)
      if (first && picked.length < n) picked.push(first)
    }
  }
  for (const c of sorted) {
    if (picked.length >= n) break
    if (!picked.includes(c)) picked.push(c)
  }
  // Se devuelven en el orden barajado.
  return sorted.filter(c => picked.includes(c)).map(c => c.id)
}

export interface DoneAttempt {
  attemptId: string
  readingId: string
  completedAt: string
  mode: ReadingMode
  comprehension: number | null
  wcpm: number | null
  accuracy: number | null
  comment: string | null
  words: number
}

export interface DoneBook {
  readingId: string
  latest: DoneAttempt
  times: number
}

/** Un libro por lectura (con su intento más reciente), del más reciente al más antiguo. */
export function groupDoneByReading(attempts: DoneAttempt[]): DoneBook[] {
  const map = new Map<string, DoneBook>()
  for (const a of attempts) {
    const b = map.get(a.readingId)
    if (!b) map.set(a.readingId, { readingId: a.readingId, latest: a, times: 1 })
    else {
      b.times += 1
      if (a.completedAt > b.latest.completedAt) b.latest = a
    }
  }
  return [...map.values()].sort((x, y) => y.latest.completedAt.localeCompare(x.latest.completedAt))
}

/** Primera y última revisión de fluidez del idioma; null con menos de 2. */
export function fluencyGain(
  reviews: { language: Language; reviewedAt: string; wcpm: number }[],
  language: Language,
): { first: number; last: number; delta: number } | null {
  const rs = reviews.filter(r => r.language === language).sort((a, b) => a.reviewedAt.localeCompare(b.reviewedAt))
  if (rs.length < 2) return null
  const first = Math.round(rs[0].wcpm)
  const last = Math.round(rs[rs.length - 1].wcpm)
  return { first, last, delta: last - first }
}

export const WORDS_PER_PAGE = 250

export function pagesFromWords(words: number): number {
  if (!words || words <= 0) return 0
  return Math.max(1, Math.round(words / WORDS_PER_PAGE))
}

/** De la más reciente a la más antigua por fecha de asignación. */
export function sortPendingAssignments<T extends { created_at: string }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => b.created_at.localeCompare(a.created_at))
}

/**
 * Lo que la barra no dice: cuando ya hay suficientes en verde pero el promedio no llega,
 * o cuando ya hizo el 80% pero dejó más de 1 sin hacer.
 */
export function levelPathHints(p: LevelProgress): string[] {
  const hints: string[] = []
  const c = p.comprehension
  if (c.considered >= c.needCount && c.greens >= c.needGreens && !c.ok && c.avg !== null) {
    hints.push(`Sube tu promedio: llevas ${Math.round(c.avg)}% y necesitas 80%`)
  }
  const k = p.compliance
  if (k.counted > 0 && !k.ok && k.completed / k.counted >= 0.8 && k.overduePending > 1) {
    hints.push(`Tienes ${k.overduePending} asignadas sin hacer; puedes dejar máximo 1`)
  }
  return hints
}
