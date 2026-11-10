import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { DEFAULT_LEVEL, SUBJECTS, type Language, type LecReading } from '@/lib/lec'
import ReadingCover from '@/components/ReadingCover'

interface Row extends LecReading {
  levels: number[]
}

export default function StudentLibrary() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [rows, setRows] = useState<Row[]>([])
  const [levels, setLevels] = useState<Record<Language, number>>({ es: DEFAULT_LEVEL, en: DEFAULT_LEVEL })
  const [loading, setLoading] = useState(true)
  const [language, setLanguage] = useState<Language>('es')
  const [subject, setSubject] = useState('')

  useEffect(() => {
    if (!profile?.id) return
    const studentId = profile.id
    let cancelled = false
    async function load() {
      const [readingsRes, levelsRes] = await Promise.all([
        supabase.from('lec_readings').select('*, lec_versions(level)').eq('status', 'published').order('title'),
        supabase.from('lec_student_levels').select('language, level').eq('student_id', studentId),
      ])
      if (cancelled) return
      type Raw = LecReading & { lec_versions: { level: number }[] }
      setRows(((readingsRes.data ?? []) as Raw[]).map(r => ({ ...r, levels: r.lec_versions.map(v => v.level) })))
      const lv = { es: DEFAULT_LEVEL, en: DEFAULT_LEVEL }
      for (const l of (levelsRes.data ?? []) as { language: Language; level: number }[]) lv[l.language] = l.level
      setLevels(lv)
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [profile?.id])

  // Lecturas con versión en su nivel o un nivel abajo
  const filtered = useMemo(() => {
    const lvl = levels[language]
    return rows.filter(r =>
      r.language === language &&
      (!subject || r.subject === subject) &&
      r.levels.some(l => l === lvl || l === lvl - 1)
    )
  }, [rows, levels, language, subject])

  return (
    <div className="min-h-screen bg-sepia-100">
      <div className="bg-parchment-50 border-b border-parchment-200 px-4 sm:px-6 py-4">
        <div className="max-w-3xl mx-auto">
          <button onClick={() => navigate('/student')} className="font-body text-xs text-ink-400 hover:text-ink-600">← Mi biblioteca</button>
          <h1 className="font-display text-xl font-bold text-ink-900 mt-1">Entrenamiento libre</h1>
          <p className="font-body text-xs text-ink-500">Lecturas de tu nivel. Elige la que te llame la atención.</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-4">
        <div className="flex flex-wrap gap-2">
          {(['es', 'en'] as Language[]).map(l => (
            <button
              key={l}
              onClick={() => setLanguage(l)}
              className={`font-body text-sm px-4 py-2 rounded-lg ${
                language === l ? 'bg-teal-600 text-white' : 'bg-parchment-50 text-ink-600 border border-parchment-300'
              }`}
            >
              {l === 'es' ? 'Español' : 'Inglés'}
            </button>
          ))}
          <select
            value={subject}
            onChange={e => setSubject(e.target.value)}
            className="font-body text-sm bg-parchment-50 border border-parchment-300 rounded-lg px-3 py-2 text-ink-700"
          >
            <option value="">Todas las materias</option>
            {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div className="bg-parchment-50 border border-parchment-200 rounded-xl overflow-hidden">
          {loading ? (
            <div className="p-10 flex justify-center"><div className="spinner" /></div>
          ) : filtered.length === 0 ? (
            <p className="p-6 font-body text-sm text-ink-500">Todavía no hay lecturas de tu nivel con ese filtro. Pronto habrá más.</p>
          ) : (
            <ul className="divide-y divide-parchment-200">
              {filtered.map(r => (
                <li key={r.id}>
                  <button
                    onClick={() => navigate(`/student/practice/${r.id}`)}
                    className="w-full text-left px-5 py-4 hover:bg-parchment-100 transition-colors flex items-center gap-3"
                  >
                    <ReadingCover size="sm" title={r.title} subject={r.subject} coverPath={r.cover_path} />
                    <span>
                      <span className="block font-display font-semibold text-ink-900">{r.title}</span>
                      <span className="block font-body text-xs text-ink-500 mt-0.5">{r.subject}{r.topic ? ` · ${r.topic}` : ''}</span>
                    </span>
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
