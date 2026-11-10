import { describe, it, expect } from 'vitest'
import { pickSuggestions, groupDoneByReading, fluencyGain, pagesFromWords, sortPendingAssignments, type DoneAttempt } from './shelves'

const c = (id: string, language: 'es' | 'en', levels: number[]) => ({ id, language, levels })

describe('pickSuggestions', () => {
  const cands = [c('a', 'es', [2]), c('b', 'es', [1]), c('c', 'es', [3]), c('d', 'en', [2]), c('e', 'es', [2]), c('f', 'es', [2])]
  it('solo de su nivel o uno abajo, sin las ya leídas, máximo 3', () => {
    const r = pickSuggestions(cands, new Set(['e']), { es: 2 }, 'x')
    expect(r.length).toBe(3)
    expect(r).not.toContain('c')
    expect(r).not.toContain('e')
    expect(r).not.toContain('d') // no tiene nivel en inglés
  })
  it('mezcla idiomas: al menos una de cada uno', () => {
    const r = pickSuggestions(cands, new Set(), { es: 2, en: 2 }, 'x')
    expect(r).toContain('d')
    expect(r.some(id => id !== 'd')).toBe(true)
  })
  it('determinista con la misma semilla y cambia con otra', () => {
    const many = Array.from({ length: 20 }, (_, i) => c(`r${i}`, 'es', [2]))
    expect(pickSuggestions(many, new Set(), { es: 2 }, 's1')).toEqual(pickSuggestions(many, new Set(), { es: 2 }, 's1'))
    expect(pickSuggestions(many, new Set(), { es: 2 }, 's1')).not.toEqual(pickSuggestions(many, new Set(), { es: 2 }, 's2'))
  })
  it('sin candidatas devuelve lista vacía', () => {
    expect(pickSuggestions([], new Set(), { es: 2 }, 'x')).toEqual([])
  })
})

const at = (o: Partial<DoneAttempt>): DoneAttempt => ({
  attemptId: 'x', readingId: 'r', completedAt: '2026-11-01T10:00:00Z', mode: 'silent',
  comprehension: 80, wcpm: null, accuracy: null, comment: null, words: 200, ...o,
})

describe('groupDoneByReading', () => {
  it('una por lectura con el intento más reciente y cuántas veces', () => {
    const r = groupDoneByReading([
      at({ attemptId: '1', readingId: 'A', completedAt: '2026-11-01T10:00:00Z', comprehension: 50 }),
      at({ attemptId: '2', readingId: 'B', completedAt: '2026-11-03T10:00:00Z' }),
      at({ attemptId: '3', readingId: 'A', completedAt: '2026-11-05T10:00:00Z', comprehension: 90 }),
    ])
    expect(r.map(b => b.readingId)).toEqual(['A', 'B'])
    expect(r[0].latest.attemptId).toBe('3')
    expect(r[0].times).toBe(2)
  })
  it('vacío → vacío', () => expect(groupDoneByReading([])).toEqual([]))
})

describe('fluencyGain', () => {
  it('compara primera y última del idioma', () => {
    expect(fluencyGain([
      { language: 'es', reviewedAt: '2026-11-05T00:00:00Z', wcpm: 144 },
      { language: 'es', reviewedAt: '2026-11-01T00:00:00Z', wcpm: 98 },
      { language: 'en', reviewedAt: '2026-11-02T00:00:00Z', wcpm: 60 },
    ], 'es')).toEqual({ first: 98, last: 144, delta: 46 })
  })
  it('menos de 2 revisiones → null', () => {
    expect(fluencyGain([{ language: 'es', reviewedAt: '2026-11-01T00:00:00Z', wcpm: 98 }], 'es')).toBeNull()
  })
})

describe('pagesFromWords', () => {
  it.each([[0, 0], [100, 1], [9450, 38], [250, 1]])('%i palabras → %i páginas', (w, p) => expect(pagesFromWords(w)).toBe(p))
})

describe('sortPendingAssignments', () => {
  it('la más reciente primero', () => {
    const r = sortPendingAssignments([{ created_at: '2026-11-01T00:00:00Z' }, { created_at: '2026-11-08T00:00:00Z' }])
    expect(r[0].created_at).toBe('2026-11-08T00:00:00Z')
  })
})
