import { useCallback, useEffect, useMemo, useState } from 'react'
import TeacherHeader from '@/components/TeacherHeader'
import PasteListModal from '@/components/PasteListModal'
import { levelName } from '@/lib/lec'
import { formatGrade, type Grade } from '@/lib/roster'
import { todayLocal } from '@/lib/assignmentRules'
import {
  fetchCurrentCycle, fetchRoster, setGrade, setStatus, purgeStudent, promoteCycle,
  type Cycle, type RosterRow,
} from '@/lib/rosterApi'

type GradeFilter = 'todos' | '1' | '2' | '3' | 'sin'

function nextCycle(cycle: string): string {
  const m = cycle.match(/^(\d{4})-(\d{4})$/)
  return m ? `${Number(m[1]) + 1}-${Number(m[2]) + 1}` : cycle
}

const STATUS_LABEL: Record<RosterRow['status'], string> = { activo: 'Activo', baja: 'Baja', egresado: 'Egresado' }

export default function Students() {
  const [cycle, setCycle] = useState<Cycle | null>(null)
  const [rows, setRows] = useState<RosterRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [search, setSearch] = useState('')
  const [gradeFilter, setGradeFilter] = useState<GradeFilter>('todos')
  const [showInactive, setShowInactive] = useState(false)
  const [showPaste, setShowPaste] = useState(false)
  const [purging, setPurging] = useState<RosterRow | null>(null)

  const load = useCallback(async () => {
    try {
      const c = await fetchCurrentCycle()
      setCycle(c)
      setRows(await fetchRoster(c.cycle))
      setError('')
    } catch (err) {
      console.error(err)
      setError('No se pudieron cargar los estudiantes.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const active = rows.filter(r => r.status === 'activo')
  const withoutGrade = active.filter(r => r.grade === null).length

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    return rows.filter(r => {
      if (!showInactive && r.status !== 'activo') return false
      if (q && !(r.full_name ?? '').toLowerCase().includes(q) && !r.email.toLowerCase().includes(q)) return false
      if (gradeFilter === 'sin') return r.grade === null
      if (gradeFilter !== 'todos') return r.grade === Number(gradeFilter)
      return true
    })
  }, [rows, search, gradeFilter, showInactive])

  function patch(id: string, change: Partial<RosterRow>) {
    setRows(rs => rs.map(r => (r.id === id ? { ...r, ...change } : r)))
  }

  async function changeGrade(r: RosterRow, value: string) {
    if (!cycle) return
    const grade = value ? (Number(value) as Grade) : null
    const prev = r.grade
    patch(r.id, { grade })
    try {
      await setGrade(r.id, cycle.cycle, grade)
    } catch (err) {
      console.error(err)
      patch(r.id, { grade: prev })
      setError(`No se pudo guardar el grado de ${r.full_name ?? r.email}.`)
    }
  }

  async function drop(r: RosterRow) {
    if (!cycle) return
    const name = r.full_name ?? r.email
    if (!window.confirm(`¿Dar de baja a ${name}? Dejará de contar en listas y porcentajes desde hoy. Su historial se conserva.`)) return
    try {
      const today = todayLocal()
      await setStatus(r.id, cycle.cycle, 'baja', today)
      patch(r.id, { status: 'baja', status_date: today })
      setNotice(`${name} quedó dado de baja.`)
    } catch (err) {
      console.error(err)
      setError(`No se pudo dar de baja a ${name}.`)
    }
  }

  async function reactivate(r: RosterRow) {
    if (!cycle) return
    try {
      await setStatus(r.id, cycle.cycle, 'activo', null)
      patch(r.id, { status: 'activo', status_date: null })
      setNotice(`${r.full_name ?? r.email} está activo otra vez.`)
    } catch (err) {
      console.error(err)
      setError('No se pudo reactivar.')
    }
  }

  async function promote() {
    if (!cycle) return
    const to = nextCycle(cycle.cycle)
    if (!window.confirm(
      `Se creará el ciclo ${to} a partir de ${cycle.cycle}: 1° pasa a 2°, 2° pasa a 3° y 3° queda como egresado. ` +
      'Los dados de baja no pasan. Si ya existe, solo se agregan los que falten y se actualizan las bajas nuevas.'
    )) return
    try {
      const r = await promoteCycle(cycle.cycle, to)
      const parts = [
        r.creados > 0 ? `${r.creados} ${r.creados === 1 ? 'estudiante nuevo' : 'estudiantes nuevos'} en ${to}` : `${to} ya estaba al día`,
        r.bajas_sincronizadas > 0 ? `${r.bajas_sincronizadas} ${r.bajas_sincronizadas === 1 ? 'baja actualizada' : 'bajas actualizadas'}` : '',
      ].filter(Boolean)
      setNotice(`Listo: ${parts.join(' · ')}.`)
    } catch (err) {
      console.error(err)
      setError('No se pudo preparar el ciclo siguiente.')
    }
  }

  if (loading) {
    return <div className="min-h-screen bg-sepia-100 flex items-center justify-center"><div className="spinner" /></div>
  }

  const controlClass = 'font-body text-sm bg-parchment-50 border border-parchment-300 rounded-lg px-3 py-2 text-ink-700'

  return (
    <div className="min-h-screen bg-sepia-100">
      <TeacherHeader title="Estudiantes" />
      <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-4">
        {cycle && <p className="font-body text-sm text-ink-600">Ciclo {cycle.cycle}</p>}

        {notice && <p role="status" className="font-body text-sm bg-teal-50 text-teal-800 border border-teal-200 rounded-lg px-4 py-2">{notice}</p>}
        {error && <p role="alert" className="font-body text-sm text-crimson-500">{error}</p>}
        {withoutGrade > 0 && (
          <p className="font-body text-sm bg-amber-50 text-amber-900 border border-amber-200 rounded-lg px-4 py-2">
            {withoutGrade} {withoutGrade === 1 ? 'estudiante sin grado' : 'estudiantes sin grado'}. Ponles grado para que sus lecturas cuenten en el cumplimiento.
          </p>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <input
            type="search"
            aria-label="Buscar estudiante"
            placeholder="Buscar por nombre o correo…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className={`${controlClass} flex-1 min-w-[200px]`}
          />
          <select aria-label="Filtrar por grado" value={gradeFilter} onChange={e => setGradeFilter(e.target.value as GradeFilter)} className={controlClass}>
            <option value="todos">Todos los grados</option>
            <option value="1">1°</option>
            <option value="2">2°</option>
            <option value="3">3°</option>
            <option value="sin">Sin grado</option>
          </select>
          <label className="font-body text-sm text-ink-700 flex items-center gap-2">
            <input type="checkbox" checked={showInactive} onChange={e => setShowInactive(e.target.checked)} />
            Ver dados de baja
          </label>
          <button onClick={() => setShowPaste(true)} className="font-body text-sm px-3 py-2 rounded-lg bg-teal-600 text-white hover:bg-teal-500">
            Pegar lista
          </button>
          <button onClick={promote} className="font-body text-sm px-3 py-2 rounded-lg border border-parchment-300 text-ink-700 hover:bg-parchment-100">
            Pasar de grado
          </button>
        </div>

        <div className="bg-parchment-50 border border-parchment-200 rounded-xl overflow-x-auto">
          <table className="w-full min-w-[720px]">
            <thead>
              <tr className="bg-sepia-100 border-b border-parchment-200 text-left">
                <th scope="col" className="px-4 py-3 font-body text-xs text-ink-500 font-medium">Estudiante</th>
                <th scope="col" className="px-3 py-3 font-body text-xs text-ink-500 font-medium">Grado {cycle?.cycle}</th>
                <th scope="col" className="px-3 py-3 font-body text-xs text-ink-500 font-medium">Grupos</th>
                <th scope="col" className="px-3 py-3 font-body text-xs text-ink-500 font-medium">Nivel</th>
                <th scope="col" className="px-3 py-3 font-body text-xs text-ink-500 font-medium">Estado</th>
                <th scope="col" className="px-3 py-3 font-body text-xs text-ink-500 font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {visible.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-6 font-body text-sm text-ink-500 text-center">No hay estudiantes con estos filtros.</td></tr>
              )}
              {visible.map(r => {
                const name = r.full_name ?? r.email
                return (
                  <tr key={r.id} className="border-b border-parchment-200 last:border-0">
                    <td className="px-4 py-3">
                      <p className="font-body text-sm font-medium text-ink-800">{name}</p>
                      <p className="font-body text-xs text-ink-500">{r.email}</p>
                    </td>
                    <td className="px-3 py-3">
                      <select
                        aria-label={`Grado de ${name}`}
                        value={r.grade ?? ''}
                        disabled={r.status !== 'activo'}
                        onChange={e => changeGrade(r, e.target.value)}
                        className="font-body text-sm bg-white border border-parchment-300 rounded-lg px-2 py-1 text-ink-800 disabled:opacity-60"
                      >
                        <option value="">{formatGrade(null)}</option>
                        <option value="1">1°</option>
                        <option value="2">2°</option>
                        <option value="3">3°</option>
                      </select>
                    </td>
                    <td className="px-3 py-3 font-body text-xs text-ink-600">{r.groups.join(', ') || '—'}</td>
                    <td className="px-3 py-3 font-body text-xs text-ink-600">
                      {r.levels.es !== null && <span className="block">Es: {r.levels.es} · {levelName(r.levels.es)}</span>}
                      {r.levels.en !== null && <span className="block">En: {r.levels.en} · {levelName(r.levels.en)}</span>}
                      {r.levels.es === null && r.levels.en === null && '—'}
                    </td>
                    <td className="px-3 py-3">
                      <span className={`font-body text-xs px-2 py-1 rounded-full ${
                        r.status === 'activo' ? 'bg-teal-50 text-teal-700' : 'bg-parchment-200 text-ink-700'
                      }`}>
                        {STATUS_LABEL[r.status]}{r.status_date ? ` · ${r.status_date}` : ''}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-2">
                        {r.status === 'activo' ? (
                          <button onClick={() => drop(r)} className="font-body text-xs text-ink-700 underline hover:text-ink-900">Dar de baja</button>
                        ) : (
                          <button onClick={() => reactivate(r)} className="font-body text-xs text-teal-700 underline hover:text-teal-800">Reactivar</button>
                        )}
                        <button onClick={() => setPurging(r)} className="font-body text-xs text-crimson-500 underline">Borrar datos de LectorNKT</button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {showPaste && cycle && (
        <PasteListModal cycle={cycle.cycle} onClose={() => setShowPaste(false)} onApplied={() => void load()} />
      )}
      {purging && (
        <PurgeDialog
          row={purging}
          onClose={() => setPurging(null)}
          onDone={summary => {
            const total = Object.values(summary).reduce((a, b) => a + b, 0)
            setNotice(`Se borraron ${total} registros de LectorNKT de ${purging.full_name ?? purging.email}.`)
            setPurging(null)
            void load()
          }}
        />
      )}
    </div>
  )
}

function PurgeDialog({ row, onClose, onDone }: {
  row: RosterRow
  onClose: () => void
  onDone: (summary: Record<string, number>) => void
}) {
  const [typed, setTyped] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const name = row.full_name ?? row.email
  const matches = typed.trim().toLowerCase() === row.email.toLowerCase()

  async function confirm() {
    setBusy(true)
    setError('')
    try {
      onDone(await purgeStudent(row.id))
    } catch (err) {
      console.error(err)
      setError('No se pudieron borrar los datos.')
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-ink-900/50 flex items-center justify-center p-4" onKeyDown={e => { if (e.key === 'Escape') onClose() }}>
      <div role="alertdialog" aria-modal="true" aria-labelledby="purge-title" aria-describedby="purge-desc"
        className="bg-parchment-50 rounded-xl w-full max-w-md border border-parchment-200 p-6 space-y-3">
        <h2 id="purge-title" className="font-display text-lg font-bold text-ink-800">Borrar datos de LectorNKT de {name}</h2>
        <div id="purge-desc" className="font-body text-sm text-ink-700 space-y-2">
          <p>Se borran sus lecturas, respuestas, revisiones de fluidez, niveles, consentimiento, apoyos e inscripciones de LectorNKT.</p>
          <p>No se borra su cuenta ni sus datos de EvalNKT o VideoNKT. Sus audios están en su propio Drive y se borran al cierre del ciclo.</p>
          <p className="font-semibold text-crimson-500">Esto no se puede deshacer.</p>
          <p>Para confirmar, escribe su correo: <span className="font-mono">{row.email}</span></p>
        </div>
        <input
          autoFocus
          aria-label="Correo del estudiante para confirmar"
          value={typed}
          onChange={e => setTyped(e.target.value)}
          className="w-full border border-parchment-300 rounded-lg px-3 py-2 font-mono text-sm bg-white"
        />
        {error && <p role="alert" className="font-body text-sm text-crimson-500">{error}</p>}
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 border border-parchment-300 text-ink-700 py-2.5 rounded-lg font-body text-sm hover:bg-sepia-100">Cancelar</button>
          <button onClick={confirm} disabled={!matches || busy}
            className="flex-1 bg-crimson-500 text-white py-2.5 rounded-lg font-body text-sm font-medium disabled:opacity-40">
            {busy ? 'Borrando…' : 'Borrar definitivamente'}
          </button>
        </div>
      </div>
    </div>
  )
}
