import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import TeacherHeader from '@/components/TeacherHeader'
import { useAuth } from '@/lib/auth'
import { formatDate, levelName, modeLabel, type LecAssignment } from '@/lib/lec'

interface Row extends LecAssignment {
  readingTitle: string
  groupNames: string[]
  totalStudents: number
  completed: number
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

    // Estudiantes por grupo (para saber cuántos deben leer cada asignación)
    const groupIds = [...new Set(raw.flatMap(a => a.lec_assignment_targets.map(t => t.group_id).filter(Boolean)))] as string[]
    const membersByGroup = new Map<string, string[]>()
    if (groupIds.length) {
      const { data: members } = await supabase
        .from('reading_group_members')
        .select('group_id, student_id')
        .in('group_id', groupIds)
      for (const m of (members ?? []) as { group_id: string; student_id: string }[]) {
        membersByGroup.set(m.group_id, [...(membersByGroup.get(m.group_id) ?? []), m.student_id])
      }
    }

    // Intentos completados por asignación
    const completedBy = new Map<string, Set<string>>()
    if (raw.length) {
      const { data: attempts } = await supabase
        .from('lec_attempts')
        .select('assignment_id, student_id')
        .in('assignment_id', raw.map(a => a.id))
        .not('completed_at', 'is', null)
      for (const at of (attempts ?? []) as { assignment_id: string; student_id: string }[]) {
        const set = completedBy.get(at.assignment_id) ?? new Set<string>()
        set.add(at.student_id)
        completedBy.set(at.assignment_id, set)
      }
    }

    setRows(raw.map(a => {
      const students = new Set<string>()
      for (const t of a.lec_assignment_targets) {
        if (t.student_id) students.add(t.student_id)
        if (t.group_id) (membersByGroup.get(t.group_id) ?? []).forEach(s => students.add(s))
      }
      return {
        ...a,
        readingTitle: a.lec_readings?.title ?? 'Lectura eliminada',
        groupNames: a.lec_assignment_targets.map(t => t.reading_groups?.name).filter(Boolean) as string[],
        totalStudents: students.size,
        completed: completedBy.get(a.id)?.size ?? 0,
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
                      Asignada {formatDate(a.created_at)} · Fecha límite {formatDate(a.due_date)}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="font-mono text-lg font-bold text-ink-800">{a.completed}/{a.totalStudents}</p>
                    <p className="font-body text-xs text-ink-500">completaron</p>
                  </div>
                  <button
                    onClick={() => setArchived(a.id, !a.archived)}
                    className="font-body text-xs text-ink-400 hover:text-ink-700"
                  >
                    {a.archived ? 'Desarchivar' : 'Archivar'}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
