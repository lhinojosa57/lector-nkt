// Carga lo necesario para el panel de PDA y el Concentrado de un grupo (docentes).
import { supabase } from './supabase'
import { isClosed, localDate, todayLocal } from './assignmentRules'
import { computeTargets } from './assignmentTargets'
import type { PdaGrade } from './pda'
import { assignmentContribution, pdaStatuses, type Contribution, type PdaStatusMap } from './pdaProgress'

export interface Cycle { cycle: string; starts_on: string; ends_on: string; is_current: boolean; terms: { name: string; starts_on: string; ends_on: string }[] }

export interface PdaProgress {
  /** Grados de los miembros actuales del grupo (ciclo actual). */
  grades: PdaGrade[]
  studentsWithoutGrade: number
  byGrade: Map<PdaGrade, PdaStatusMap>
  assignmentsCount: number
}

const one = <T,>(x: T | T[] | null | undefined): T | null => (Array.isArray(x) ? x[0] ?? null : x ?? null)

export async function fetchCycles(): Promise<Cycle[]> {
  const { data, error } = await supabase.from('lec_cycles').select('cycle, starts_on, ends_on, is_current, terms').order('starts_on')
  if (error) throw error
  return ((data ?? []) as Cycle[]).map(c => ({ ...c, terms: Array.isArray(c.terms) ? c.terms : [] }))
}

/** El ciclo que contiene la fecha (día local); si ninguno, el actual. */
export function cycleFor(cycles: Cycle[], ymd: string): Cycle | null {
  return cycles.find(c => c.starts_on <= ymd && ymd <= c.ends_on) ?? cycles.find(c => c.is_current) ?? null
}

export async function fetchPdaProgress(p: { groupId: string; from: string; to: string; allTeachers: boolean; teacherId: string }): Promise<PdaProgress> {
  const cycles = await fetchCycles()
  const current = cycles.find(c => c.is_current) ?? null

  const [targetsRes, membersRes, joinsRes] = await Promise.all([
    supabase
      .from('lec_assignment_targets')
      .select('lec_assignments(id, reading_id, due_date, created_at, archived, created_by, lec_readings(title))')
      .eq('group_id', p.groupId),
    supabase.from('reading_group_members').select('student_id').eq('group_id', p.groupId),
    supabase.from('lec_group_joins').select('student_id, joined_at').eq('group_id', p.groupId),
  ])
  for (const r of [targetsRes, membersRes, joinsRes]) if (r.error) throw r.error

  type A = { id: string; reading_id: string; due_date: string | null; created_at: string; archived: boolean; created_by: string | null; lec_readings: { title: string } | { title: string }[] | null }
  const assignments = ((targetsRes.data ?? []) as unknown as { lec_assignments: A | A[] | null }[])
    .map(t => one(t.lec_assignments))
    .filter((a): a is A => !!a)
    .filter(a => {
      const d = localDate(a.created_at)
      return d >= p.from && d <= p.to && (p.allTeachers || a.created_by === p.teacherId)
    })

  const joined = new Map(((joinsRes.data ?? []) as { student_id: string; joined_at: string }[]).map(j => [j.student_id, j.joined_at]))
  const members = ((membersRes.data ?? []) as { student_id: string }[]).map(m => ({ student_id: m.student_id, joined_at: joined.get(m.student_id) ?? null }))
  const memberIds = members.map(m => m.student_id)

  // Grados y bajas de cada ciclo involucrado (el actual y los de las asignaciones).
  const neededCycles = new Set<string>()
  if (current) neededCycles.add(current.cycle)
  for (const a of assignments) {
    const c = cycleFor(cycles, localDate(a.created_at))
    if (c) neededCycles.add(c.cycle)
  }
  const enrollByCycle = new Map<string, Map<string, { grade: PdaGrade | null; status: string; status_date: string | null }>>()
  if (memberIds.length && neededCycles.size) {
    const { data, error } = await supabase
      .from('lec_enrollments')
      .select('student_id, cycle, grade, status, status_date')
      .in('cycle', [...neededCycles])
      .in('student_id', memberIds)
    if (error) throw error
    for (const e of (data ?? []) as { student_id: string; cycle: string; grade: PdaGrade | null; status: string; status_date: string | null }[]) {
      const m = enrollByCycle.get(e.cycle) ?? new Map()
      m.set(e.student_id, e)
      enrollByCycle.set(e.cycle, m)
    }
  }

  // Grados actuales del grupo (para el selector y el aviso "sin grado").
  const curEnroll = current ? enrollByCycle.get(current.cycle) ?? new Map() : new Map()
  const activeMembers = memberIds.filter(id => curEnroll.get(id)?.status !== 'baja')
  const grades = [...new Set(activeMembers.map(id => curEnroll.get(id)?.grade ?? null).filter((g): g is PdaGrade => g !== null))].sort()
  const studentsWithoutGrade = activeMembers.filter(id => (curEnroll.get(id)?.grade ?? null) === null).length

  // Intentos y PDA de las lecturas.
  const ids = assignments.map(a => a.id)
  const readingIds = [...new Set(assignments.map(a => a.reading_id))]
  const [attemptsRes, pdasRes] = await Promise.all([
    ids.length
      ? supabase.from('lec_attempts').select('assignment_id, student_id, completed_at, comprehension_pct').in('assignment_id', ids).not('completed_at', 'is', null)
      : Promise.resolve({ data: [], error: null }),
    readingIds.length
      ? supabase.from('lec_reading_pdas').select('reading_id, pda_id, lec_pda(grade)').in('reading_id', readingIds)
      : Promise.resolve({ data: [], error: null }),
  ])
  for (const r of [attemptsRes, pdasRes]) if (r.error) throw r.error

  const first = new Map<string, { at: string; pct: number | null }>()
  for (const t of (attemptsRes.data ?? []) as { assignment_id: string; student_id: string; completed_at: string; comprehension_pct: number | null }[]) {
    const k = `${t.assignment_id}|${t.student_id}`
    const prev = first.get(k)
    if (!prev || t.completed_at < prev.at) first.set(k, { at: t.completed_at, pct: t.comprehension_pct === null ? null : Number(t.comprehension_pct) })
  }
  const pdaGrade = new Map<string, PdaGrade | null>()
  const pdasByReading = new Map<string, string[]>()
  type RP = { reading_id: string; pda_id: string; lec_pda: { grade: PdaGrade | null } | { grade: PdaGrade | null }[] | null }
  for (const r of (pdasRes.data ?? []) as unknown as RP[]) {
    pdaGrade.set(r.pda_id, one(r.lec_pda)?.grade ?? null)
    pdasByReading.set(r.reading_id, [...(pdasByReading.get(r.reading_id) ?? []), r.pda_id])
  }

  const today = todayLocal()
  const contribs: (Contribution & { assignmentId: string; readingTitle: string; createdAt: string })[] = []
  for (const a of assignments) {
    const c = cycleFor(cycles, localDate(a.created_at))
    const enr = c ? enrollByCycle.get(c.cycle) ?? new Map() : new Map()
    const bajaDate = new Map<string, string | null>()
    for (const [id, e] of enr) if (e.status === 'baja') bajaDate.set(id, e.status_date ?? '0000-01-01')
    const { targets } = computeTargets({
      assignment: a,
      targets: [{ group_id: p.groupId, student_id: null }],
      membersByGroup: new Map([[p.groupId, members]]),
      bajaDate,
    })
    const students = [...targets].map(id => {
      const f = first.get(`${a.id}|${id}`)
      return { id, grade: (enr.get(id)?.grade ?? null) as PdaGrade | null, completed: !!f, comprehension: f?.pct ?? null }
    })
    const title = one(a.lec_readings)?.title ?? 'Lectura'
    for (const ct of assignmentContribution({
      assignmentId: a.id, readingTitle: title, createdAt: a.created_at,
      closed: isClosed(a, today), readingPdaIds: pdasByReading.get(a.reading_id) ?? [], students,
    }, pdaGrade)) {
      contribs.push({ ...ct, assignmentId: a.id, readingTitle: title, createdAt: a.created_at })
    }
  }

  const byGrade = new Map<PdaGrade, PdaStatusMap>()
  for (const g of [1, 2, 3] as PdaGrade[]) byGrade.set(g, pdaStatuses(contribs, g))
  return { grades, studentsWithoutGrade, byGrade, assignmentsCount: assignments.length }
}
