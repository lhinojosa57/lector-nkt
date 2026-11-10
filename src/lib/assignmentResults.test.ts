import { describe, it, expect } from 'vitest'
import { summarizeResults, type ResultAttempt, type ResultStudent, type ResultAnswer, type ResultQuestion } from './assignmentResults'

const st = (id: string, o: Partial<ResultStudent> = {}): ResultStudent =>
  ({ id, name: id, grade: 1, groups: ['g1'], isTarget: true, lateJoiner: false, ...o })
const at = (id: string, student_id: string, o: Partial<ResultAttempt> = {}): ResultAttempt => ({
  id, student_id, completed_at: '2026-11-04T10:00:00Z', mode: 'silent', comprehension_pct: 100,
  drive_file_id: null, wcpm: null, accuracy: null, ...o,
})

describe('summarizeResults', () => {
  it('nadie la hizo', () => {
    const s = summarizeResults([st('a'), st('b'), st('c')], [], [], [])
    expect(s).toMatchObject({ assigned: 3, completed: 0, notDone: 3, avgComprehension: null, medianWcpm: null, avgAccuracy: null, questions: [], hints: [] })
    expect(s.rows.map(r => r.status)).toEqual(['no la hizo', 'no la hizo', 'no la hizo'])
  })

  it('caso normal: cuenta el primer intento completado', () => {
    const s = summarizeResults(
      [st('a'), st('b'), st('c'), st('d')],
      [
        at('1', 'a', { comprehension_pct: 100 }),
        at('2', 'b', { comprehension_pct: 60 }),
        at('3', 'c', { comprehension_pct: 40 }),
        at('4', 'd', { comprehension_pct: 80, completed_at: '2026-11-04T09:00:00Z' }),
        at('5', 'd', { comprehension_pct: 20, completed_at: '2026-11-05T09:00:00Z' }),
        at('6', 'a', { completed_at: null, comprehension_pct: null }),
      ],
      [], [],
    )
    expect(s.completed).toBe(4)
    expect(s.notDone).toBe(0)
    expect(s.avgComprehension).toBe(70)
    expect(s.lights).toEqual({ green: 2, yellow: 1, red: 1 })
  })

  it('mediana de fluidez, precisión y revisiones', () => {
    const aloud = { mode: 'aloud' as const, drive_file_id: 'f' }
    const s = summarizeResults(
      [st('a'), st('b'), st('c'), st('d')],
      [
        at('1', 'a', { ...aloud, wcpm: 90, accuracy: 96 }),
        at('2', 'b', { ...aloud, wcpm: 150, accuracy: 98 }),
        at('3', 'c', { ...aloud, wcpm: 120, accuracy: 100 }),
        at('4', 'd', { ...aloud }),
      ],
      [], [],
    )
    expect(s.medianWcpm).toBe(120)
    expect(s.avgAccuracy).toBe(98)
    expect(s.aloudTotal).toBe(4)
    expect(s.aloudReviewed).toBe(3)
    expect(s.rows.find(r => r.studentId === 'd')?.needsReview).toBe(true)
    const two = summarizeResults([st('a'), st('b')], [at('1', 'a', { ...aloud, wcpm: 90 }), at('2', 'b', { ...aloud, wcpm: 120 })], [], [])
    expect(two.medianWcpm).toBe(105)
  })

  it('preguntas de la más difícil a la más fácil, con pista', () => {
    const students = ['a', 'b', 'c', 'd'].map(id => st(id))
    const attempts = students.map((x, i) => at(String(i), x.id))
    const questions: ResultQuestion[] = [
      { id: 'q1', position: 0, text: '¿Quién?', skill: 'literal' },
      { id: 'q2', position: 1, text: '¿Por qué?', skill: 'inferencial' },
    ]
    const answers: ResultAnswer[] = attempts.flatMap((a, i) => [
      { attempt_id: a.id, question_id: 'q1', is_correct: i < 3 },
      { attempt_id: a.id, question_id: 'q2', is_correct: i < 1 },
    ])
    const s = summarizeResults(students, attempts, answers, questions)
    expect(s.questions.map(q => [q.id, q.pctCorrect, q.n])).toEqual([['q2', 25, 2], ['q1', 75, 1]])
    expect(s.hints).toEqual(['💡 La pregunta 2 (tipo: Inferencial) la acertó menos de la mitad del grupo: puede valer la pena comentarla en clase'])
  })

  it('quien se unió después: en la tabla y el promedio, no en N de M', () => {
    const s = summarizeResults(
      [st('a'), st('z', { isTarget: false, lateJoiner: true })],
      [at('1', 'a', { comprehension_pct: 100 }), at('2', 'z', { comprehension_pct: 50 })],
      [], [],
    )
    expect(s.assigned).toBe(1)
    expect(s.completed).toBe(1)
    expect(s.avgComprehension).toBe(75)
    expect(s.rows.map(r => r.status)).toEqual(['hecha', 'se unió después'])
  })

  it('grado null no rompe', () => {
    const s = summarizeResults([st('b', { grade: null }), st('a')], [at('1', 'b')], [], [])
    expect(s.rows.map(r => r.studentId)).toEqual(['a', 'b'])
    expect(s.completed).toBe(1)
  })
})
