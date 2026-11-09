/**
 * Reglas comunes de asignaciones (diseño 2026-11-09, sección 6.8):
 * fechas en día de México, cierre y quién es destinatario.
 * Las fechas se manejan como texto 'YYYY-MM-DD' y se comparan como texto.
 */

const TZ = 'America/Mexico_City'
const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' })

/** Días que tiene una asignación sin fecha límite antes de cerrarse. */
export const IMPLICIT_DUE_DAYS = 7

export function localDate(ts: string | Date): string {
  return fmt.format(typeof ts === 'string' ? new Date(ts) : ts)
}

export function todayLocal(): string {
  return localDate(new Date())
}

function addDays(ymd: string, days: number): string {
  const [y, m, d] = ymd.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10)
}

export function effectiveDueDate(a: { due_date: string | null; created_at: string }): string {
  return a.due_date ?? addDays(localDate(a.created_at), IMPLICIT_DUE_DAYS)
}

export function isClosed(a: { due_date: string | null; created_at: string; archived: boolean }, today: string): boolean {
  return a.archived || effectiveDueDate(a) < today
}

export function isTarget(p: {
  individual: boolean
  joinedAt: string | null
  assignmentCreatedAt: string
  dueDate: string
  bajaDate: string | null
}): boolean {
  const member = p.individual || (p.joinedAt !== null && localDate(p.joinedAt) <= localDate(p.assignmentCreatedAt))
  const droppedBeforeDue = p.bajaDate !== null && p.bajaDate <= p.dueDate
  return member && !droppedBeforeDue
}
