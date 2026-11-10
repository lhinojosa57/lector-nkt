import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import TeacherHeader from '@/components/TeacherHeader'
import { formatDate, type ReadingGroup } from '@/lib/lec'
import { localDate } from '@/lib/assignmentRules'
import { CAMPOS, fetchPdaCatalog, type Pda, type PdaGrade } from '@/lib/pda'
import { STATE_LABEL, type PdaState, type PdaStatusMap } from '@/lib/pdaProgress'
import { fetchCycles, fetchPdaProgress, type Cycle, type PdaProgress } from '@/lib/pdaProgressApi'
import { buildConcentradoRows, concentradoFileName } from '@/lib/concentrado'
import { fetchSettings } from '@/lib/settingsApi'

const selectClass = 'font-body text-sm bg-white border border-parchment-300 rounded-lg px-3 py-2 text-ink-700'
const btnPrimary = 'font-body text-sm px-4 py-2 rounded-lg bg-teal-600 text-white hover:bg-teal-500 disabled:opacity-50'
const btnOutline = 'font-body text-sm px-3 py-2 rounded-lg border border-parchment-300 bg-white text-ink-700 hover:bg-parchment-100 disabled:opacity-50'

const BADGE: Record<PdaState, string> = {
  logro: 'bg-emerald-100 text-emerald-900',
  abordado: 'bg-sky-100 text-sky-900',
  en_curso: 'bg-amber-100 text-amber-900',
  pendiente: 'bg-parchment-200 text-ink-600',
}
const PANEL_LABEL: Record<PdaState, string> = { ...STATE_LABEL, pendiente: 'Sin trabajar' }
const DEFAULT_CAMPOS = ['Lenguajes', 'Saberes y pensamiento científico', 'Ética, naturaleza y sociedades']

function Badge({ state }: { state: PdaState }) {
  return <span className={`font-body text-[11px] rounded-full px-2 py-0.5 whitespace-nowrap ${BADGE[state]}`}>{PANEL_LABEL[state]}</span>
}

export default function PdaPanel() {
  const { profile } = useAuth()
  const [groups, setGroups] = useState<ReadingGroup[]>([])
  const [groupId, setGroupId] = useState('')
  const [cycles, setCycles] = useState<Cycle[]>([])
  const [period, setPeriod] = useState('ciclo')
  const [rangeFrom, setRangeFrom] = useState('')
  const [rangeTo, setRangeTo] = useState('')
  const [grade, setGrade] = useState<PdaGrade | null>(null)
  const [allTeachers, setAllTeachers] = useState(false)
  const [catalog, setCatalog] = useState<Pda[]>([])
  const [data, setData] = useState<PdaProgress | null>(null)
  const [initLoading, setInitLoading] = useState(true)
  const [resultKey, setResultKey] = useState('')
  const [error, setError] = useState('')
  const [showReport, setShowReport] = useState(false)

  useEffect(() => {
    if (!profile?.id) return
    let cancelled = false
    Promise.all([
      supabase.from('reading_groups').select('id, name, grado, modalidad, archived').eq('teacher_id', profile.id).eq('archived', false).order('name'),
      fetchCycles(),
      fetchPdaCatalog(),
    ])
      .then(([g, cs, cat]) => {
        if (cancelled) return
        const gs = (g.data ?? []) as ReadingGroup[]
        setGroups(gs)
        setGroupId(id => id || gs[0]?.id || '')
        setCycles(cs)
        setCatalog(cat)
        setInitLoading(false)
      })
      .catch(err => {
        console.error(err)
        if (!cancelled) {
          setError('No se pudo cargar el catálogo de PDA. ¿Ya se corrió el SQL de PDA?')
          setInitLoading(false)
        }
      })
    return () => { cancelled = true }
  }, [profile?.id])

  const cycle = cycles.find(c => c.is_current) ?? null
  const range = useMemo((): { from: string; to: string; label: string } | null => {
    if (!cycle) return null
    if (period === 'ciclo') return { from: cycle.starts_on, to: cycle.ends_on, label: `Ciclo ${cycle.cycle}` }
    if (period.startsWith('term:')) {
      const t = cycle.terms[Number(period.slice(5))]
      return t ? { from: t.starts_on, to: t.ends_on, label: t.name } : null
    }
    if (rangeFrom && rangeTo && rangeFrom <= rangeTo) return { from: rangeFrom, to: rangeTo, label: `${formatDate(rangeFrom)} a ${formatDate(rangeTo)}` }
    return null
  }, [cycle, period, rangeFrom, rangeTo])

  useEffect(() => {
    if (!groupId || !range || !profile?.id) return
    let cancelled = false
    const key = `${groupId}|${range.from}|${range.to}|${allTeachers}`
    fetchPdaProgress({ groupId, from: range.from, to: range.to, allTeachers, teacherId: profile.id })
      .then(d => {
        if (cancelled) return
        setData(d)
        setGrade(g => (g && d.grades.includes(g) ? g : d.grades[0] ?? null))
        setError('')
      })
      .catch(err => {
        console.error(err)
        if (!cancelled) setError('No se pudo calcular el avance de PDA.')
      })
      .finally(() => { if (!cancelled) setResultKey(key) })
    return () => { cancelled = true }
  }, [groupId, range, allTeachers, profile?.id])

  // Cargando mientras el resultado no corresponde a los filtros actuales.
  const currentKey = groupId && range ? `${groupId}|${range.from}|${range.to}|${allTeachers}` : ''
  const loading = initLoading || (currentKey !== '' && resultKey !== currentKey)

  const statuses: PdaStatusMap = (grade && data?.byGrade.get(grade)) || new Map()
  const groupName = groups.find(g => g.id === groupId)?.name ?? ''

  return (
    <div className="min-h-screen bg-sepia-100">
      <TeacherHeader title="PDA · Cumplimiento" />
      <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-5">
        <div className="bg-parchment-50 border border-parchment-200 rounded-xl p-4 flex flex-wrap items-end gap-3">
          <label className="block">
            <span className="font-body text-xs text-ink-600 block">Grupo</span>
            <select value={groupId} onChange={e => setGroupId(e.target.value)} className={selectClass}>
              {groups.length === 0 && <option value="">Sin grupos</option>}
              {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="font-body text-xs text-ink-600 block">Periodo</span>
            <select value={period} onChange={e => setPeriod(e.target.value)} className={selectClass}>
              <option value="ciclo">Todo el ciclo{cycle ? ` ${cycle.cycle}` : ''}</option>
              {cycle?.terms.map((t, i) => <option key={i} value={`term:${i}`}>{t.name}</option>)}
              <option value="rango">Rango de fechas…</option>
            </select>
          </label>
          {period === 'rango' && (
            <>
              <label className="block"><span className="font-body text-xs text-ink-600 block">Desde</span><input type="date" value={rangeFrom} onChange={e => setRangeFrom(e.target.value)} className={selectClass} /></label>
              <label className="block"><span className="font-body text-xs text-ink-600 block">Hasta</span><input type="date" value={rangeTo} onChange={e => setRangeTo(e.target.value)} className={selectClass} /></label>
            </>
          )}
          {data && data.grades.length > 1 && (
            <label className="block">
              <span className="font-body text-xs text-ink-600 block">Grado</span>
              <select value={grade ?? ''} onChange={e => setGrade(Number(e.target.value) as PdaGrade)} className={selectClass}>
                {data.grades.map(g => <option key={g} value={g}>{g}°</option>)}
              </select>
            </label>
          )}
          <label className="font-body text-sm text-ink-700 flex items-center gap-2 pb-2">
            <input type="checkbox" checked={allTeachers} onChange={e => setAllTeachers(e.target.checked)} />
            Ver las de todo el equipo
          </label>
          <button onClick={() => setShowReport(true)} disabled={!data || !grade || !range} className={`${btnPrimary} ml-auto`}>
            ⬇ Concentrado del Programa Sintético
          </button>
        </div>

        {error && <p role="alert" className="font-body text-sm text-crimson-500">{error}</p>}
        {!cycle && !loading && !error && <p className="font-body text-sm text-ink-500">No hay un ciclo escolar actual configurado.</p>}
        {groups.length === 0 && !loading && !error && <p className="font-body text-sm text-ink-500">Todavía no tienes grupos activos.</p>}

        {loading ? (
          <div className="p-10 flex justify-center"><div className="spinner" /></div>
        ) : data && !grade ? (
          <p className="font-body text-sm bg-amber-50 text-amber-900 border border-amber-200 rounded-lg px-4 py-3">
            Ponles grado en Estudiantes para ver su avance{data.studentsWithoutGrade ? ` (${data.studentsWithoutGrade} sin grado)` : ''}.
          </p>
        ) : data && grade ? (
          <>
            <p className="font-body text-xs text-ink-500">
              {data.assignmentsCount} asignación{data.assignmentsCount === 1 ? '' : 'es'} en el periodo
              {data.studentsWithoutGrade > 0 && ` · ${data.studentsWithoutGrade} estudiante${data.studentsWithoutGrade === 1 ? '' : 's'} sin grado no cuenta${data.studentsWithoutGrade === 1 ? '' : 'n'}`}
            </p>
            {CAMPOS.map(c => (
              <section key={c.campo} aria-labelledby={`campo-${c.campo}`} className="space-y-2">
                <h2 id={`campo-${c.campo}`} className="font-display font-semibold text-ink-800">{c.campo}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {c.disciplinas.map(d => {
                    const pdas = catalog.filter(p => p.disciplina === d && (p.grade === null || p.grade === grade))
                    if (pdas.length === 0) return null
                    const done = pdas.filter(p => { const s = statuses.get(p.id)?.state; return s === 'logro' || s === 'abordado' }).length
                    return (
                      <details key={d} className="bg-parchment-50 border border-parchment-200 rounded-xl p-4 min-w-0">
                        <summary className="cursor-pointer font-body text-sm text-ink-800">
                          <strong>{d}</strong> · {done} de {pdas.length} PDA abordados
                        </summary>
                        <ul className="mt-3 space-y-2">
                          {pdas.map(p => {
                            const s = statuses.get(p.id)
                            return (
                              <li key={p.id} className="font-body text-sm text-ink-700">
                                <div className="flex items-start gap-2">
                                  <span className="flex-1 min-w-0"><span className="font-mono text-xs text-ink-500">{p.code}</span> · {p.text}</span>
                                  <Badge state={s?.state ?? 'pendiente'} />
                                </div>
                                {s && s.evidence.length > 0 && (
                                  <ul className="mt-1 ml-3 space-y-0.5">
                                    {s.evidence.map(e => (
                                      <li key={e.assignmentId} className="font-body text-xs text-ink-500">
                                        {e.readingTitle} · {formatDate(localDate(e.date))} · completaron {e.completed} de {e.total}
                                        {e.avg !== null && ` · comprensión ${Math.round(e.avg)}%`} · {PANEL_LABEL[e.state]}
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </li>
                            )
                          })}
                        </ul>
                      </details>
                    )
                  })}
                </div>
              </section>
            ))}
          </>
        ) : null}
      </div>

      {showReport && data && range && cycle && (
        <ReportDialog
          onClose={() => setShowReport(false)}
          catalog={catalog}
          data={data}
          grades={data.grades}
          header={{ ciclo: cycle.cycle, grupo: groupName, docente: allTeachers ? 'Equipo docente' : profile?.full_name ?? profile?.email ?? '', periodo: range.label }}
        />
      )}
    </div>
  )
}

function ReportDialog({ onClose, catalog, data, grades, header }: {
  onClose: () => void
  catalog: Pda[]
  data: PdaProgress
  grades: PdaGrade[]
  header: { ciclo: string; grupo: string; docente: string; periodo: string }
}) {
  const [discs, setDiscs] = useState<Set<string>>(new Set(CAMPOS.filter(c => DEFAULT_CAMPOS.includes(c.campo)).flatMap(c => c.disciplinas)))
  const [selGrades, setSelGrades] = useState<Set<PdaGrade>>(new Set(grades))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const toggle = <T,>(set: Set<T>, v: T) => { const n = new Set(set); if (n.has(v)) n.delete(v); else n.add(v); return n }

  async function download(kind: 'xlsx' | 'pdf') {
    setBusy(true)
    setError('')
    try {
      const s = await fetchSettings().catch(() => ({ school_name: null, cct: null }))
      const h = { escuela: s.school_name ?? '', cct: s.cct ?? '', ...header }
      const gs = grades.filter(g => selGrades.has(g))
      const sheets = gs.map(g => ({ grade: g, rows: buildConcentradoRows(catalog, data.byGrade.get(g) ?? new Map(), g, [...discs]) }))
      const name = concentradoFileName(header.grupo, gs.length === 1 ? gs[0] : gs[0], header.periodo)
      const exp = await import('@/lib/concentradoExport')
      if (kind === 'xlsx') await exp.downloadConcentradoXlsx(h, sheets, gs.length > 1 ? name.replace(/-\do-/, '-') : name)
      else await exp.downloadConcentradoPdf(h, sheets, (gs.length > 1 ? name.replace(/-\do-/, '-') : name).replace(/\.xlsx$/, '.pdf'))
    } catch (err) {
      console.error(err)
      setError('No se pudo generar el archivo. Inténtalo de nuevo.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-ink-900/50 flex items-center justify-center p-4" onKeyDown={e => { if (e.key === 'Escape') onClose() }}>
      <div role="dialog" aria-modal="true" aria-labelledby="report-title" className="bg-parchment-50 rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto border border-parchment-200 p-5 space-y-4">
        <div>
          <h2 id="report-title" className="font-display text-lg font-bold text-ink-900">Concentrado del Programa Sintético</h2>
          <p className="font-body text-xs text-ink-500">{header.grupo} · {header.periodo}. Incluye todos los PDA del grado, también los pendientes por trabajar.</p>
        </div>
        <fieldset>
          <legend className="font-body text-sm font-semibold text-ink-800 mb-1">Disciplinas</legend>
          {CAMPOS.map(c => (
            <div key={c.campo} className="mb-2">
              <p className="font-body text-xs text-ink-500">{c.campo}</p>
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                {c.disciplinas.map(d => (
                  <label key={d} className="font-body text-sm text-ink-700 flex items-center gap-1.5">
                    <input type="checkbox" checked={discs.has(d)} onChange={() => setDiscs(s => toggle(s, d))} />{d}
                  </label>
                ))}
              </div>
            </div>
          ))}
        </fieldset>
        {grades.length > 1 && (
          <fieldset>
            <legend className="font-body text-sm font-semibold text-ink-800 mb-1">Grados (una hoja por grado)</legend>
            <div className="flex gap-4">
              {grades.map(g => (
                <label key={g} className="font-body text-sm text-ink-700 flex items-center gap-1.5">
                  <input type="checkbox" checked={selGrades.has(g)} onChange={() => setSelGrades(s => toggle(s, g))} />{g}°
                </label>
              ))}
            </div>
          </fieldset>
        )}
        {error && <p role="alert" className="font-body text-sm text-crimson-500">{error}</p>}
        <div className="flex flex-wrap justify-end gap-2">
          <button onClick={onClose} className={btnOutline}>Cerrar</button>
          <button onClick={() => void download('pdf')} disabled={busy || discs.size === 0 || selGrades.size === 0} className={btnOutline}>Descargar PDF</button>
          <button onClick={() => void download('xlsx')} disabled={busy || discs.size === 0 || selGrades.size === 0} className={btnPrimary}>{busy ? 'Generando…' : 'Descargar Excel'}</button>
        </div>
      </div>
    </div>
  )
}
