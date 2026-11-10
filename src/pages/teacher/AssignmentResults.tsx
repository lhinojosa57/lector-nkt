import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import TeacherHeader from '@/components/TeacherHeader'
import ReadingCover from '@/components/ReadingCover'
import AssignModal from '@/components/AssignModal'
import { comprehensionLight, formatDate, levelName, modeLabel, type Light } from '@/lib/lec'
import { effectiveDueDate, localDate, todayLocal } from '@/lib/assignmentRules'
import { formatGrade, type Grade } from '@/lib/roster'
import { fetchAssignmentResults, type AssignmentResultsData } from '@/lib/assignmentResultsApi'
import { summarizeResults, type StudentRow } from '@/lib/assignmentResults'
import { toCsv, downloadCsv } from '@/lib/csv'
import { fold } from '@/lib/teacherShelves'

const DOT: Record<Light, string> = { green: 'bg-emerald-500', yellow: 'bg-amber-400', red: 'bg-red-500' }
const BAR: Record<Light, string> = { green: 'bg-emerald-500', yellow: 'bg-amber-400', red: 'bg-red-500' }
const btnPrimary = 'font-body text-sm px-3 py-2 rounded-lg bg-teal-600 text-white hover:bg-teal-500'
const btnOutline = 'font-body text-sm px-3 py-2 rounded-lg border border-parchment-300 bg-white text-ink-700 hover:bg-parchment-100'
const tabOn = 'font-body text-xs px-3 py-1.5 rounded-full border border-teal-600 bg-teal-600 text-white'
const tabOff = 'font-body text-xs px-3 py-1.5 rounded-full border border-parchment-300 bg-white text-ink-700 hover:bg-parchment-100'
const card = 'bg-white border border-parchment-200 rounded-xl p-4 min-w-0'

type GradeFilter = 'todos' | '1' | '2' | '3' | 'sin'
type SortKey = 'name' | 'grade' | 'comprehension' | 'wcpm' | 'accuracy' | 'status'

export default function AssignmentResults() {
  const { assignmentId } = useParams<{ assignmentId: string }>()
  const navigate = useNavigate()
  const [data, setData] = useState<AssignmentResultsData | null>(null)
  const [error, setError] = useState('')
  const [tab, setTab] = useState<string>('todos')
  const [gradeFilter, setGradeFilter] = useState<GradeFilter>('todos')
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'name', dir: 1 })
  const [assign, setAssign] = useState<'again' | 'other' | null>(null)
  const [notice, setNotice] = useState('')

  useEffect(() => {
    if (!assignmentId) return
    let cancelled = false
    fetchAssignmentResults(assignmentId)
      .then(d => { if (!cancelled) setData(d) })
      .catch(err => {
        console.error(err)
        if (!cancelled) setError('No se pudieron cargar los resultados de esta asignación.')
      })
    return () => { cancelled = true }
  }, [assignmentId])

  const inTab = useMemo(() => {
    if (!data) return []
    if (tab === 'todos') return data.students
    return data.students.filter(s => s.groups.includes(tab))
  }, [data, tab])

  const gradesPresent = useMemo(() => {
    const set = new Set(inTab.map(s => (s.grade === null ? 'sin' : String(s.grade))))
    return (['1', '2', '3', 'sin'] as const).filter(g => set.has(g))
  }, [inTab])
  const effectiveGrade: GradeFilter = gradeFilter !== 'todos' && !gradesPresent.includes(gradeFilter) ? 'todos' : gradeFilter

  const summary = useMemo(() => {
    if (!data) return null
    const students = inTab.filter(s =>
      effectiveGrade === 'todos' || (effectiveGrade === 'sin' ? s.grade === null : String(s.grade) === effectiveGrade))
    return summarizeResults(students, data.attempts, data.answers, data.questions)
  }, [data, inTab, effectiveGrade])

  const sortedRows = useMemo(() => {
    if (!summary) return []
    const val = (r: StudentRow): string | number => {
      switch (sort.key) {
        case 'name': return fold(r.name)
        case 'grade': return r.grade ?? 9
        case 'comprehension': return r.comprehension ?? -1
        case 'wcpm': return r.wcpm ?? -1
        case 'accuracy': return r.accuracy ?? -1
        case 'status': return r.status
      }
    }
    return [...summary.rows].sort((a, b) => {
      const x = val(a), y = val(b)
      return (x < y ? -1 : x > y ? 1 : 0) * sort.dir
    })
  }, [summary, sort])

  if (error) {
    return (
      <div className="min-h-screen bg-sepia-100">
        <TeacherHeader title="Cómo les fue" />
        <p role="alert" className="max-w-5xl mx-auto p-6 font-body text-sm text-crimson-500">{error}</p>
      </div>
    )
  }
  if (!data || !summary) {
    return (
      <div className="min-h-screen bg-sepia-100">
        <TeacherHeader title="Cómo les fue" />
        <div className="p-10 flex justify-center"><div className="spinner" /></div>
      </div>
    )
  }

  const { assignment: a, reading } = data
  const isClosedNow = a.archived || effectiveDueDate(a) < todayLocal()
  const isAloud = a.mode === 'aloud'
  const total = summary.lights.green + summary.lights.yellow + summary.lights.red

  function header(key: SortKey, label: string) {
    const active = sort.key === key
    return (
      <th scope="col" aria-sort={active ? (sort.dir === 1 ? 'ascending' : 'descending') : 'none'} className="px-3 py-2 text-left">
        <button
          type="button"
          onClick={() => setSort(s => ({ key, dir: s.key === key ? (s.dir === 1 ? -1 : 1) : 1 }))}
          className="font-body text-xs font-medium text-ink-500 hover:text-ink-800"
        >
          {label}{active ? (sort.dir === 1 ? ' ▲' : ' ▼') : ''}
        </button>
      </th>
    )
  }

  function download() {
    if (!summary) return
    const rows = sortedRows.map(r => {
      const st = data!.students.find(s => s.id === r.studentId)
      return [
        r.name,
        r.grade ? formatGrade(r.grade as Grade) : 'Sin grado',
        (st?.groups ?? []).map(id => data!.groups.find(g => g.id === id)?.name ?? '').filter(Boolean).join(', '),
        r.status,
        r.comprehension !== null ? Math.round(r.comprehension) : null,
        r.wcpm !== null ? Math.round(r.wcpm) : null,
        r.accuracy !== null ? Math.round(r.accuracy) : null,
      ]
    })
    const slug = fold(reading.title).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40)
    downloadCsv(
      `resultados-${slug}-${todayLocal()}.csv`,
      toCsv(['Estudiante', 'Grado', 'Grupo(s)', 'Estado', 'Comprensión %', 'Fluidez (ppm)', 'Precisión %'], rows),
    )
  }

  return (
    <div className="min-h-screen bg-sepia-100">
      <TeacherHeader title="Cómo les fue" />

      <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-5">
        <button onClick={() => navigate('/teacher/library')} className="font-body text-xs text-ink-500 hover:text-ink-800">← Biblioteca</button>
        {notice && <p role="status" className="font-body text-sm bg-teal-50 text-teal-800 border border-teal-200 rounded-lg px-4 py-2">{notice}</p>}

        {/* Encabezado */}
        <section className="bg-parchment-50 border border-parchment-200 rounded-xl p-4 flex flex-wrap gap-4">
          <ReadingCover title={reading.title} subject={reading.subject} coverPath={reading.cover_path} size="md" />
          <div className="flex-1 min-w-[220px] space-y-1">
            <h1 className="font-display text-xl font-bold text-ink-900 break-words">{reading.title}</h1>
            <p className="font-body text-sm text-ink-600">{reading.subject} · {modeLabel(a.mode)}</p>
            <p className="font-body text-sm text-ink-600">
              {a.fixed_level ? `Nivel fijo ${a.fixed_level} · ${levelName(a.fixed_level)}` : 'Nivel de cada estudiante'}
            </p>
            <p className="font-body text-xs text-ink-500">
              Asignada el {formatDate(localDate(a.created_at))} · {isClosedNow ? 'cerró' : 'cierra'} el {formatDate(effectiveDueDate(a))}
            </p>

            <div role="tablist" aria-label="Grupo" className="flex flex-wrap gap-1.5 pt-2">
              {[{ id: 'todos', name: 'Todos' }, ...data.groups].map(g => (
                <button key={g.id} role="tab" aria-selected={tab === g.id} onClick={() => setTab(g.id)} className={tab === g.id ? tabOn : tabOff}>
                  {g.name}
                </button>
              ))}
            </div>
            {gradesPresent.length > 1 && (
              <label className="inline-flex items-center gap-2 font-body text-xs text-ink-600 pt-1">
                Grado:
                <select value={effectiveGrade} onChange={e => setGradeFilter(e.target.value as GradeFilter)} className="font-body text-xs bg-white border border-parchment-300 rounded-lg px-2 py-1">
                  <option value="todos">Todos</option>
                  {gradesPresent.map(g => <option key={g} value={g}>{g === 'sin' ? 'Sin grado' : `${g}°`}</option>)}
                </select>
              </label>
            )}

            <div className="flex flex-wrap gap-2 pt-2">
              <button onClick={() => setAssign('again')} className={btnPrimary}>↻ Volver a asignar</button>
              <button onClick={() => setAssign('other')} className={btnOutline}>Asignar a otro grupo</button>
              <button onClick={download} className={btnOutline}>⬇ Descargar resultados</button>
            </div>
          </div>
        </section>

        {/* Tres números */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className={card}>
            <p className="font-body text-sm text-ink-700">Completaron <strong className="font-display text-2xl text-ink-900">{summary.completed}</strong> de {summary.assigned}</p>
            <p className="font-body text-xs text-ink-500 mt-1">{summary.notDone} sin hacer</p>
          </div>
          <div className={card}>
            <p className="font-body text-sm text-ink-700">
              Comprensión promedio <strong className="font-display text-2xl text-ink-900">{summary.avgComprehension !== null ? `${Math.round(summary.avgComprehension)}%` : '—'}</strong>
            </p>
            {total > 0 && (
              <>
                <div className="flex h-2.5 rounded-full overflow-hidden mt-2" aria-hidden>
                  <span className={BAR.green} style={{ width: `${(100 * summary.lights.green) / total}%` }} />
                  <span className={BAR.yellow} style={{ width: `${(100 * summary.lights.yellow) / total}%` }} />
                  <span className={BAR.red} style={{ width: `${(100 * summary.lights.red) / total}%` }} />
                </div>
                <p className="font-body text-xs text-ink-500 mt-1">
                  {summary.lights.green} en verde · {summary.lights.yellow} en amarillo · {summary.lights.red} en rojo
                </p>
              </>
            )}
          </div>
          <div className={card}>
            {isAloud ? (
              <>
                <p className="font-body text-sm text-ink-700">
                  Fluidez mediana <strong className="font-display text-2xl text-ink-900">{summary.medianWcpm !== null ? `${summary.medianWcpm} ppm` : '—'}</strong>
                  {summary.avgAccuracy !== null && <> · precisión <strong>{Math.round(summary.avgAccuracy)}%</strong></>}
                </p>
                <p className="font-body text-xs text-ink-500 mt-1">{summary.aloudReviewed} de {summary.aloudTotal} grabaciones revisadas</p>
                {summary.aloudReviewed < summary.aloudTotal && (
                  <button onClick={() => navigate('/teacher/fluency')} className="font-body text-xs text-teal-700 hover:underline mt-1">Revisar pendientes →</button>
                )}
              </>
            ) : (
              <p className="font-body text-sm text-ink-500">Esta asignación no fue en voz alta</p>
            )}
          </div>
        </div>

        {/* Preguntas */}
        <section aria-labelledby="preguntas" className="bg-parchment-50 border border-parchment-200 rounded-xl p-4">
          <h2 id="preguntas" className="font-display font-semibold text-ink-800 mb-2">Preguntas que costaron más</h2>
          {data.mixedVersions && (
            <p className="font-body text-xs text-ink-500 mb-2">Las preguntas cambian según el nivel; se muestran las de la versión más usada.</p>
          )}
          {summary.questions.length === 0 ? (
            <p className="font-body text-sm text-ink-500">Todavía no hay respuestas.</p>
          ) : (
            <ul className="divide-y divide-parchment-200">
              {summary.questions.map(q => (
                <li key={q.id} className="py-2 flex items-center gap-3">
                  <span className="font-mono text-xs text-ink-500 w-7 shrink-0">P{q.n}</span>
                  <span className="flex-1 min-w-0 font-body text-sm text-ink-800 line-clamp-2">{q.text}</span>
                  <span className="w-24 sm:w-32 h-2 rounded-full bg-parchment-200 overflow-hidden shrink-0" aria-hidden>
                    <span className={`block h-full ${BAR[comprehensionLight(q.pctCorrect).light]}`} style={{ width: `${q.pctCorrect}%` }} />
                  </span>
                  <span className="font-mono text-sm font-bold text-ink-800 w-11 text-right shrink-0">{q.pctCorrect}%</span>
                </li>
              ))}
            </ul>
          )}
          {summary.hints.map(h => <p key={h} className="font-body text-sm text-ink-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-2">{h}</p>)}
        </section>

        {/* Tabla */}
        <section aria-labelledby="estudiantes" className="bg-parchment-50 border border-parchment-200 rounded-xl overflow-hidden">
          <h2 id="estudiantes" className="font-display font-semibold text-ink-800 px-4 pt-4 pb-2">Estudiantes</h2>
          {sortedRows.length === 0 ? (
            <p className="px-4 pb-4 font-body text-sm text-ink-500">No hay estudiantes en este grupo.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px]">
                <thead>
                  <tr className="bg-sepia-100 border-y border-parchment-200">
                    {header('name', 'Estudiante')}
                    {header('grade', 'Grado')}
                    {header('comprehension', 'Comprensión')}
                    {header('wcpm', 'Fluidez')}
                    {header('accuracy', 'Precisión')}
                    {header('status', 'Estado')}
                  </tr>
                </thead>
                <tbody className="divide-y divide-parchment-200">
                  {sortedRows.map(r => (
                    <tr key={r.studentId} className={r.status === 'no la hizo' ? 'text-ink-400' : 'text-ink-800'}>
                      <td className="px-3 py-2 font-body text-sm">
                        {r.isAloudWithAudio && r.attemptId ? (
                          <button onClick={() => navigate(`/teacher/fluency/${r.attemptId}`)} className="text-teal-700 hover:underline text-left">{r.name}</button>
                        ) : r.name}
                      </td>
                      <td className="px-3 py-2 font-body text-sm">{r.grade ? formatGrade(r.grade) : '—'}</td>
                      <td className="px-3 py-2 font-body text-sm">
                        {r.comprehension !== null && r.light ? (
                          <><span className={`inline-block w-2.5 h-2.5 rounded-full mr-1.5 ${DOT[r.light]}`} aria-hidden />{Math.round(r.comprehension)}%</>
                        ) : '—'}
                      </td>
                      <td className="px-3 py-2 font-body text-sm">
                        {r.wcpm !== null ? `${Math.round(r.wcpm)} ppm` : r.needsReview ? 'Sin revisar' : '—'}
                      </td>
                      <td className="px-3 py-2 font-body text-sm">{r.accuracy !== null ? `${Math.round(r.accuracy)}%` : '—'}</td>
                      <td className="px-3 py-2 font-body text-sm">
                        {r.status === 'se unió después' ? (
                          <span className="text-xs bg-amber-100 text-amber-900 rounded-full px-2 py-0.5">se unió después</span>
                        ) : r.status}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {assign && (
        <AssignModal
          readingId={reading.id}
          readingTitle={reading.title}
          availableLevels={reading.levels}
          initialGroupIds={assign === 'again' ? data.groups.map(g => g.id) : undefined}
          onClose={() => setAssign(null)}
          onAssigned={() => {
            setAssign(null)
            setNotice('Lectura asignada. Puedes ver su avance en Asignaciones.')
          }}
        />
      )}
    </div>
  )
}
