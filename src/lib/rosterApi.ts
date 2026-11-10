/** Datos de la pestaña Estudiantes: ciclos, grado y estado por ciclo, uniones a grupo. */
import { supabase } from '@/lib/supabase'
import { parseRosterPaste, type EnrollmentStatus, type Grade } from '@/lib/roster'
import { todayLocal } from '@/lib/assignmentRules'

export interface Cycle {
  cycle: string
  starts_on: string
  ends_on: string
  is_current: boolean
  terms: { name: string; starts_on: string; ends_on: string }[]
}

export interface RosterRow {
  id: string
  full_name: string | null
  email: string
  grade: Grade | null
  status: EnrollmentStatus
  status_date: string | null
  groups: string[]
  levels: { es: number | null; en: number | null }
}

export async function fetchCurrentCycle(): Promise<Cycle> {
  const { data, error } = await supabase.from('lec_cycles').select('*').eq('is_current', true).maybeSingle()
  if (error || !data) throw new Error('No hay un ciclo escolar actual configurado.')
  return data as Cycle
}

export async function fetchRoster(cycle: string): Promise<RosterRow[]> {
  const [profilesRes, enrollRes, membersRes, levelsRes] = await Promise.all([
    supabase.from('profiles').select('id, full_name, email').eq('role', 'student').order('full_name'),
    supabase.from('lec_enrollments').select('student_id, grade, status, status_date').eq('cycle', cycle),
    supabase.from('reading_group_members').select('student_id, reading_groups(name)'),
    supabase.from('lec_student_levels').select('student_id, language, level'),
  ])
  if (profilesRes.error) throw profilesRes.error

  const enroll = new Map<string, { grade: Grade | null; status: EnrollmentStatus; status_date: string | null }>()
  for (const e of (enrollRes.data ?? []) as { student_id: string; grade: Grade | null; status: EnrollmentStatus; status_date: string | null }[]) {
    enroll.set(e.student_id, e)
  }
  const groups = new Map<string, string[]>()
  type M = { student_id: string; reading_groups: { name: string } | { name: string }[] | null }
  for (const m of (membersRes.data ?? []) as unknown as M[]) {
    const g = Array.isArray(m.reading_groups) ? m.reading_groups[0] : m.reading_groups
    if (g) groups.set(m.student_id, [...(groups.get(m.student_id) ?? []), g.name])
  }
  const levels = new Map<string, { es: number | null; en: number | null }>()
  for (const l of (levelsRes.data ?? []) as { student_id: string; language: 'es' | 'en'; level: number }[]) {
    const cur = levels.get(l.student_id) ?? { es: null, en: null }
    cur[l.language] = l.level
    levels.set(l.student_id, cur)
  }

  return ((profilesRes.data ?? []) as { id: string; full_name: string | null; email: string }[]).map(p => {
    const e = enroll.get(p.id)
    return {
      ...p,
      grade: e?.grade ?? null,
      status: e?.status ?? 'activo',
      status_date: e?.status_date ?? null,
      groups: groups.get(p.id) ?? [],
      levels: levels.get(p.id) ?? { es: null, en: null },
    }
  })
}

async function currentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser()
  return data.user?.id ?? null
}

export async function setGrade(studentId: string, cycle: string, grade: Grade | null): Promise<void> {
  const { error } = await supabase.from('lec_enrollments').upsert(
    { student_id: studentId, cycle, grade, updated_by: await currentUserId(), updated_at: new Date().toISOString() },
    { onConflict: 'student_id,cycle' }
  )
  if (error) throw error
}

export async function setStatus(studentId: string, cycle: string, status: EnrollmentStatus, statusDate: string | null): Promise<void> {
  const { error } = await supabase.from('lec_enrollments').upsert(
    { student_id: studentId, cycle, status, status_date: statusDate, updated_by: await currentUserId(), updated_at: new Date().toISOString() },
    { onConflict: 'student_id,cycle' }
  )
  if (error) throw error
}

export async function applyPaste(
  text: string,
  mode: 'grados' | 'bajas',
  cycle: string,
): Promise<{ updated: number; notFound: string[]; invalid: { line: number; text: string }[] }> {
  const { rows, invalid } = parseRosterPaste(text)
  // En modo grados, una fila sin grado no tiene nada que aplicar.
  const usable = mode === 'grados' ? rows.filter(r => r.grade !== null) : rows
  const noGrade = mode === 'grados' ? rows.filter(r => r.grade === null) : []
  if (usable.length === 0) return { updated: 0, notFound: [], invalid: [...invalid, ...noGrade.map(r => ({ line: 0, text: r.email }))] }

  const { data, error } = await supabase.from('profiles').select('id, email').in('email', usable.map(r => r.email))
  if (error) throw error
  const idByEmail = new Map(((data ?? []) as { id: string; email: string }[]).map(p => [p.email.toLowerCase(), p.id]))
  const notFound = usable.filter(r => !idByEmail.has(r.email)).map(r => r.email)
  const by = await currentUserId()
  const now = new Date().toISOString()
  const today = todayLocal()

  const payload = usable.filter(r => idByEmail.has(r.email)).map(r => {
    const base = { student_id: idByEmail.get(r.email)!, cycle, updated_by: by, updated_at: now }
    return mode === 'grados'
      ? { ...base, grade: r.grade }
      : { ...base, status: 'baja' as const, status_date: today }
  })
  if (payload.length) {
    const { error: upErr } = await supabase.from('lec_enrollments').upsert(payload, { onConflict: 'student_id,cycle' })
    if (upErr) throw upErr
  }
  return { updated: payload.length, notFound, invalid: [...invalid, ...noGrade.map(r => ({ line: 0, text: r.email }))] }
}

/** Registra la primera vez que un estudiante se une a un grupo (no reinicia la fecha). */
export async function recordGroupJoin(studentId: string, groupId: string): Promise<void> {
  const { error } = await supabase
    .from('lec_group_joins')
    .upsert({ student_id: studentId, group_id: groupId }, { onConflict: 'student_id,group_id', ignoreDuplicates: true })
  if (error) throw error
}

export async function purgeStudent(studentId: string): Promise<Record<string, number>> {
  const { data, error } = await supabase.rpc('lec_purge_student', { p_student: studentId })
  if (error) throw error
  return (data ?? {}) as Record<string, number>
}

export async function promoteCycle(from: string, to: string): Promise<{ creados: number; bajas_sincronizadas: number }> {
  const { data, error } = await supabase.rpc('lec_promote_cycle', { p_from: from, p_to: to })
  if (error) throw error
  const r = (data ?? {}) as { creados?: number; bajas_sincronizadas?: number }
  return { creados: r.creados ?? 0, bajas_sincronizadas: r.bajas_sincronizadas ?? 0 }
}

/** ¿Ya existe el ciclo siguiente (creado con "Pasar de grado")? */
export async function cycleExists(cycle: string): Promise<boolean> {
  const { data, error } = await supabase.from('lec_cycles').select('cycle').eq('cycle', cycle).maybeSingle()
  if (error) throw error
  return !!data
}

/** Deshace "Pasar de grado": borra el ciclo siguiente si no es el actual y no se ha usado. */
export async function undoPromote(cycle: string): Promise<number> {
  const { data, error } = await supabase.rpc('lec_undo_promote', { p_cycle: cycle })
  if (error) throw error
  return (data as number) ?? 0
}
