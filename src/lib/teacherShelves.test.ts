import { describe, it, expect } from 'vitest'
import { filterReadings, splitTeacherShelves, pastAssignments, type ShelfReadingRow, type ReadingFilters } from './teacherShelves'

const r = (o: Partial<ShelfReadingRow>): ShelfReadingRow => ({
  id: 'x', title: 'T', language: 'es', subject: 'Español', topic: null, text_type: null, source: null,
  created_by: 'me', status: 'published', cover_path: null, created_at: '2026-11-01T00:00:00Z',
  updated_at: '2026-11-01T00:00:00Z', levels: [2], ...o,
})
const none: ReadingFilters = { search: '', language: '', subject: '', level: '', status: '' }

describe('filterReadings', () => {
  const rows = [r({ id: 'a', title: 'La Física del sonido', levels: [1, 2] }), r({ id: 'b', title: 'Química', levels: [3] })]
  it('busca sin acentos ni mayúsculas', () => {
    expect(filterReadings(rows, { ...none, search: 'fisica' }).map(x => x.id)).toEqual(['a'])
  })
  it('el nivel debe estar en levels', () => {
    expect(filterReadings(rows, { ...none, level: 3 }).map(x => x.id)).toEqual(['b'])
  })
  it('sin filtros devuelve todo', () => expect(filterReadings(rows, none)).toHaveLength(2))
})

describe('splitTeacherShelves', () => {
  it('mis lecturas con borradores; disponibles sin borradores ajenos; más nuevas primero', () => {
    const rows = [
      r({ id: 'm1', created_by: 'me', status: 'draft', created_at: '2026-11-01T00:00:00Z' }),
      r({ id: 'm2', created_by: 'me', status: 'published', created_at: '2026-11-05T00:00:00Z' }),
      r({ id: 'o1', created_by: 'otra', status: 'published' }),
      r({ id: 'o2', created_by: 'otra', status: 'draft' }),
    ]
    const s = splitTeacherShelves(rows, 'me')
    expect(s.mine.map(x => x.id)).toEqual(['m2', 'm1'])
    expect(s.available.map(x => x.id)).toEqual(['o1'])
  })
  it('vacío', () => expect(splitTeacherShelves([], 'me')).toEqual({ mine: [], available: [] }))
})

describe('pastAssignments', () => {
  const a = (id: string, o: { due_date?: string | null; created_at?: string; archived?: boolean }) => ({
    id, reading_id: 'r', mode: 'silent' as const, due_date: o.due_date ?? null,
    created_at: o.created_at ?? '2026-11-07T18:00:00Z', archived: o.archived ?? false,
    groupNames: [], avgComprehension: null,
  })
  it('solo las cerradas, más recientes primero', () => {
    const rows = [
      a('arch', { archived: true, created_at: '2026-11-08T18:00:00Z' }),
      a('vencida', { due_date: '2026-11-08', created_at: '2026-11-06T18:00:00Z' }),
      a('hoy', { due_date: '2026-11-09' }),
      a('implicitaCerrada', { created_at: '2026-11-01T18:00:00Z' }),
      a('implicitaAbierta', { created_at: '2026-11-05T18:00:00Z' }),
    ]
    expect(pastAssignments(rows, '2026-11-09').map(x => x.id)).toEqual(['arch', 'vencida', 'implicitaCerrada'])
  })
})
