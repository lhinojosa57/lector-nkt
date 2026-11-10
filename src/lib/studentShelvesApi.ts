// Una sola carga con todo lo que necesita "Mi biblioteca" del estudiante.
import { supabase } from './supabase'
import { DEFAULT_LEVEL, formatDate, pickVersion, type Language, type ReadingMode } from './lec'
import { effectiveDueDate, todayLocal } from './assignmentRules'
import {
  fluencyGain, groupDoneByReading, pagesFromWords, pickSuggestions, sortPendingAssignments,
  type DoneAttempt, type DoneBook,
} from './shelves'
import { fetchLevelProgress, fetchUnseenLevelUps, type LevelProgress, type LevelUpChange } from './levelApi'

export interface PendingBook {
  assignmentId: string
  readingId: string
  title: string
  subject: string
  language: Language
  coverPath: string | null
  mode: ReadingMode
  createdAt: string
  dueLabel: string
  overdue: boolean
}

export interface ShelfReading {
  id: string
  title: string
  subject: string
  language: Language
  coverPath: string | null
  topic: string | null
  wordsAtLevel: number | null
  /** Nivel de la versión que le toca (para "Nivel n" en la sugerencia). */
  levelShown: number | null
}

export interface StudentShelves {
  pending: PendingBook[]
  suggestions: ShelfReading[]
  done: (DoneBook & { reading: ShelfReading })[]
  kpis: {
    readCount: number
    words: number
    pages: number
    gain: Partial<Record<Language, { first: number; last: number; delta: number }>>
  }
  levels: Record<Language, { level: number; provisional: boolean }>
  /** Idiomas que se muestran en el encabezado: español siempre; inglés si tiene nivel o asignaciones en inglés. */
  languages: Language[]
  progress: Partial<Record<Language, LevelProgress>>
  unseenLevelUps: LevelUpChange[]
}

type Rd = { id: string; title: string; subject: string; language: Language; cover_path: string | null; topic: string | null }
const one = <T,>(x: T | T[] | null | undefined): T | null => (Array.isArray(x) ? x[0] ?? null : x ?? null)

export async function fetchStudentShelves(studentId: string): Promise<StudentShelves> {
  const [assignRes, attemptsRes, readingsRes, levelsRes, unseen] = await Promise.all([
    supabase
      .from('lec_assignments')
      .select('id, reading_id, mode, due_date, created_at, lec_readings(id, title, subject, language, cover_path, topic)')
      .eq('archived', false),
    supabase
      .from('lec_attempts')
      .select('id, assignment_id, mode, comprehension_pct, completed_at, lec_versions(level, word_count, reading_id, lec_readings(id, title, subject, language, cover_path, topic)), lec_fluency_reviews(wcpm, accuracy_pct, comment, reviewed_at)')
      .eq('student_id', studentId)
      .eq('is_diagnostic', false)
      .not('completed_at', 'is', null),
    supabase
      .from('lec_readings')
      .select('id, title, subject, language, cover_path, topic, lec_versions(level, word_count)')
      .eq('status', 'published'),
    supabase.from('lec_student_levels').select('language, level, is_provisional').eq('student_id', studentId),
    fetchUnseenLevelUps(studentId),
  ])
  for (const r of [assignRes, attemptsRes, readingsRes, levelsRes]) if (r.error) throw r.error

  // ---------- Niveles ----------
  const levels: Record<Language, { level: number; provisional: boolean }> = {
    es: { level: DEFAULT_LEVEL, provisional: true },
    en: { level: DEFAULT_LEVEL, provisional: true },
  }
  const levelRows = new Set<Language>()
  for (const l of (levelsRes.data ?? []) as { language: Language; level: number; is_provisional: boolean }[]) {
    levels[l.language] = { level: l.level, provisional: l.is_provisional }
    levelRows.add(l.language)
  }

  // ---------- Intentos completados ----------
  type Fl = { wcpm: number; accuracy_pct: number; comment: string | null; reviewed_at: string }
  type RawAttempt = {
    id: string; assignment_id: string | null; mode: ReadingMode; comprehension_pct: number | null; completed_at: string
    lec_versions: { level: number; word_count: number; reading_id: string; lec_readings: Rd | Rd[] | null } | { level: number; word_count: number; reading_id: string; lec_readings: Rd | Rd[] | null }[] | null
    lec_fluency_reviews: Fl | Fl[] | null
  }
  const attempts = (attemptsRes.data ?? []) as unknown as RawAttempt[]
  const doneAssignments = new Set<string>()
  const readingById = new Map<string, ShelfReading>()
  const doneAttempts: DoneAttempt[] = []
  const reviews: { language: Language; reviewedAt: string; wcpm: number }[] = []
  for (const a of attempts) {
    if (a.assignment_id) doneAssignments.add(a.assignment_id)
    const v = one(a.lec_versions)
    if (!v) continue
    const rd = one(v.lec_readings)
    const f = one(a.lec_fluency_reviews)
    const language: Language = rd?.language ?? 'es'
    if (!readingById.has(v.reading_id)) {
      readingById.set(v.reading_id, {
        id: v.reading_id,
        title: rd?.title ?? 'Lectura',
        subject: rd?.subject ?? 'Otra',
        language,
        coverPath: rd?.cover_path ?? null,
        topic: rd?.topic ?? null,
        wordsAtLevel: v.word_count ?? null,
        levelShown: v.level,
      })
    }
    doneAttempts.push({
      attemptId: a.id,
      readingId: v.reading_id,
      completedAt: a.completed_at,
      mode: a.mode,
      comprehension: a.comprehension_pct,
      wcpm: f ? Number(f.wcpm) : null,
      accuracy: f ? Number(f.accuracy_pct) : null,
      comment: f?.comment ?? null,
      words: v.word_count ?? 0,
    })
    if (f) reviews.push({ language, reviewedAt: f.reviewed_at, wcpm: Number(f.wcpm) })
  }

  // ---------- Asignadas pendientes ----------
  type RawAssign = { id: string; reading_id: string; mode: ReadingMode; due_date: string | null; created_at: string; lec_readings: Rd | Rd[] | null }
  const today = todayLocal()
  const allAssign = ((assignRes.data ?? []) as unknown as RawAssign[]).filter(a => one(a.lec_readings))
  const pending: PendingBook[] = sortPendingAssignments(allAssign.filter(a => !doneAssignments.has(a.id))).map(a => {
    const rd = one(a.lec_readings)!
    return {
      assignmentId: a.id,
      readingId: a.reading_id,
      title: rd.title,
      subject: rd.subject,
      language: rd.language,
      coverPath: rd.cover_path,
      mode: a.mode,
      createdAt: a.created_at,
      dueLabel: a.due_date ? `Entregar antes del ${formatDate(a.due_date)}` : 'Sin fecha límite',
      overdue: effectiveDueDate(a) < today,
    }
  })

  const languages: Language[] = ['es']
  if (levelRows.has('en') || allAssign.some(a => one(a.lec_readings)!.language === 'en')) languages.push('en')

  // ---------- Sugerencias ----------
  type RawReading = Rd & { lec_versions: { level: number; word_count: number }[] }
  const published = (readingsRes.data ?? []) as RawReading[]
  const doneIds = new Set(doneAttempts.map(d => d.readingId))
  const seed = `${today}:${doneAttempts.length}`
  const lvForSuggest: Partial<Record<Language, number>> = {}
  for (const l of languages) lvForSuggest[l] = levels[l].level
  const ids = pickSuggestions(
    published.map(r => ({ id: r.id, language: r.language, levels: r.lec_versions.map(v => v.level) })),
    doneIds, lvForSuggest, seed,
  )
  const suggestions: ShelfReading[] = ids.map(id => {
    const r = published.find(p => p.id === id)!
    const v = pickVersion(r.lec_versions, levels[r.language].level)
    return {
      id: r.id, title: r.title, subject: r.subject, language: r.language, coverPath: r.cover_path, topic: r.topic,
      wordsAtLevel: v?.word_count ?? null, levelShown: v?.level ?? null,
    }
  })

  // ---------- Realizadas e indicadores ----------
  const done = groupDoneByReading(doneAttempts).map(b => ({ ...b, reading: readingById.get(b.readingId)! }))
  const words = doneAttempts.reduce((s, d) => s + (d.words || 0), 0)
  const gain: StudentShelves['kpis']['gain'] = {}
  for (const l of languages) {
    const g = fluencyGain(reviews, l)
    if (g) gain[l] = g
  }

  // ---------- Avance de nivel ----------
  const progress: Partial<Record<Language, LevelProgress>> = {}
  const prog = await Promise.all(languages.map(l => fetchLevelProgress(studentId, l)))
  languages.forEach((l, i) => { if (prog[i]) progress[l] = prog[i]! })

  return {
    pending,
    suggestions,
    done,
    kpis: { readCount: doneAttempts.length, words, pages: pagesFromWords(words), gain },
    levels,
    languages,
    progress,
    unseenLevelUps: unseen,
  }
}
