import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import TeacherHeader from '@/components/TeacherHeader'
import { useAuth } from '@/lib/auth'
import { formatDate, levelName, modeLabel, type LecAssignment } from '@/lib/lec'
import { effectiveDueDate, localDate } from '@/lib/assignmentRules'
import { computeTargets } from '@/lib/assignmentTargets'
import { fetchCurrentCycle } from '@/lib/rosterApi'

interface Row extends LecAssignment {
  readingTitle: string
  groupNames: string[]
  totalStudents: number
  completed: number
  started: number
}

export default function Assignments() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [showArchived, setShowArchived] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!profile?.id) return
    setError(null)
    const { data, error } = await supabase
      .from('lec_assignments')
      .select('*, lec_readings(title), lec_assignment_targets(group_id, student_id, reading_groups(name))')
      .eq('archived', showArchived)
      .eq('created_by', profile.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error(error)
      setError('No se pudieron cargar las asignaciones.')
      setLoading(false)
      return
    }

    type Raw = LecAssignment & {
      lec_readings: { title: string } | null
      lec_assignment_targets: { group_id: string | null; student_id: string | null; reading_groups: { name: string } | null }[]
    }
    const raw = (data ?? []) as Raw[]

    // Miembros actuales de cada grupo y la fecha en que se unieron (lec_group_joins).
    // Sin fecha registrada se toma como miembro desde siempre.
    const groupIds = [...new Set(raw.flatMap(a => a.lec_assignment_targets.map(t => t.group_id).filter(Boolean)))] as string[]
    const membersByGroup = new Map<string, { student_id: string; joined_at: string | null }[]>()
    if (groupIds.length) {
      const [membersRes, joinsRes] = await Promise.all([
        supabase.from('reading_group_members').select('group_id, student_id').in('group_id', groupIds),
        supabase.from('lec_group_joins').select('group_id, student_id, joined_at').in('group_id', groupIds),
      ])
      const joined = new Map<string, string>()
      for (const j of (joinsRes.data ?? []) as { group_id: string; student_id: string; joined_at: string }[]) {
        joined.set(`${j.group_id}|${j.student_id}`, j.joined_at)
      }
      for (const m of (membersRes.data ?? []) as { group_id: string; student_id: string }[]) {
        membersByGroup.set(m.group_id, [
          ...(membersByGroup.get(m.group_id) ?? []),
          { student_id: m.student_id, joined_at: joined.get(`${m.group_id}|${m.student_id}`) ?? null },
        ])
      }
    }

    // Bajas del ciclo actual
    const bajaDate = new Map<string, string | null>()
    try {
      const cycle = await fetchCurrentCycle()
      const { data: enr } = await supabase
        .from('lec_enrollments')
        .select('student_id, status_date')
        .eq('cycle', cycle.cycle)
        .eq('status', 'baja')
      for (const e of (enr ?? []) as { student_id: string; status_date: string | null }[]) {
        // Sin fecha registrada se toma como baja desde siempre.
        bajaDate.set(e.student_id, e.status_date ?? '0000-01-01')
      }
    } catch (err) {
      console.error(err)
    }

    // Intentos por asignación (iniciados y completados)
    const completedBy = new Map<string, Set<string>>()
    const startedBy = new Map<string, number>()
    if (raw.length) {
      const { data: attempts } = await supabase
        .from('lec_attempts')
        .select('assignment_id, student_id, completed_at')
        .in('assignment_id', raw.map(a => a.id))
      for (const at of (attempts ?? []) as { assignment_id: string; student_id: string; completed_at: string | null }[]) {
        startedBy.set(at.assignment_id, (startedBy.get(at.assignment_id) ?? 0) + 1)
        if (!at.completed_at) continue
        const set = completedBy.get(at.assignment_id) ?? new Set<string>()
        set.add(at.student_id)
        completedBy.set(at.assignment_id, set)
      }
    }

    setRows(raw.map(a => {
      const { targets } = computeTargets({ assignment: a, targets: a.lec_assignment_targets, membersByGroup, bajaDate })
      const done = completedBy.get(a.id) ?? new Set<string>()
      return {
        ...a,
        readingTitle: a.lec_readings?.title ?? 'Lectura eliminada',
        groupNames: a.lec_assignment_targets.map(t => t.reading_groups?.name).filter(Boolean) as string[],
        totalStudents: targets.size,
        completed: [...done].filter(id => targets.has(id)).length,
        started: startedBy.get(a.id) ?? 0,
      }
    }))
    setLoading(false)
  }, [showArchived, profile?.id])

  useEffect(() => { void load() }, [load])

  async function setArchived(id: string, archived: boolean) {
    const { error } = await supabase.from('lec_assignments').update({ archived }).eq('id', id)
    if (error) {
      setError('No se pudo actualizar la asignación.')
      return
    }
    setRows(r => r.filter(x => x.id !== id))
  }

  async function remove(a: Row) {
    if (a.started > 0) return
    if (!window.confirm(`¿Eliminar la asignación de "${a.readingTitle}"? Nadie la ha empezado todavía.`)) return
    const { error } = await supabase.from('lec_assignments').delete().eq('id', a.id)
    if (error) {
      console.error(error)
      setError('No se pudo eliminar la asignación.')
      return
    }
    setRows(r => r.filter(x => x.id !== a.id))
  }

  return (
    <div className="min-h-screen bg-sepia-100">
      <TeacherHeader title="Asignaciones" />

      <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex gap-2">
            {[false, true].map(a => (
              <button
                key={String(a)}
                onClick={() => { setLoading(true); setShowArchived(a) }}
                className={`font-body text-sm px-4 py-2 rounded-lg ${
                  showArchived === a ? 'bg-teal-600 text-white' : 'bg-parchment-50 text-ink-600 border border-parchment-300'
                }`}
              >
                {a ? 'Archivadas' : 'Activas'}
              </button>
            ))}
          </div>
          <button
            onClick={() => navigate('/teacher/library')}
            className="font-body text-sm px-4 py-2 rounded-lg bg-teal-600 text-white hover:bg-teal-500"
          >
            + Asignar desde la biblioteca
          </button>
        </div>

        {error && <p className="font-body text-sm text-crimson-500">{error}</p>}

        <div className="bg-parchment-50 border border-parchment-200 rounded-xl overflow-hidden">
          {loading ? (
            <div className="p-10 flex justify-center"><div className="spinner" /></div>
          ) : rows.length === 0 ? (
            <p className="p-6 font-body text-sm text-ink-500">
              {showArchived ? 'No hay asignaciones archivadas.' : 'Todavía no hay asignaciones. Elige una lectura en la biblioteca y presiona “Asignar”.'}
            </p>
          ) : (
            <ul className="divide-y divide-parchment-200">
              {rows.map(a => (
                <li key={a.id} className="px-5 py-4 flex flex-wrap items-center gap-4">
                  <div className="flex-1 min-w-[220px]">
                    <button
                      onClick={() => navigate(`/teacher/library/${a.reading_id}`)}
                      className="font-display font-semibold text-ink-900 hover:underline text-left"
                    >
                      {a.readingTitle}
                    </button>
                    <p className="font-body text-xs text-ink-500 mt-0.5">
                      {modeLabel(a.mode)} · {a.fixed_level ? `Nivel ${a.fixed_level} · ${levelName(a.fixed_level)}` : 'Nivel de cada estudiante'}
                      {' · '}{a.groupNames.join(', ') || 'Sin grupo'}
                    </p>
                    <p className="font-body text-xs text-ink-400 mt-0.5">
                      Asignada {formatDate(localDate(a.created_at))} · Fecha límite {formatDate(effectiveDueDate(a))}{a.due_date ? '' : ' (automática, 7 días)'}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="font-mono text-lg font-bold text-ink-800">{a.completed}/{a.totalStudents}</p>
                    <p className="font-body text-xs text-ink-500">completaron</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <button
                      onClick={() => setArchived(a.id, !a.archived)}
                      className="font-body text-xs text-ink-400 hover:text-ink-700"
                    >
                      {a.archived ? 'Desarchivar' : 'Archivar'}
                    </button>
                    {a.started === 0 ? (
                      <button onClick={() => remove(a)} className="font-body text-xs text-crimson-500 hover:text-crimson-600">
                        Eliminar
                      </button>
                    ) : (
                      <span className="font-body text-[11px] text-ink-400" title="Ya hay estudiantes que la empezaron; solo se puede archivar.">
                        Ya iniciada
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
