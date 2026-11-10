// Contribución de las asignaciones a los PDA (diseño 6.7). Se calcula al consultar.
import type { PdaGrade } from './pda'

export type PdaState = 'logro' | 'abordado' | 'en_curso' | 'pendiente'

export const STATE_LABEL: Record<PdaState, string> = {
  logro: 'Con evidencia de logro',
  abordado: 'Abordado',
  en_curso: 'En curso',
  pendiente: 'Pendiente por trabajar',
}

const RANK: Record<PdaState, number> = { logro: 3, abordado: 2, en_curso: 1, pendiente: 0 }

/** Umbrales del diseño: abordado si lo completó ≥ 60%; logro si además el promedio es ≥ 75. */
export const ABORDADO_MIN = 0.6
export const LOGRO_MIN = 75

export interface ContributionInput {
  assignmentId: string
  readingTitle: string
  createdAt: string
  closed: boolean
  readingPdaIds: string[]
  /** Destinatarios, con su primer intento completado. */
  students: { id: string; grade: PdaGrade | null; completed: boolean; comprehension: number | null }[]
}

export interface Contribution {
  grade: PdaGrade
  pdaIds: string[]
  state: PdaState
  completed: number
  total: number
  avg: number | null
}

export function assignmentContribution(a: ContributionInput, pdaGrade: Map<string, PdaGrade | null>): Contribution[] {
  const grades = [...new Set(a.students.map(s => s.grade).filter((g): g is PdaGrade => g !== null))].sort()
  return grades.map(g => {
    const group = a.students.filter(s => s.grade === g)
    const done = group.filter(s => s.completed)
    const pcts = done.map(s => s.comprehension).filter((x): x is number => x !== null)
    const avg = pcts.length ? pcts.reduce((s, x) => s + x, 0) / pcts.length : null
    const pdaIds = a.readingPdaIds.filter(id => {
      const pg = pdaGrade.get(id)
      return pg === null || pg === g
    })
    let state: PdaState
    if (!a.closed) state = 'en_curso'
    else if (group.length > 0 && done.length / group.length >= ABORDADO_MIN) state = avg !== null && avg >= LOGRO_MIN ? 'logro' : 'abordado'
    else state = 'pendiente'
    return { grade: g, pdaIds, state, completed: done.length, total: group.length, avg }
  })
}

export interface PdaEvidence {
  assignmentId: string
  readingTitle: string
  date: string
  state: PdaState
  completed: number
  total: number
  avg: number | null
}

export type PdaStatusMap = Map<string, { state: PdaState; evidence: PdaEvidence[] }>

/** Mejor estado de cada PDA en un grado, con toda su evidencia ordenada por fecha. */
export function pdaStatuses(
  contribs: (Contribution & { assignmentId: string; readingTitle: string; createdAt: string })[],
  grade: PdaGrade,
): PdaStatusMap {
  const out: PdaStatusMap = new Map()
  for (const c of contribs) {
    if (c.grade !== grade) continue
    for (const id of c.pdaIds) {
      const cur = out.get(id) ?? { state: 'pendiente' as PdaState, evidence: [] }
      if (RANK[c.state] > RANK[cur.state]) cur.state = c.state
      cur.evidence.push({ assignmentId: c.assignmentId, readingTitle: c.readingTitle, date: c.createdAt, state: c.state, completed: c.completed, total: c.total, avg: c.avg })
      out.set(id, cur)
    }
  }
  for (const v of out.values()) v.evidence.sort((x, y) => x.date.localeCompare(y.date))
  return out
}
