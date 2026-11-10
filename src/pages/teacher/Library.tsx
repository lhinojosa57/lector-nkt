import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import TeacherHeader from '@/components/TeacherHeader'
import ReadingCover from '@/components/ReadingCover'
import Shelf from '@/components/Shelf'
import BookSpine from '@/components/BookSpine'
import { LANGUAGES, LEVELS, SUBJECTS, comprehensionLight, type Language, type LecReading, type ReadingMode } from '@/lib/lec'
import { todayLocal } from '@/lib/assignmentRules'
import {
  filterReadings, fold, pastAssignments, splitTeacherShelves,
  type PastAssignmentInput, type ReadingFilters, type ShelfReadingRow,
} from '@/lib/teacherShelves'

const AVAILABLE_PREVIEW = 12
const selectClass = 'font-body text-sm bg-parchment-50 border border-parchment-300 rounded-lg px-3 py-2 text-ink-700'

interface PastRow extends PastAssignmentInput {
  title: string
  subject: string
  language: Language
  topic: string | null
}

function FrontBook({ r, onOpen }: { r: ShelfReadingRow; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`${r.title}, ${r.subject}, ${r.language === 'en' ? 'en inglés' : 'en español'}${r.status === 'draft' ? ', borrador' : ''}`}
      className="shrink-0 w-[140px] pb-3 text-left rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-600"
    >
      <div className="relative">
        <ReadingCover title={r.title} subject={r.subject} coverPath={r.cover_path} size="md" />
        {r.status === 'draft' && (
          <span className="absolute top-2 right-2 font-body text-[10px] uppercase tracking-wide bg-ink-800 text-parchment-50 rounded px-1.5 py-0.5">
            Borrador
          </span>
        )}
      </div>
      <p className="font-display text-sm font-semibold text-ink-900 mt-2 leading-tight line-clamp-2 break-words">{r.title}</p>
      <p className="font-body text-xs text-ink-500">{r.subject} · {r.language === 'en' ? 'en inglés' : 'en español'}</p>
      <span className="flex gap-0.5 mt-1" aria-hidden>
        {LEVELS.map(l => (
          <span
            key={l.level}
            className={`w-4 h-4 rounded-full text-[9px] font-mono flex items-center justify-center ${
              r.levels.includes(l.level) ? 'bg-teal-600 text-white' : 'bg-parchment-200 text-ink-400'
            }`}
          >
            {l.level}
          </span>
        ))}
      </span>
    </button>
  )
}

export default function Library() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const [rows, setRows] = useState<ShelfReadingRow[]>([])
  const [past, setPast] = useState<PastRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAllAvailable, setShowAllAvailable] = useState(false)
  const [filters, setFilters] = useState<ReadingFilters>({ search: '', language: '', subject: '', level: '', status: '' })
  const set = <K extends keyof ReadingFilters>(k: K, v: ReadingFilters[K]) => setFilters(f => ({ ...f, [k]: v }))

  useEffect(() => {
    if (!profile?.id) return
    const teacherId = profile.id
    let cancelled = false
    async function load() {
      const [readingsRes, assignRes] = await Promise.all([
        supabase.from('lec_readings').select('*, lec_versions(level)').order('created_at', { ascending: false }),
        supabase
          .from('lec_assignments')
          .select('id, reading_id, mode, due_date, created_at, archived, lec_readings(title, subject, language, topic), lec_assignment_targets(reading_groups(name))')
          .eq('created_by', teacherId)
          .order('created_at', { ascending: false }),
      ])
      if (cancelled) return
      if (readingsRes.error) {
        console.error(readingsRes.error)
        setError('No se pudo cargar la biblioteca.')
        setLoading(false)
        return
      }
      type Raw = LecReading & { lec_versions: { level: number }[] }
      setRows(((readingsRes.data ?? []) as Raw[]).map(r => ({ ...r, levels: (r.lec_versions ?? []).map(v => v.level).sort() })))

      type Rd = { title: string; subject: string; language: Language; topic: string | null }
      type G = { name: string }
      type RawA = {
        id: string; reading_id: string; mode: ReadingMode; due_date: string | null; created_at: string; archived: boolean
        lec_readings: Rd | Rd[] | null
        lec_assignment_targets: { reading_groups: G | G[] | null }[]
      }
      if (assignRes.error) console.error(assignRes.error)
      const one = <T,>(x: T | T[] | null): T | null => (Array.isArray(x) ? x[0] ?? null : x)
      const closed = pastAssignments<PastRow>(
        ((assignRes.data ?? []) as unknown as RawA[]).map((a): PastRow => {
          const rd = one(a.lec_readings)
          return {
            id: a.id, reading_id: a.reading_id, mode: a.mode, due_date: a.due_date, created_at: a.created_at, archived: a.archived,
            groupNames: a.lec_assignment_targets.map(t => one(t.reading_groups)?.name).filter((n): n is string => !!n),
            avgComprehension: null,
            title: rd?.title ?? 'Lectura eliminada', subject: rd?.subject ?? 'Otra', language: rd?.language ?? 'es', topic: rd?.topic ?? null,
          }
        }),
        todayLocal(),
      )

      // Promedio de comprensión por asignación: primer intento completado de cada estudiante.
      if (closed.length) {
        const { data: atts } = await supabase
          .from('lec_attempts')
          .select('assignment_id, student_id, completed_at, comprehension_pct')
          .in('assignment_id', closed.map(a => a.id))
          .not('completed_at', 'is', null)
        if (cancelled) return
        const first = new Map<string, { at: string; pct: number | null }>()
        for (const t of (atts ?? []) as { assignment_id: string; student_id: string; completed_at: string; comprehension_pct: number | null }[]) {
          const k = `${t.assignment_id}|${t.student_id}`
          const prev = first.get(k)
          if (!prev || t.completed_at < prev.at) first.set(k, { at: t.completed_at, pct: t.comprehension_pct })
        }
        const sums = new Map<string, { s: number; n: number }>()
        for (const [k, v] of first) {
          if (v.pct === null) continue
          const id = k.split('|')[0]
          const cur = sums.get(id) ?? { s: 0, n: 0 }
          sums.set(id, { s: cur.s + Number(v.pct), n: cur.n + 1 })
        }
        for (const a of closed) {
          const s = sums.get(a.id)
          a.avgComprehension = s ? s.s / s.n : null
        }
      }
      setPast(closed)
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [profile?.id])

  const { mine, available } = useMemo(
    () => splitTeacherShelves(filterReadings(rows, filters), profile?.id ?? ''),
    [rows, filters, profile?.id],
  )
  const pastFiltered = useMemo(() => {
    const q = fold(filters.search.trim())
    return past.filter(a =>
      (!q || fold(a.title).includes(q) || fold(a.topic ?? '').includes(q)) &&
      (!filters.language || a.language === filters.language) &&
      (!filters.subject || a.subject === filters.subject)
    )
  }, [past, filters])

  const availableShown = showAllAvailable ? available : available.slice(0, AVAILABLE_PREVIEW)

  return (
    <div className="min-h-screen bg-sepia-100">
      <TeacherHeader title="Biblioteca de lecturas" />

      <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-5">
        <div className="bg-parchment-50 border border-parchment-200 rounded-xl p-4 flex flex-wrap gap-2">
          <input
            type="search"
            aria-label="Buscar por título o tema"
            value={filters.search}
            onChange={e => set('search', e.target.value)}
            placeholder="Buscar por título o tema"
            className="font-body text-sm flex-1 min-w-[180px] bg-white border border-parchment-300 rounded-lg px-3 py-2"
          />
          <select aria-label="Idioma" value={filters.language} onChange={e => set('language', e.target.value as Language | '')} className={selectClass}>
            <option value="">Todos los idiomas</option>
            {LANGUAGES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
          </select>
          <select aria-label="Materia" value={filters.subject} onChange={e => set('subject', e.target.value)} className={selectClass}>
            <option value="">Todas las materias</option>
            {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select aria-label="Nivel" value={filters.level} onChange={e => set('level', e.target.value ? Number(e.target.value) : '')} className={selectClass}>
            <option value="">Todos los niveles</option>
            {LEVELS.map(l => <option key={l.level} value={l.level}>{l.level} · {l.name}</option>)}
          </select>
          <select aria-label="Estado" value={filters.status} onChange={e => set('status', e.target.value as ReadingFilters['status'])} className={selectClass}>
            <option value="">Todas</option>
            <option value="published">Publicadas</option>
            <option value="draft">Borradores</option>
          </select>
        </div>

        {loading ? (
          <div className="p-10 flex justify-center"><div className="spinner" /></div>
        ) : error ? (
          <p role="alert" className="font-body text-sm text-crimson-500">{error}</p>
        ) : (
          <>
            <Shelf title="✍️ Mis lecturas" subtitle="Las que tú creaste, incluidos tus borradores" empty="Todavía no has creado lecturas.">
              {mine.map(r => <FrontBook key={r.id} r={r} onOpen={() => navigate(`/teacher/library/${r.id}`)} />)}
            </Shelf>

            <Shelf
              title="📚 Lecturas disponibles"
              subtitle="Publicadas por todo el equipo docente · las más nuevas primero"
              empty="No hay lecturas publicadas de otros docentes con esos filtros."
              footer={available.length > AVAILABLE_PREVIEW && (
                <button onClick={() => setShowAllAvailable(v => !v)} className="font-body text-sm text-teal-700 hover:underline">
                  {showAllAvailable ? 'Ver menos' : `Ver todas (${available.length}) →`}
                </button>
              )}
            >
              {showAllAvailable ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4 w-full">
                  {availableShown.map(r => <FrontBook key={r.id} r={r} onOpen={() => navigate(`/teacher/library/${r.id}`)} />)}
                </div>
              ) : (
                availableShown.map(r => <FrontBook key={r.id} r={r} onOpen={() => navigate(`/teacher/library/${r.id}`)} />)
              )}
            </Shelf>

            <Shelf
              title="🗂️ Asignadas anteriormente"
              subtitle="Las que ya asignaste y cerraron · toca una costilla para ver cómo les fue a tus grupos"
              empty="Aquí aparecerán tus asignaciones cuando cierren."
            >
              {pastFiltered.map(a => (
                <div key={a.id} className="shrink-0 w-14 flex flex-col items-center">
                  <BookSpine
                    title={a.title}
                    subject={a.subject}
                    words={0}
                    pct={a.avgComprehension}
                    light={a.avgComprehension !== null ? comprehensionLight(a.avgComprehension).light : null}
                    onClick={() => navigate(`/teacher/assignments/${a.id}/results`)}
                  />
                  <span className="mt-1 mb-1 w-14 font-body text-[10px] text-ink-500 text-center truncate" title={a.groupNames.join(', ')}>
                    {a.groupNames.join(', ') || 'Sin grupo'}
                  </span>
                </div>
              ))}
            </Shelf>
          </>
        )}
      </div>
    </div>
  )
}
