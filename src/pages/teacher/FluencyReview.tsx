import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import TeacherHeader from '@/components/TeacherHeader'
import { levelName, type Language } from '@/lib/lec'
import { EXPRESSION_LEVELS, accuracyBand, fluencyMetrics, tokenizeWords } from '@/lib/fluency'

type Mark = 'errors' | 'last'

interface Loaded {
  studentName: string
  title: string
  language: Language
  level: number
  body: string
  driveFileId: string
  audioSeconds: number | null
  comprehension: number | null
}

function one<T>(v: T | T[] | null | undefined): T | null {
  if (Array.isArray(v)) return v[0] ?? null
  return v ?? null
}

export default function FluencyReview() {
  const { attemptId } = useParams<{ attemptId: string }>()
  const { profile } = useAuth()
  const navigate = useNavigate()

  const [data, setData] = useState<Loaded | null>(null)
  const [loadError, setLoadError] = useState('')
  const [mark, setMark] = useState<Mark>('errors')
  const [errors, setErrors] = useState<Set<number>>(new Set())
  const [lastWord, setLastWord] = useState<number | null>(null)
  const [seconds, setSeconds] = useState<number>(60)
  const [expression, setExpression] = useState<number | null>(null)
  const [comment, setComment] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [savedOk, setSavedOk] = useState(false)

  useEffect(() => {
    if (!attemptId) return
    let cancelled = false
    async function load() {
      const { data: a, error } = await supabase
        .from('lec_attempts')
        .select(`
          id, drive_file_id, audio_seconds, comprehension_pct,
          profiles(full_name, email),
          lec_versions(level, body, lec_readings(title, language)),
          lec_fluency_reviews(words_read, error_positions, wcpm, accuracy_pct, expression, comment)
        `)
        .eq('id', attemptId)
        .maybeSingle()
      if (cancelled) return
      if (error || !a || !a.drive_file_id) {
        console.error(error)
        setLoadError('No encontramos esta grabación.')
        return
      }
      type Raw = {
        drive_file_id: string; audio_seconds: number | null; comprehension_pct: number | null
        profiles: { full_name: string | null; email: string } | { full_name: string | null; email: string }[] | null
        lec_versions: { level: number; body: string; lec_readings: { title: string; language: Language } | { title: string; language: Language }[] | null } | null
        lec_fluency_reviews:
          | { words_read: number; error_positions: number[]; expression: number | null; comment: string | null }
          | { words_read: number; error_positions: number[]; expression: number | null; comment: string | null }[]
          | null
      }
      const r = a as unknown as Raw
      const p = one(r.profiles)
      const v = one(r.lec_versions)
      const rd = one(v?.lec_readings ?? null)
      setData({
        studentName: p?.full_name ?? p?.email ?? 'Estudiante',
        title: rd?.title ?? 'Lectura',
        language: rd?.language ?? 'es',
        level: v?.level ?? 2,
        body: v?.body ?? '',
        driveFileId: r.drive_file_id,
        audioSeconds: r.audio_seconds,
        comprehension: r.comprehension_pct,
      })
      setSeconds(Math.round(r.audio_seconds ?? 60))
      const prev = one(r.lec_fluency_reviews)
      if (prev) {
        setErrors(new Set(Array.isArray(prev.error_positions) ? prev.error_positions : []))
        setLastWord(prev.words_read - 1)
        setExpression(prev.expression)
        setComment(prev.comment ?? '')
      }
    }
    load()
    return () => { cancelled = true }
  }, [attemptId])

  const words = useMemo(() => tokenizeWords(data?.body ?? ''), [data?.body])
  // Mantener los párrafos al mostrar: índice de palabra → ¿empieza párrafo nuevo?
  const paragraphStarts = useMemo(() => {
    const starts = new Set<number>()
    if (!data) return starts
    let idx = 0
    for (const para of data.body.split(/\n\s*\n/)) {
      const n = tokenizeWords(para).length
      if (n) { starts.add(idx); idx += n }
    }
    return starts
  }, [data])

  const wordsRead = lastWord !== null ? lastWord + 1 : 0
  const errorsCounted = [...errors].filter(i => lastWord === null || i <= lastWord).length
  const m = fluencyMetrics(wordsRead, errorsCounted, seconds)
  const band = wordsRead ? accuracyBand(m.accuracy) : null

  function onWord(i: number) {
    setSavedOk(false)
    if (mark === 'last') {
      setLastWord(i)
      setMark('errors')
      return
    }
    setErrors(prev => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i)
      else next.add(i)
      return next
    })
  }

  async function save() {
    if (!attemptId || lastWord === null) return
    setSaving(true)
    setSaveError('')
    const { error } = await supabase.from('lec_fluency_reviews').upsert({
      attempt_id: attemptId,
      reviewer_id: profile?.id ?? null,
      words_read: wordsRead,
      error_positions: [...errors].filter(i => i <= lastWord).sort((a, b) => a - b),
      wcpm: m.wcpm,
      accuracy_pct: m.accuracy,
      expression,
      comment: comment.trim() || null,
      reviewed_at: new Date().toISOString(),
    })
    if (!error && data && Math.round(data.audioSeconds ?? 0) !== seconds) {
      await supabase.from('lec_attempts').update({ audio_seconds: seconds }).eq('id', attemptId)
    }
    setSaving(false)
    if (error) {
      console.error(error)
      setSaveError('No se pudo guardar la revisión. Inténtalo de nuevo.')
      return
    }
    setSavedOk(true)
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-sepia-100">
        <TeacherHeader title="Revisar fluidez" />
        <p className="max-w-5xl mx-auto p-6 font-body text-sm text-crimson-500">{loadError}</p>
      </div>
    )
  }
  if (!data) {
    return <div className="min-h-screen bg-sepia-100 flex items-center justify-center"><div className="spinner" /></div>
  }

  return (
    <div className="min-h-screen bg-sepia-100">
      <TeacherHeader title="Revisar fluidez" />
      <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-4">
        <button onClick={() => navigate('/teacher/fluency')} className="font-body text-xs text-ink-500 hover:text-ink-700">← Grabaciones</button>

        <div className="bg-parchment-50 border border-parchment-200 rounded-xl p-5">
          <h2 className="font-display text-xl font-bold text-ink-900">{data.studentName}</h2>
          <p className="font-body text-sm text-ink-600">
            {data.title} · {data.language === 'es' ? 'Español' : 'Inglés'} · Nivel {data.level} · {levelName(data.level)}
            {data.comprehension !== null ? ` · Comprensión ${Math.round(data.comprehension)}%` : ''}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Texto para marcar */}
          <div className="lg:col-span-2 space-y-3">
            <div className="bg-parchment-50 border border-parchment-200 rounded-xl p-4 space-y-2">
              <iframe
                title="Grabación del estudiante"
                src={`https://drive.google.com/file/d/${data.driveFileId}/preview`}
                className="w-full h-20 rounded-lg border border-parchment-200 bg-white"
                allow="autoplay"
              />
              <p className="font-body text-xs text-ink-500">
                Si no se reproduce, revisa que estés en tu cuenta de Google del colegio y que pertenezcas al grupo de docentes,
                o <a href={`https://drive.google.com/file/d/${data.driveFileId}/view`} target="_blank" rel="noreferrer" className="underline">ábrela en Drive</a>.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setMark('errors')}
                aria-pressed={mark === 'errors'}
                className={`font-body text-sm px-3 py-2 rounded-lg border ${mark === 'errors' ? 'bg-crimson-500 text-white border-crimson-500' : 'border-parchment-300 text-ink-700 bg-white'}`}
              >
                Marcar errores
              </button>
              <button
                onClick={() => setMark('last')}
                aria-pressed={mark === 'last'}
                className={`font-body text-sm px-3 py-2 rounded-lg border ${mark === 'last' ? 'bg-ink-800 text-white border-ink-800' : 'border-parchment-300 text-ink-700 bg-white'}`}
              >
                Marcar última palabra leída
              </button>
              <p className="font-body text-xs text-ink-500">
                {mark === 'errors'
                  ? 'Toca cada palabra mal leída, omitida o sustituida. Toca otra vez para quitarla.'
                  : 'Toca la última palabra que alcanzó a leer en el minuto.'}
              </p>
            </div>

            <div lang={data.language} className="bg-white border border-parchment-200 rounded-xl p-5 font-body text-lg leading-loose text-ink-800">
              {words.map((w, i) => {
                const isError = errors.has(i)
                const after = lastWord !== null && i > lastWord
                const isLast = i === lastWord
                return (
                  <span key={i}>
                    {paragraphStarts.has(i) && i > 0 && <><br /><br /></>}
                    <button
                      type="button"
                      onClick={() => onWord(i)}
                      aria-pressed={isError}
                      aria-label={`${w}${isError ? ', marcada como error' : ''}${isLast ? ', última palabra leída' : ''}`}
                      className={`rounded px-0.5 ${
                        isError ? 'bg-red-100 text-crimson-600 line-through decoration-2' : ''
                      } ${after ? 'text-ink-400' : ''} ${isLast ? 'ring-2 ring-ink-800' : ''} hover:bg-gold-300/40`}
                    >
                      {w}
                    </button>{' '}
                  </span>
                )
              })}
            </div>
          </div>

          {/* Resultados */}
          <aside className="space-y-3">
            <div className="bg-parchment-50 border border-parchment-200 rounded-xl p-5 space-y-3" aria-live="polite">
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="bg-white border border-parchment-200 rounded-lg p-2">
                  <p className="font-mono text-2xl font-bold text-ink-800">{wordsRead ? m.wcpm : '—'}</p>
                  <p className="font-body text-xs text-ink-500">palabras correctas/min</p>
                </div>
                <div className="bg-white border border-parchment-200 rounded-lg p-2">
                  <p className="font-mono text-2xl font-bold text-ink-800">{wordsRead ? `${m.accuracy}%` : '—'}</p>
                  <p className="font-body text-xs text-ink-500">precisión</p>
                </div>
              </div>
              <p className="font-body text-xs text-ink-600">
                Leídas: <strong>{wordsRead || '—'}</strong> · Errores: <strong>{errorsCounted}</strong>
              </p>
              <label className="flex items-center gap-2 font-body text-xs text-ink-600">
                Segundos grabados
                <input
                  type="number"
                  min={5}
                  max={60}
                  value={seconds}
                  onChange={e => setSeconds(Math.max(1, Number(e.target.value) || 1))}
                  className="w-16 border border-parchment-300 rounded px-2 py-1 bg-white text-ink-800"
                />
              </label>
              {band && (
                <p className={`font-body text-xs rounded-lg px-3 py-2 ${
                  band.tone === 'green' ? 'bg-teal-50 text-teal-800' : band.tone === 'yellow' ? 'bg-amber-50 text-amber-800' : 'bg-red-50 text-crimson-600'
                }`}>
                  {band.label}
                </p>
              )}
              {lastWord === null && (
                <p className="font-body text-xs text-ink-500">Falta marcar la última palabra leída para calcular.</p>
              )}
            </div>

            <fieldset className="bg-parchment-50 border border-parchment-200 rounded-xl p-5 space-y-2">
              <legend className="font-body text-sm font-semibold text-ink-800 px-1">Expresión (opcional)</legend>
              {EXPRESSION_LEVELS.map(l => (
                <label key={l.value} className="flex items-start gap-2 font-body text-xs text-ink-700">
                  <input
                    type="radio"
                    name="expression"
                    checked={expression === l.value}
                    onChange={() => { setExpression(l.value); setSavedOk(false) }}
                    className="mt-0.5"
                  />
                  <span><strong>{l.value}. {l.label}.</strong> {l.hint}</span>
                </label>
              ))}
            </fieldset>

            <div className="bg-parchment-50 border border-parchment-200 rounded-xl p-5">
              <label htmlFor="comentario" className="font-body text-sm font-semibold text-ink-800">Comentario para el estudiante (opcional)</label>
              <textarea
                id="comentario"
                value={comment}
                onChange={e => { setComment(e.target.value); setSavedOk(false) }}
                rows={3}
                className="mt-2 w-full border border-parchment-300 rounded-lg px-3 py-2 font-body text-sm text-ink-800 bg-white"
                placeholder="Ej. Muy bien las pausas en los puntos; practica las palabras largas."
              />
            </div>

            {saveError && <p role="alert" className="font-body text-sm text-crimson-500">{saveError}</p>}
            {savedOk && <p role="status" className="font-body text-sm text-teal-800">Revisión guardada ✓</p>}
            <button
              onClick={save}
              disabled={lastWord === null || saving}
              className="w-full bg-teal-600 text-white font-body font-semibold py-3 rounded-xl hover:bg-teal-500 disabled:opacity-40"
            >
              {saving ? 'Guardando...' : 'Guardar revisión'}
            </button>
            <button
              onClick={() => navigate('/teacher/fluency')}
              className="w-full font-body text-sm text-ink-600 hover:text-ink-800"
            >
              Volver a la lista
            </button>
          </aside>
        </div>
      </div>
    </div>
  )
}
