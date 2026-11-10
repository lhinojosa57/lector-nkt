// "Cómo les fue": resumen de una asignación (diseño 6.5). Lógica pura.
import { SKILL_LABELS, comprehensionLight, type Light, type ReadingMode, type Skill } from './lec'
import type { Grade } from './roster'

export interface ResultAttempt {
  id: string
  student_id: string
  completed_at: string | null
  mode: ReadingMode
  comprehension_pct: number | null
  drive_file_id: string | null
  wcpm: number | null
  accuracy: number | null
}

export interface ResultAnswer { attempt_id: string; question_id: string; is_correct: boolean }
export interface ResultQuestion { id: string; position: number; text: string; skill: Skill }

export interface ResultStudent {
  id: string
  name: string
  grade: Grade | null
  groups: string[]
  isTarget: boolean
  lateJoiner: boolean
}

export interface StudentRow {
  studentId: string
  name: string
  grade: Grade | null
  status: 'hecha' | 'no la hizo' | 'se unió después'
  attemptId: string | null
  comprehension: number | null
  light: Light | null
  wcpm: number | null
  accuracy: number | null
  needsReview: boolean
  isAloudWithAudio: boolean
}

export interface ResultsSummary {
  assigned: number
  completed: number
  notDone: number
  avgComprehension: number | null
  lights: { green: number; yellow: number; red: number }
  medianWcpm: number | null
  avgAccuracy: number | null
  aloudTotal: number
  aloudReviewed: number
  questions: { id: string; n: number; text: string; skill: Skill; pctCorrect: number; answered: number }[]
  hints: string[]
  rows: StudentRow[]
}

const round1 = (x: number) => Math.round(x * 10) / 10

function median(xs: number[]): number | null {
  if (xs.length === 0) return null
  const s = [...xs].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2
}

/** Los estudiantes llegan ya filtrados por grupo y grado. */
export function summarizeResults(
  students: ResultStudent[],
  attempts: ResultAttempt[],
  answers: ResultAnswer[],
  questions: ResultQuestion[],
): ResultsSummary {
  // Primer intento completado de cada estudiante.
  const first = new Map<string, ResultAttempt>()
  for (const a of attempts) {
    if (!a.completed_at) continue
    const prev = first.get(a.student_id)
    if (!prev || a.completed_at < prev.completed_at!) first.set(a.student_id, a)
  }

  const visible = students.filter(s => s.isTarget || (s.lateJoiner && first.has(s.id)))
  const counted = visible.map(s => first.get(s.id)).filter((a): a is ResultAttempt => !!a)

  const targets = visible.filter(s => s.isTarget)
  const completed = targets.filter(s => first.has(s.id)).length

  const pcts = counted.map(a => a.comprehension_pct).filter((p): p is number => p !== null)
  const lights = { green: 0, yellow: 0, red: 0 }
  for (const p of pcts) lights[comprehensionLight(p).light]++

  const reviewed = counted.filter(a => a.wcpm !== null)
  const accs = reviewed.map(a => a.accuracy).filter((x): x is number => x !== null)
  const aloud = counted.filter(a => a.mode === 'aloud' && a.drive_file_id)
  const med = median(reviewed.map(a => a.wcpm!))

  // Preguntas: solo respuestas de los intentos que cuentan.
  const countedIds = new Set(counted.map(a => a.id))
  const stats = new Map<string, { ok: number; total: number }>()
  for (const ans of answers) {
    if (!countedIds.has(ans.attempt_id)) continue
    const s = stats.get(ans.question_id) ?? { ok: 0, total: 0 }
    s.total++
    if (ans.is_correct) s.ok++
    stats.set(ans.question_id, s)
  }
  const qs = questions
    .filter(q => (stats.get(q.id)?.total ?? 0) > 0)
    .map(q => {
      const s = stats.get(q.id)!
      return { id: q.id, n: q.position + 1, text: q.text, skill: q.skill, pctCorrect: Math.round((100 * s.ok) / s.total), answered: s.total, ratio: s.ok / s.total }
    })
    .sort((a, b) => a.ratio - b.ratio || a.n - b.n)
  const hints = qs
    .filter(q => q.ratio < 0.5)
    .map(q => `💡 La pregunta ${q.n} (tipo: ${SKILL_LABELS[q.skill]}) la acertó menos de la mitad del grupo: puede valer la pena comentarla en clase`)

  const byName = (a: ResultStudent, b: ResultStudent) => a.name.localeCompare(b.name, 'es')
  const ordered = [...targets.sort(byName), ...visible.filter(s => !s.isTarget).sort(byName)]
  const rows: StudentRow[] = ordered.map(s => {
    const a = first.get(s.id) ?? null
    const pct = a?.comprehension_pct ?? null
    const hasAudio = !!a && a.mode === 'aloud' && !!a.drive_file_id
    return {
      studentId: s.id,
      name: s.name,
      grade: s.grade,
      status: !s.isTarget ? 'se unió después' : a ? 'hecha' : 'no la hizo',
      attemptId: a?.id ?? null,
      comprehension: pct,
      light: pct !== null ? comprehensionLight(pct).light : null,
      wcpm: a?.wcpm ?? null,
      accuracy: a?.accuracy ?? null,
      needsReview: hasAudio && a!.wcpm === null,
      isAloudWithAudio: hasAudio,
    }
  })

  return {
    assigned: targets.length,
    completed,
    notDone: targets.length - completed,
    avgComprehension: pcts.length ? round1(pcts.reduce((s, x) => s + x, 0) / pcts.length) : null,
    lights,
    medianWcpm: med === null ? null : Math.round(med),
    avgAccuracy: accs.length ? round1(accs.reduce((s, x) => s + x, 0) / accs.length) : null,
    aloudTotal: aloud.length,
    aloudReviewed: aloud.filter(a => a.wcpm !== null).length,
    questions: qs.map(({ ratio: _r, ...q }) => q),
    hints,
    rows,
  }
}
