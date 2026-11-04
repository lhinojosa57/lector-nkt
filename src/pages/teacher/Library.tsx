import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import TeacherHeader from '@/components/TeacherHeader'
import { LANGUAGES, LEVELS, SUBJECTS, type LecReading, type Language } from '@/lib/lec'

interface Row extends LecReading {
  levels: number[]
}

export default function Library() {
  const navigate = useNavigate()
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [search, setSearch] = useState('')
  const [language, setLanguage] = useState<Language | ''>('')
  const [subject, setSubject] = useState('')
  const [level, setLevel] = useState<number | ''>('')
  const [status, setStatus] = useState<'' | 'draft' | 'published'>('')

  useEffect(() => {
    let cancelled = false
    async function load() {
      const { data, error } = await supabase
        .from('lec_readings')
        .select('*, lec_versions(level)')
        .order('created_at', { ascending: false })
      if (cancelled) return
      if (error) {
        console.error(error)
        setError('No se pudo cargar la biblioteca.')
      } else {
        type Raw = LecReading & { lec_versions: { level: number }[] }
        setRows(((data ?? []) as Raw[]).map(r => ({
          ...r,
          levels: (r.lec_versions ?? []).map(v => v.level).sort(),
        })))
      }
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return rows.filter(r =>
      (!q || r.title.toLowerCase().includes(q) || (r.topic ?? '').toLowerCase().includes(q)) &&
      (!language || r.language === language) &&
      (!subject || r.subject === subject) &&
      (!level || r.levels.includes(level)) &&
      (!status || r.status === status)
    )
  }, [rows, search, language, subject, level, status])

  const selectClass = 'font-body text-sm bg-parchment-50 border border-parchment-300 rounded-lg px-3 py-2 text-ink-700'

  return (
    <div className="min-h-screen bg-sepia-100">
      <TeacherHeader title="Biblioteca de lecturas" />

      <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-4">
        <div className="bg-parchment-50 border border-parchment-200 rounded-xl p-4 flex flex-wrap gap-2">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por título o tema"
            className="font-body text-sm flex-1 min-w-[180px] bg-white border border-parchment-300 rounded-lg px-3 py-2"
          />
          <select value={language} onChange={e => setLanguage(e.target.value as Language | '')} className={selectClass}>
            <option value="">Todos los idiomas</option>
            {LANGUAGES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
          </select>
          <select value={subject} onChange={e => setSubject(e.target.value)} className={selectClass}>
            <option value="">Todas las materias</option>
            {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={level} onChange={e => setLevel(e.target.value ? Number(e.target.value) : '')} className={selectClass}>
            <option value="">Todos los niveles</option>
            {LEVELS.map(l => <option key={l.level} value={l.level}>{l.level} · {l.name}</option>)}
          </select>
          <select value={status} onChange={e => setStatus(e.target.value as '' | 'draft' | 'published')} className={selectClass}>
            <option value="">Todas</option>
            <option value="published">Publicadas</option>
            <option value="draft">Borradores</option>
          </select>
        </div>

        <div className="bg-parchment-50 border border-parchment-200 rounded-xl overflow-hidden">
          {loading ? (
            <div className="p-10 flex justify-center"><div className="spinner" /></div>
          ) : error ? (
            <p className="p-6 font-body text-sm text-crimson-500">{error}</p>
          ) : filtered.length === 0 ? (
            <p className="p-6 font-body text-sm text-ink-500">No hay lecturas con esos filtros.</p>
          ) : (
            <ul className="divide-y divide-parchment-200">
              {filtered.map(r => (
                <li key={r.id}>
                  <button
                    onClick={() => navigate(`/teacher/library/${r.id}`)}
                    className="w-full text-left px-5 py-4 hover:bg-parchment-100 transition-colors flex flex-wrap items-center gap-3"
                  >
                    <div className="flex-1 min-w-[200px]">
                      <p className="font-display font-semibold text-ink-900">{r.title}</p>
                      <p className="font-body text-xs text-ink-500 mt-0.5">
                        {r.subject} · {r.language === 'en' ? 'en inglés' : 'en español'}
                        {r.topic ? ` · ${r.topic}` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-1" title="Niveles con versión">
                      {LEVELS.map(l => (
                        <span
                          key={l.level}
                          className={`w-6 h-6 rounded-full text-[10px] font-mono flex items-center justify-center ${
                            r.levels.includes(l.level) ? 'bg-teal-600 text-white' : 'bg-parchment-200 text-ink-400'
                          }`}
                        >
                          {l.level}
                        </span>
                      ))}
                    </div>
                    <span className={`font-body text-xs px-2 py-1 rounded-full ${
                      r.status === 'published' ? 'bg-teal-50 text-teal-700' : 'bg-parchment-200 text-ink-600'
                    }`}>
                      {r.status === 'published' ? 'Publicada' : 'Borrador'}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <p className="font-body text-xs text-ink-400">
          Crear y editar lecturas llega en la siguiente fase. Por ahora puedes revisarlas, publicarlas y asignarlas.
        </p>
      </div>
    </div>
  )
}
