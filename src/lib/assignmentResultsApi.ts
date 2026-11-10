// Carga todo lo que necesita "Cómo les fue" para una asignación (docentes).
import { supabase } from './supabase'
import { localDate } from './assignmentRules'
import { computeTargets } from './assignmentTargets'
import type { Language, ReadingMode, Skill } from './lec'
import type { Grade } from './roster'
import type { ResultAnswer, ResultAttempt, ResultQuestion, ResultStudent } from './assignmentResults'

export interface AssignmentResultsData {
  assignment: { id: string; reading_id: string; mode: ReadingMode; fixed_level: number | null; due_date: string | null; created_at: string; archived: boolean }
  reading: { id: string; title: string; subject: string; language: Language; cover_path: string | null; levels: number[] }
  groups: { id: string; name: string }[]
  students: ResultStudent[]
  attempts: ResultAttempt[]
  answers: ResultAnswer[]
  questions: ResultQuestion[]
  /** Los intentos usaron más de una versión (nivel): las preguntas son de la más usada. */
  mixedVersions: boolean
}

const one = <T,>(x: T | T[] | null | undefined): T | null => (Array.isArray(x) ? x[0] ?? null : x ?? null)

export async function fetchAssignmentResults(assignmentId: string): Promise<AssignmentResultsData> {
  const { data: a, error } = await supabase
    .from('lec_assignments')
    .select('id, reading_id, mode, fixed_level, due_date, created_at, archived, lec_assignment_targets(group_id, student_id, reading_groups(id, name)), lec_readings(id, title, subject, language, cover_path, lec_versions(level))')
    .eq('id', assignmentId)
    .maybeSingle()
  if (error) throw error
  if (!a) throw new Error('No existe la asignación')

  type G = { id: string; name: string }
  type Raw = {
    id: string; reading_id: string; mode: ReadingMode; fixed_level: number | null; due_date: string | null; created_at: string; archived: boolean
    lec_assignment_targets: { group_id: string | null; student_id: string | null; reading_groups: G | G[] | null }[]
    lec_readings: { id: string; title: string; subject: string; language: Language; cover_path: string | null; lec_versions: { level: number }[] } | null
  }
  const raw = a as unknown as Raw
  const rd = one(raw.lec_readings)
  const groups = raw.lec_assignment_targets.map(t => one(t.reading_groups)).filter((g): g is G => !!g)
  const groupIds = groups.map(g => g.id)

  // Ciclo que contiene la fecha de creación; si ninguno, el actual.
  const created = localDate(raw.created_at)
  const { data: cycles } = await supabase.from('lec_cycles').select('cycle, starts_on, ends_on, is_current')
  const cs = (cycles ?? []) as { cycle: string; starts_on: string; ends_on: string; is_current: boolean }[]
  const cycle = cs.find(c => c.starts_on <= created && created <= c.ends_on) ?? cs.find(c => c.is_current) ?? null

  const [membersRes, joinsRes, enrollRes, attemptsRes] = await Promise.all([
    groupIds.length ? supabase.from('reading_group_members').select('group_id, student_id').in('group_id', groupIds) : Promise.resolve({ data: [], error: null }),
    groupIds.length ? supabase.from('lec_group_joins').select('group_id, student_id, joined_at').in('group_id', groupIds) : Promise.resolve({ data: [], error: null }),
    cycle ? supabase.from('lec_enrollments').select('student_id, grade, status, status_date').eq('cycle', cycle.cycle) : Promise.resolve({ data: [], error: null }),
    supabase
      .from('lec_attempts')
      .select('id, student_id, version_id, completed_at, mode, comprehension_pct, drive_file_id, lec_fluency_reviews(wcpm, accuracy_pct)')
      .eq('assignment_id', assignmentId),
  ])
  for (const r of [membersRes, joinsRes, enrollRes, attemptsRes]) if (r.error) throw r.error

  const joined = new Map<string, string>()
  for (const j of (joinsRes.data ?? []) as { group_id: string; student_id: string; joined_at: string }[]) joined.set(`${j.group_id}|${j.student_id}`, j.joined_at)
  const membersByGroup = new Map<string, { student_id: string; joined_at: string | null }[]>()
  for (const m of (membersRes.data ?? []) as { group_id: string; student_id: string }[]) {
    membersByGroup.set(m.group_id, [...(membersByGroup.get(m.group_id) ?? []), { student_id: m.student_id, joined_at: joined.get(`${m.group_id}|${m.student_id}`) ?? null }])
  }
  const grade = new Map<string, Grade | null>()
  const bajaDate = new Map<string, string | null>()
  for (const e of (enrollRes.data ?? []) as { student_id: string; grade: Grade | null; status: string; status_date: string | null }[]) {
    grade.set(e.student_id, e.grade)
    if (e.status === 'baja') bajaDate.set(e.student_id, e.status_date ?? '0000-01-01')
  }

  const targetsInfo = computeTargets({
    assignment: raw,
    targets: raw.lec_assignment_targets.map(t => ({ group_id: t.group_id, student_id: t.student_id })),
    membersByGroup,
    bajaDate,
  })

  type Fl = { wcpm: number; accuracy_pct: number }
  type RawAt = { id: string; student_id: string; version_id: string; completed_at: string | null; mode: ReadingMode; comprehension_pct: number | null; drive_file_id: string | null; lec_fluency_reviews: Fl | Fl[] | null }
  const rawAttempts = (attemptsRes.data ?? []) as unknown as RawAt[]
  const attempts: ResultAttempt[] = rawAttempts.map(x => {
    const f = one(x.lec_fluency_reviews)
    return {
      id: x.id, student_id: x.student_id, completed_at: x.completed_at, mode: x.mode,
      comprehension_pct: x.comprehension_pct !== null ? Number(x.comprehension_pct) : null,
      drive_file_id: x.drive_file_id,
      wcpm: f ? Number(f.wcpm) : null, accuracy: f ? Number(f.accuracy_pct) : null,
    }
  })

  const withAttempt = new Set(rawAttempts.filter(x => x.completed_at).map(x => x.student_id))
  const lateWithAttempt = [...targetsInfo.lateJoiners].filter(id => withAttempt.has(id))
  const ids = [...targetsInfo.targets, ...lateWithAttempt]

  // Preguntas de la versión más usada entre los intentos completados.
  const versionCount = new Map<string, number>()
  for (const x of rawAttempts) if (x.completed_at) versionCount.set(x.version_id, (versionCount.get(x.version_id) ?? 0) + 1)
  const topVersion = [...versionCount.entries()].sort((p, q) => q[1] - p[1])[0]?.[0] ?? null
  const completedIds = rawAttempts.filter(x => x.completed_at && x.version_id === topVersion).map(x => x.id)

  const [profilesRes, questionsRes, answersRes] = await Promise.all([
    ids.length ? supabase.from('profiles').select('id, full_name, email').in('id', ids) : Promise.resolve({ data: [], error: null }),
    topVersion ? supabase.from('lec_questions').select('id, position, text, skill').eq('version_id', topVersion) : Promise.resolve({ data: [], error: null }),
    completedIds.length ? supabase.from('lec_answers').select('attempt_id, question_id, is_correct').in('attempt_id', completedIds) : Promise.resolve({ data: [], error: null }),
  ])
  for (const r of [profilesRes, questionsRes, answersRes]) if (r.error) throw r.error

  const names = new Map<string, string>()
  for (const p of (profilesRes.data ?? []) as { id: string; full_name: string | null; email: string }[]) names.set(p.id, p.full_name ?? p.email)
  const groupName = new Map(groups.map(g => [g.id, g.name]))

  const students: ResultStudent[] = ids.map(id => ({
    id,
    name: names.get(id) ?? 'Estudiante',
    grade: grade.get(id) ?? null,
    groups: (targetsInfo.groupOf.get(id) ?? []).map(g => groupName.get(g) ?? g),
    isTarget: targetsInfo.targets.has(id),
    lateJoiner: !targetsInfo.targets.has(id),
  }))

  return {
    assignment: { id: raw.id, reading_id: raw.reading_id, mode: raw.mode, fixed_level: raw.fixed_level, due_date: raw.due_date, created_at: raw.created_at, archived: raw.archived },
    reading: {
      id: rd?.id ?? raw.reading_id, title: rd?.title ?? 'Lectura eliminada', subject: rd?.subject ?? 'Otra',
      language: rd?.language ?? 'es', cover_path: rd?.cover_path ?? null,
      levels: (rd?.lec_versions ?? []).map(v => v.level).sort(),
    },
    groups,
    students,
    attempts,
    answers: (answersRes.data ?? []) as ResultAnswer[],
    questions: ((questionsRes.data ?? []) as { id: string; position: number; text: string; skill: Skill }[]),
    mixedVersions: versionCount.size > 1,
  }
}
