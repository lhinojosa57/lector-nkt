import { describe, it, expect } from 'vitest'
import { assignmentContribution, pdaStatuses, type ContributionInput } from './pdaProgress'

const st = (id: string, grade: 1 | 2 | 3 | null, completed = false, comprehension: number | null = null) => ({ id, grade, completed, comprehension })
const pdaGrade = new Map<string, 1 | 2 | 3 | null>([['p1', 1], ['p2', 2], ['pn', null]])
const base: ContributionInput = { assignmentId: 'a', readingTitle: 'L', createdAt: '2026-11-03T16:00:00Z', closed: true, readingPdaIds: ['p1', 'p2'], students: [] }

describe('assignmentContribution', () => {
  it('multigrado: suma a 1° con su PDA; 3° sin PDA', () => {
    const r = assignmentContribution({
      ...base,
      students: [
        st('a', 1, true, 80), st('b', 1, true, 70), st('c', 1, true, 76), st('d', 1), st('e', 1),
        st('f', 3, true, 90), st('g', 3), st('h', 3), st('i', 3), st('j', 3),
      ],
    }, pdaGrade)
    const g1 = r.find(x => x.grade === 1)!
    expect(g1).toMatchObject({ state: 'logro', pdaIds: ['p1'], completed: 3, total: 5 })
    expect(g1.avg).toBeCloseTo(75.33, 1)
    expect(r.find(x => x.grade === 3)!.pdaIds).toEqual([])
  })
  it('bordes: 60% y promedio 75 exactos → logro', () => {
    const r = assignmentContribution({ ...base, students: [st('a', 1, true, 75), st('b', 1, true, 75), st('c', 1, true, 75), st('d', 1), st('e', 1)] }, pdaGrade)
    expect(r[0].state).toBe('logro')
  })
  it('decimales: 66.67 y 83.33 promedian 75 → logro', () => {
    const r = assignmentContribution({ ...base, students: [st('a', 1, true, 66.67), st('b', 1, true, 83.33)] }, pdaGrade)
    expect(r[0].state).toBe('logro')
  })
  it('menos de 60% → pendiente (se registra como intento)', () => {
    const r = assignmentContribution({ ...base, students: [st('a', 1, true, 100), st('b', 1, true, 100), st('c', 1), st('d', 1), st('e', 1)] }, pdaGrade)
    expect(r[0].state).toBe('pendiente')
  })
  it('abordado sin logro', () => {
    const r = assignmentContribution({ ...base, students: [st('a', 1, true, 60), st('b', 1, true, 70), st('c', 1, true, 74)] }, pdaGrade)
    expect(r[0].state).toBe('abordado')
  })
  it('no cerrada → en curso', () => {
    const r = assignmentContribution({ ...base, closed: false, students: [st('a', 1, true, 100)] }, pdaGrade)
    expect(r[0].state).toBe('en_curso')
  })
  it('PDA sin grado cuenta en cualquier grado; sin grado no entra', () => {
    const r = assignmentContribution({ ...base, readingPdaIds: ['pn'], students: [st('a', 2, true, 90), st('b', null, true, 90)] }, pdaGrade)
    expect(r).toHaveLength(1)
    expect(r[0]).toMatchObject({ grade: 2, pdaIds: ['pn'], state: 'logro', total: 1 })
  })
})

describe('pdaStatuses', () => {
  it('gana el mejor estado y junta la evidencia por fecha', () => {
    const c = (id: string, createdAt: string, state: 'abordado' | 'logro') =>
      ({ assignmentId: id, readingTitle: id, createdAt, grade: 1 as const, pdaIds: ['p1'], state, completed: 3, total: 4, avg: 80 })
    const m = pdaStatuses([c('b', '2026-11-05T10:00:00Z', 'logro'), c('a', '2026-11-01T10:00:00Z', 'abordado')], 1)
    expect(m.get('p1')!.state).toBe('logro')
    expect(m.get('p1')!.evidence.map(e => e.assignmentId)).toEqual(['a', 'b'])
  })
  it('solo el grado pedido', () => {
    const m = pdaStatuses([{ assignmentId: 'a', readingTitle: 'a', createdAt: '2026-11-01T10:00:00Z', grade: 2, pdaIds: ['p2'], state: 'logro', completed: 1, total: 1, avg: 90 }], 1)
    expect(m.size).toBe(0)
  })
})
