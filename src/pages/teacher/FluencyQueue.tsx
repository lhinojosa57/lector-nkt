import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import TeacherHeader from '@/components/TeacherHeader'
import { levelName, type Language } from '@/lib/lec'

interface Row {
  id: string
  completed_at: string
  audio_seconds: number | null
  studentName: string
  title: string
  language: Language
  level: number
  review: { wcpm: number; accuracy_pct: number } | null
}

function one<T>(v: T | T[] | null | undefined): T | null {
  if (Array.isArray(v)) return v[0] ?? null
  return v ?? null
}

export default function FluencyQueue() {
  const navigate = useNavigate()
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tab, setTab] = useState<'pending' | 'done'>('pending')
  const [language, setLanguage] = useState<'' | Language>('')

  useEffect(() => {
    let cancelled = false
    async function load() {
      const { data, error } = await supabase
        .from('lec_attempts')
        .select(`
          id, completed_at, audio_seconds,
          profiles(full_name, email),
          lec_versions(level, lec_readings(title, language)),
          lec_fluency_reviews(wcpm, accuracy_pct)
        `)
        .eq('mode', 'aloud')
        .not('drive_file_id', 'is', null)
        .not('completed_at', 'is', null)
        .order('completed_at', { ascending: false })
      if (cancelled) return
      if (error) {
        console.error(error)
        setError('No se pudieron cargar las grabaciones.')
        setLoading(false)
        return
      }
      type Raw = {
        id: string; completed_at: string; audio_seconds: number | null
        profiles: { full_name: string | null; email: string } | { full_name: string | null; email: string }[] | null
        lec_versions: { level: number; lec_readings: { title: string; language: Language } | { title: string; language: Language }[] | null } | null
        lec_fluency_reviews: { wcpm: number; accuracy_pct: number } | { wcpm: number; accuracy_pct: number }[] | null
      }
      setRows(((data ?? []) as unknown as Raw[]).map(r => {
        const p = one(r.profiles)
        const v = one(r.lec_versions)
        const rd = one(v?.lec_readings ?? null)
        return {
          id: r.id,
          completed_at: r.completed_at,
          audio_seconds: r.audio_seconds,
          studentName: p?.full_name ?? p?.email ?? 'Estudiante',
          title: rd?.title ?? 'Lectura',
          language: rd?.language ?? 'es',
          level: v?.level ?? 2,
          review: one(r.lec_fluency_reviews),
        }
      }))
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [])

  const visible = rows.filter(r =>
    (tab === 'pending' ? !r.review : !!r.review) && (!language || r.language === language)
  )
  const pendingCount = rows.filter(r => !r.review).length

  const chip = (active: boolean) =>
    `font-body text-sm px-4 py-2 rounded-lg ${active ? 'bg-teal-600 text-white' : 'bg-parchment-50 text-ink-600 border border-parchment-300'}`

  return (
    <div className="min-h-screen bg-sepia-100">
      <TeacherHeader title="Fluidez" />
      <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => setTab('pending')} aria-pressed={tab === 'pending'} className={chip(tab === 'pending')}>
            Por revisar ({pendingCount})
          </button>
          <button onClick={() => setTab('done')} aria-pressed={tab === 'done'} className={chip(tab === 'done')}>
            Revisadas
          </button>
          <select
            value={language}
            onChange={e => setLanguage(e.target.value as '' | Language)}
            aria-label="Idioma"
            className="sm:ml-auto font-body text-sm bg-parchment-50 border border-parchment-300 rounded-lg px-3 py-2 text-ink-700"
          >
            <option value="">Español e inglés</option>
            <option value="es">Español</option>
            <option value="en">Inglés</option>
          </select>
        </div>

        {error && <p role="alert" className="font-body text-sm text-crimson-500">{error}</p>}

        <div className="bg-parchment-50 border border-parchment-200 rounded-xl overflow-hidden">
          {loading ? (
            <div className="p-10 flex justify-center"><div className="spinner" /></div>
          ) : visible.length === 0 ? (
            <p className="p-6 font-body text-sm text-ink-500">
              {tab === 'pending' ? 'No hay grabaciones por revisar. 🎉' : 'Todavía no hay grabaciones revisadas.'}
            </p>
          ) : (
            <ul className="divide-y divide-parchment-200">
              {visible.map(r => (
                <li key={r.id}>
                  <button
                    onClick={() => navigate(`/teacher/fluency/${r.id}`)}
                    className="w-full text-left px-5 py-4 flex flex-wrap items-center gap-4 hover:bg-parchment-100"
                  >
                    <div className="flex-1 min-w-[220px]">
                      <p className="font-display font-semibold text-ink-900">{r.studentName}</p>
                      <p className="font-body text-xs text-ink-500 mt-0.5">
                        {r.title} · {r.language === 'es' ? 'Español' : 'Inglés'} · Nivel {r.level} · {levelName(r.level)}
                      </p>
                      <p className="font-body text-xs text-ink-500">
                        {new Date(r.completed_at).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })}
                        {r.audio_seconds ? ` · ${Math.round(r.audio_seconds)} s de audio` : ''}
                      </p>
                    </div>
                    {r.review ? (
                      <div className="text-right">
                        <p className="font-mono text-lg font-bold text-ink-800">{Math.round(r.review.wcpm)}</p>
                        <p className="font-body text-xs text-ink-500">palabras correctas/min · {r.review.accuracy_pct}%</p>
                      </div>
                    ) : (
                      <span className="font-body text-sm px-4 py-2 rounded-lg bg-teal-600 text-white">Revisar →</span>
                    )}
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
