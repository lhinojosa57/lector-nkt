import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { LEVELS, MODES, type ReadingGroup, type ReadingMode } from '@/lib/lec'

interface Props {
  readingId: string
  readingTitle: string
  availableLevels: number[]
  onClose: () => void
  onAssigned: () => void
}

export default function AssignModal({ readingId, readingTitle, availableLevels, onClose, onAssigned }: Props) {
  const { profile } = useAuth()
  const [groups, setGroups] = useState<ReadingGroup[]>([])
  const [selected, setSelected] = useState<string[]>([])
  const [mode, setMode] = useState<ReadingMode>('silent')
  const [fixedLevel, setFixedLevel] = useState<number | ''>('')
  const [dueDate, setDueDate] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!profile?.id) return
    supabase
      .from('reading_groups')
      .select('id, name, grado, modalidad, archived')
      .eq('teacher_id', profile.id)
      .eq('archived', false)
      .order('name')
      .then(({ data }) => setGroups((data ?? []) as ReadingGroup[]))
  }, [profile?.id])

  const toggle = (id: string) =>
    setSelected(s => (s.includes(id) ? s.filter(x => x !== id) : [...s, id]))

  async function handleAssign() {
    if (!profile?.id || selected.length === 0) return
    setSaving(true)
    setError(null)

    const { data: assignment, error: aErr } = await supabase
      .from('lec_assignments')
      .insert({
        reading_id: readingId,
        mode,
        fixed_level: fixedLevel || null,
        due_date: dueDate || null,
        created_by: profile.id,
      })
      .select('id')
      .single()

    if (aErr || !assignment) {
      console.error(aErr)
      setError('No se pudo crear la asignación.')
      setSaving(false)
      return
    }

    const { error: tErr } = await supabase
      .from('lec_assignment_targets')
      .insert(selected.map(group_id => ({ assignment_id: assignment.id, group_id })))

    if (tErr) {
      console.error(tErr)
      await supabase.from('lec_assignments').delete().eq('id', assignment.id)
      setError('No se pudieron guardar los grupos de la asignación.')
      setSaving(false)
      return
    }

    setSaving(false)
    onAssigned()
  }

  return (
    <div className="fixed inset-0 bg-ink-900/50 flex items-center justify-center p-4 z-50">
      <div className="bg-parchment-50 rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between px-5 py-4 border-b border-parchment-200">
          <div>
            <p className="font-display text-lg font-bold text-ink-900">Asignar lectura</p>
            <p className="font-body text-xs text-ink-500 mt-0.5">{readingTitle}</p>
          </div>
          <button onClick={onClose} className="text-ink-400 hover:text-ink-700" aria-label="Cerrar">
            <X size={20} />
          </button>
        </div>

        <div className="p-5 space-y-5">
          <section>
            <p className="font-body text-sm font-semibold text-ink-800 mb-2">Grupos</p>
            {groups.length === 0 ? (
              <p className="font-body text-sm text-ink-500">No tienes grupos activos. Créalos en la pestaña Grupos.</p>
            ) : (
              <div className="space-y-1">
                {groups.map(g => (
                  <label key={g.id} className="flex items-center gap-2 font-body text-sm text-ink-700 cursor-pointer">
                    <input type="checkbox" checked={selected.includes(g.id)} onChange={() => toggle(g.id)} />
                    {g.name}
                    <span className="text-xs text-ink-400">{[g.grado, g.modalidad].filter(Boolean).join(' · ')}</span>
                  </label>
                ))}
              </div>
            )}
          </section>

          <section>
            <p className="font-body text-sm font-semibold text-ink-800 mb-2">Modo de lectura</p>
            <div className="space-y-2">
              {MODES.map(m => (
                <label key={m.value} className={`block border rounded-lg p-3 cursor-pointer ${
                  mode === m.value ? 'border-teal-500 bg-teal-50' : 'border-parchment-300'
                }`}>
                  <span className="flex items-center gap-2 font-body text-sm text-ink-800">
                    <input type="radio" name="mode" checked={mode === m.value} onChange={() => setMode(m.value)} />
                    {m.label}
                  </span>
                  <span className="block font-body text-xs text-ink-500 mt-1 ml-5">{m.description}</span>
                </label>
              ))}
            </div>
          </section>

          <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="block">
              <span className="font-body text-sm font-semibold text-ink-800">Nivel</span>
              <select
                value={fixedLevel}
                onChange={e => setFixedLevel(e.target.value ? Number(e.target.value) : '')}
                className="mt-1 w-full font-body text-sm bg-white border border-parchment-300 rounded-lg px-3 py-2"
              >
                <option value="">Según el nivel de cada estudiante</option>
                {LEVELS.filter(l => availableLevels.includes(l.level)).map(l => (
                  <option key={l.level} value={l.level}>Todos en nivel {l.level} · {l.name}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="font-body text-sm font-semibold text-ink-800">Fecha límite (opcional)</span>
              <input
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                className="mt-1 w-full font-body text-sm bg-white border border-parchment-300 rounded-lg px-3 py-2"
              />
            </label>
          </section>

          {error && <p className="font-body text-sm text-crimson-500">{error}</p>}
        </div>

        <div className="px-5 py-4 border-t border-parchment-200 flex justify-end gap-2">
          <button onClick={onClose} className="font-body text-sm px-4 py-2 rounded-lg text-ink-600 hover:bg-parchment-100">
            Cancelar
          </button>
          <button
            onClick={handleAssign}
            disabled={saving || selected.length === 0}
            className="font-body text-sm px-4 py-2 rounded-lg bg-teal-600 text-white hover:bg-teal-500 disabled:opacity-50"
          >
            {saving ? 'Asignando...' : 'Asignar'}
          </button>
        </div>
      </div>
    </div>
  )
}
