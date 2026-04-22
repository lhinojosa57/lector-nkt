import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { Plus, Users, Copy, Check, X, Edit2 } from 'lucide-react'

interface Group {
  id: string
  teacher_id: string
  name: string
  description: string | null
  grado: string | null
  modalidad: string
  school_year: string
  invite_code: string
  classroom_id: string | null
  archived: boolean
  created_at: string
  student_count: number
}

const GRADOS = ['Primer grado', 'Segundo grado', 'Tercer grado']
const MODALIDADES = ['Presencial', 'Virtual', 'Online']

export default function TeacherGroupsLector() {
  const { profile } = useAuth()
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showArchived, setShowArchived] = useState(false)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [editingGroup, setEditingGroup] = useState<string | null>(null)

  const [form, setForm] = useState({
    name: '',
    description: '',
    grado: '',
    modalidad: 'Presencial',
    school_year: '2025-2026',
  })

  async function loadGroups() {
    if (!profile) return
    const { data } = await supabase
      .from('reading_groups')
      .select('*, reading_group_members(count)')
      .eq('teacher_id', profile.id)
      .order('created_at', { ascending: false })
    setGroups((data ?? []).map((g: any) => ({
      ...g,
      student_count: g.reading_group_members?.[0]?.count ?? 0
    })))
    setLoading(false)
  }

  useEffect(() => { loadGroups() }, [profile])

  const handleOpenCreate = () => {
    setEditingGroup(null)
    setForm({ name: '', description: '', grado: '', modalidad: 'Presencial', school_year: '2025-2026' })
    setShowModal(true)
  }

  const handleOpenEdit = (g: Group) => {
    setEditingGroup(g.id)
    setForm({
      name: g.name,
      description: g.description ?? '',
      grado: g.grado ?? '',
      modalidad: g.modalidad ?? 'Presencial',
      school_year: g.school_year ?? '2025-2026',
    })
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!profile || !form.name.trim()) return
    setSaving(true)
    try {
      const payload = {
        name: form.name,
        description: form.description || null,
        grado: form.grado || null,
        modalidad: form.modalidad,
        school_year: form.school_year,
      }
      if (editingGroup) {
        await supabase.from('reading_groups').update(payload).eq('id', editingGroup)
      } else {
        await supabase.from('reading_groups').insert({ ...payload, teacher_id: profile.id })
      }
      setSaving(false)
      setShowModal(false)
      setEditingGroup(null)
      loadGroups()
    } catch {
      alert('Error inesperado.')
      setSaving(false)
    }
  }

  const handleArchive = async (id: string, archived: boolean) => {
    if (!confirm(`¿Seguro que quieres ${archived ? 'desarchivar' : 'archivar'} este grupo?`)) return
    await supabase.from('reading_groups').update({ archived: !archived }).eq('id', id)
    loadGroups()
  }

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code)
    setCopiedCode(code)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  const filtered = showArchived ? groups.filter(g => g.archived) : groups.filter(g => !g.archived)

  if (loading) return (
    <div className="min-h-screen bg-sepia-100 flex items-center justify-center">
      <div className="spinner mx-auto" />
    </div>
  )

  return (
    <div className="min-h-screen bg-sepia-100">
      <div className="bg-parchment-50 border-b border-parchment-200 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="font-display text-xl font-bold text-ink-900">Grupos</h1>
            <p className="font-body text-xs text-ink-500 mt-0.5">Organiza tus estudiantes por grupo</p>
          </div>
          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-2 bg-teal-600 text-white px-4 py-2 rounded-lg font-body text-sm font-medium hover:bg-teal-500 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nuevo grupo
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-6">

        {/* Toggle archivados */}
        <div className="flex gap-3 mb-6">
          <button
            onClick={() => setShowArchived(false)}
            className={`font-body text-sm px-4 py-2 rounded-lg transition-colors ${!showArchived ? 'bg-teal-600 text-white' : 'bg-parchment-50 text-ink-600 border border-parchment-200'}`}
          >
            Activos ({groups.filter(g => !g.archived).length})
          </button>
          <button
            onClick={() => setShowArchived(true)}
            className={`font-body text-sm px-4 py-2 rounded-lg transition-colors ${showArchived ? 'bg-teal-600 text-white' : 'bg-parchment-50 text-ink-600 border border-parchment-200'}`}
          >
            Archivados ({groups.filter(g => g.archived).length})
          </button>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-parchment-200 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-ink-400" />
            </div>
            <p className="font-display text-lg font-bold text-ink-700 mb-2">
              {showArchived ? 'No hay grupos archivados' : 'Aún no tienes grupos'}
            </p>
            <p className="font-body text-sm text-ink-500 mb-6">
              Crea un grupo y comparte el código con tus estudiantes
            </p>
            {!showArchived && (
              <button
                onClick={handleOpenCreate}
                className="bg-teal-600 text-white px-6 py-3 rounded-lg font-body font-medium hover:bg-teal-500 transition-colors"
              >
                Crear primer grupo
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map(group => (
              <div key={group.id} className="bg-parchment-50 border border-parchment-200 rounded-xl p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-display text-lg font-semibold text-ink-800">{group.name}</h3>
                    <div className="flex gap-2 mt-1 flex-wrap">
                      {group.grado && (
                        <span className="font-body text-xs text-ink-500">{group.grado}</span>
                      )}
                      <span className={`font-body text-xs px-2 py-0.5 rounded-full font-medium ${
                        group.modalidad === 'Virtual' ? 'bg-blue-100 text-blue-800' :
                        group.modalidad === 'Online' ? 'bg-purple-100 text-purple-800' :
                        'bg-teal-100 text-teal-800'
                      }`}>
                        {group.modalidad}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => handleOpenEdit(group)} className="text-ink-400 hover:text-teal-600 transition-colors p-1.5">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleArchive(group.id, group.archived)} className="text-ink-300 hover:text-teal-600 transition-colors p-1.5" title={group.archived ? 'Desarchivar' : 'Archivar'}>
                      {group.archived ? '📂' : '📁'}
                    </button>
                  </div>
                </div>

                {group.description && (
                  <p className="font-body text-sm text-ink-600 mb-3 line-clamp-2">{group.description}</p>
                )}

                <div className="flex items-center gap-2 text-sm text-ink-500 mb-4">
                  <Users className="w-3.5 h-3.5" />
                  <span className="font-body">{group.student_count} estudiante{group.student_count !== 1 ? 's' : ''}</span>
                </div>

                <div className="bg-sepia-100 rounded-lg px-3 py-2 flex items-center justify-between border border-parchment-200">
                  <div>
                    <p className="font-mono text-xs text-ink-400 uppercase">Código de acceso</p>
                    <p className="font-mono font-bold text-ink-800 tracking-widest text-lg">{group.invite_code}</p>
                  </div>
                  <button onClick={() => copyCode(group.invite_code)} className="text-ink-400 hover:text-teal-600 transition-colors p-1.5">
                    {copiedCode === group.invite_code ? <Check className="w-4 h-4 text-teal-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div style={{ minHeight: '100vh', background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="bg-parchment-50 rounded-xl w-full max-w-md border border-parchment-200">
            <div className="flex items-center justify-between p-5 border-b border-parchment-200">
              <h2 className="font-display text-lg font-semibold text-ink-800">
                {editingGroup ? 'Editar grupo' : 'Nuevo grupo'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-ink-400 hover:text-ink-700 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="font-body text-sm font-medium text-ink-700 block mb-1.5">Nombre del grupo *</label>
                <input
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="ej. Lectores Virtuales 2°"
                  className="w-full border border-parchment-300 rounded-lg px-3 py-2 font-body text-sm text-ink-800 bg-white focus:outline-none focus:border-teal-400"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-body text-sm font-medium text-ink-700 block mb-1.5">Grado</label>
                  <select
                    value={form.grado}
                    onChange={e => setForm(f => ({ ...f, grado: e.target.value }))}
                    className="w-full border border-parchment-300 rounded-lg px-3 py-2 font-body text-sm text-ink-800 bg-white focus:outline-none focus:border-teal-400"
                  >
                    <option value="">Seleccionar…</option>
                    {GRADOS.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                <div>
                  <label className="font-body text-sm font-medium text-ink-700 block mb-1.5">Modalidad</label>
                  <select
                    value={form.modalidad}
                    onChange={e => setForm(f => ({ ...f, modalidad: e.target.value }))}
                    className="w-full border border-parchment-300 rounded-lg px-3 py-2 font-body text-sm text-ink-800 bg-white focus:outline-none focus:border-teal-400"
                  >
                    {MODALIDADES.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="font-body text-sm font-medium text-ink-700 block mb-1.5">Descripción (opcional)</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={2}
                  className="w-full border border-parchment-300 rounded-lg px-3 py-2 font-body text-sm text-ink-800 bg-white focus:outline-none focus:border-teal-400 resize-none"
                />
              </div>
            </div>
            <div className="flex gap-3 p-5 pt-0">
              <button onClick={() => setShowModal(false)} className="flex-1 border border-parchment-300 text-ink-700 py-2.5 rounded-lg font-body text-sm hover:bg-sepia-100 transition-colors">
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={!form.name.trim() || saving}
                className="flex-1 bg-teal-600 text-white py-2.5 rounded-lg font-body text-sm font-medium hover:bg-teal-500 disabled:opacity-40 transition-colors"
              >
                {saving ? 'Guardando...' : editingGroup ? 'Guardar cambios' : 'Crear grupo'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}