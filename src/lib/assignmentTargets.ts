// Quién es destinatario de una asignación (diseño 6.8). Una sola regla para
// la pantalla Asignaciones y para "Cómo les fue".
import { effectiveDueDate, isTarget } from './assignmentRules'

export interface TargetInput {
  assignment: { created_at: string; due_date: string | null }
  targets: { group_id: string | null; student_id: string | null }[]
  membersByGroup: Map<string, { student_id: string; joined_at: string | null }[]>
  bajaDate: Map<string, string | null>
}

/** Sin fila en lec_group_joins se toma como miembro desde siempre. */
const SINCE_ALWAYS = '1970-01-01T12:00:00Z'

export function computeTargets(i: TargetInput): { targets: Set<string>; lateJoiners: Set<string>; groupOf: Map<string, string[]> } {
  const due = effectiveDueDate(i.assignment)
  const targets = new Set<string>()
  const lateJoiners = new Set<string>()
  const groupOf = new Map<string, string[]>()
  const okGroups = new Map<string, string[]>()
  const lateGroups = new Map<string, string[]>()

  for (const t of i.targets) {
    if (t.student_id) {
      const ok = isTarget({ individual: true, joinedAt: null, assignmentCreatedAt: i.assignment.created_at, dueDate: due, bajaDate: i.bajaDate.get(t.student_id) ?? null })
      if (ok) targets.add(t.student_id)
    }
    if (!t.group_id) continue
    for (const m of i.membersByGroup.get(t.group_id) ?? []) {
      const baja = i.bajaDate.get(m.student_id) ?? null
      const ok = isTarget({
        individual: false,
        joinedAt: m.joined_at ?? SINCE_ALWAYS,
        assignmentCreatedAt: i.assignment.created_at,
        dueDate: due,
        bajaDate: baja,
      })
      const bucket = ok ? okGroups : baja === null ? lateGroups : null
      if (ok) targets.add(m.student_id)
      else if (baja === null) lateJoiners.add(m.student_id)
      if (bucket) {
        const gs = bucket.get(m.student_id) ?? []
        if (!gs.includes(t.group_id)) bucket.set(m.student_id, [...gs, t.group_id])
      }
    }
  }
  for (const id of targets) lateJoiners.delete(id)
  // Cada estudiante aparece solo en los grupos por los que le toca: si es destinatario
  // por un grupo, no aparece en otro al que se unió después.
  for (const id of targets) groupOf.set(id, okGroups.get(id) ?? [])
  for (const id of lateJoiners) groupOf.set(id, lateGroups.get(id) ?? [])
  return { targets, lateJoiners, groupOf }
}
