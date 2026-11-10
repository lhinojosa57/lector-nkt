// Lógica pura de la Biblioteca del docente: filtros y los tres estantes.
import { isClosed } from './assignmentRules'
import type { Language, LecReading, ReadingMode } from './lec'

export interface ShelfReadingRow extends LecReading {
  levels: number[]
}

export interface ReadingFilters {
  search: string
  language: Language | ''
  subject: string
  level: number | ''
  status: '' | 'draft' | 'published'
}

/** Minúsculas y sin acentos, para buscar "fisica" y encontrar "Física". */
export function fold(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

export function filterReadings(rows: ShelfReadingRow[], f: ReadingFilters): ShelfReadingRow[] {
  const q = fold(f.search.trim())
  return rows.filter(r =>
    (!q || fold(r.title).includes(q) || fold(r.topic ?? '').includes(q)) &&
    (!f.language || r.language === f.language) &&
    (!f.subject || r.subject === f.subject) &&
    (!f.level || r.levels.includes(f.level)) &&
    (!f.status || r.status === f.status)
  )
}

const newestFirst = <T extends { created_at: string }>(a: T, b: T) => b.created_at.localeCompare(a.created_at)

export function splitTeacherShelves(rows: ShelfReadingRow[], teacherId: string): { mine: ShelfReadingRow[]; available: ShelfReadingRow[] } {
  return {
    mine: rows.filter(r => r.created_by === teacherId).sort(newestFirst),
    available: rows.filter(r => r.created_by !== teacherId && r.status === 'published').sort(newestFirst),
  }
}

export interface PastAssignmentInput {
  id: string
  reading_id: string
  mode: ReadingMode
  due_date: string | null
  created_at: string
  archived: boolean
  groupNames: string[]
  avgComprehension: number | null
}

/** Asignaciones ya cerradas, de la más reciente a la más vieja. */
export function pastAssignments<T extends PastAssignmentInput>(rows: T[], today: string): T[] {
  return rows.filter(a => isClosed(a, today)).sort(newestFirst)
}
