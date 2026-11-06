import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import TeacherHeader from '@/components/TeacherHeader'
import AssignModal from '@/components/AssignModal'
import {
  LANGUAGES, SKILL_LABELS, asArray, levelName,
  type LecQuestion, type LecReading, type LecVersion, type QuestionOption, type VocabularyItem,
} from '@/lib/lec'

export default function ReadingDetail() {
  const { readingId } = useParams<{ readingId: string }>()
  const navigate = useNavigate()
  const [reading, setReading] = useState<LecReading | null>(null)
  const [versions, setVersions] = useState<LecVersion[]>([])
  const [questions, setQuestions] = useState<LecQuestion[]>([])
  const [activeLevel, setActiveLevel] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [showAssign, setShowAssign] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!readingId) return
    const [{ data: r }, { data: v }] = await Promise.all([
      supabase.from('lec_readings').select('*').eq('id', readingId).single(),
      supabase.from('lec_versions').select('*').eq('reading_id', readingId).order('level'),
    ])
    const vers = ((v ?? []) as LecVersion[]).map(x => ({ ...x, vocabulary: asArray<VocabularyItem>(x.vocabulary) }))
    let qs: LecQuestion[] = []
    if (vers.length) {
      const { data: q } = await supabase
        .from('lec_questions')
        .select('*')
        .in('version_id', vers.map(x => x.id))
        .order('position')
      qs = ((q ?? []) as LecQuestion[]).map(x => ({ ...x, options: asArray<QuestionOption>(x.options) }))
    }
    setReading((r as LecReading) ?? null)
    setVersions(vers)
    setQuestions(qs)
    setActiveLevel(prev => prev ?? vers[0]?.level ?? null)
    setLoading(false)
  }, [readingId])

  useEffect(() => { void load() }, [load])

  async function toggleStatus() {
    if (!reading) return
    const next = reading.status === 'published' ? 'draft' : 'published'
    const { error } = await supabase
      .from('lec_readings')
      .update({ status: next, updated_at: new Date().toISOString() })
      .eq('id', reading.id)
    if (error) {
      setNotice('No se pudo cambiar el estado.')
      return
    }
    setReading({ ...reading, status: next })
    setNotice(next === 'published' ? 'Lectura publicada: los estudiantes ya pueden verla.' : 'La lectura volvió a borrador.')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-sepia-100 flex items-center justify-center"><div className="spinner" /></div>
    )
  }

  if (!reading) {
    return (
      <div className="min-h-screen bg-sepia-100">
        <TeacherHeader title="Biblioteca de lecturas" />
        <p className="max-w-5xl mx-auto p-6 font-body text-ink-600">No encontramos esta lectura.</p>
      </div>
    )
  }

  const version = versions.find(v => v.level === activeLevel) ?? null
  const versionQuestions = questions.filter(q => q.version_id === version?.id)

  return (
    <div className="min-h-screen bg-sepia-100">
      <TeacherHeader title="Biblioteca de lecturas" />

      <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-4">
        <button onClick={() => navigate('/teacher/library')} className="font-body text-xs text-ink-400 hover:text-ink-600">
          ← Biblioteca
        </button>

        <div className="bg-parchment-50 border border-parchment-200 rounded-xl p-5 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl font-bold text-ink-900">{reading.title}</h2>
            <p className="font-body text-sm text-ink-500 mt-1">
              Materia: {reading.subject} · Idioma: {LANGUAGES.find(l => l.value === reading.language)?.label.toLowerCase()}
              {reading.topic ? ` · ${reading.topic}` : ''}
              {reading.text_type ? ` · ${reading.text_type}` : ''}
            </p>
            <span className={`inline-block mt-2 font-body text-xs px-2 py-1 rounded-full ${
              reading.status === 'published' ? 'bg-teal-50 text-teal-700' : 'bg-parchment-200 text-ink-600'
            }`}>
              {reading.status === 'published' ? 'Publicada' : 'Borrador'}
            </span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={toggleStatus}
              className="font-body text-sm px-4 py-2 rounded-lg border border-parchment-300 text-ink-700 hover:bg-parchment-100"
            >
              {reading.status === 'published' ? 'Pasar a borrador' : 'Publicar'}
            </button>
            <button
              onClick={() => setShowAssign(true)}
              disabled={reading.status !== 'published'}
              title={reading.status !== 'published' ? 'Publica la lectura para poder asignarla' : undefined}
              className="font-body text-sm px-4 py-2 rounded-lg bg-teal-600 text-white hover:bg-teal-500 disabled:opacity-50"
            >
              Asignar
            </button>
          </div>
        </div>

        {notice && (
          <p className="font-body text-sm bg-teal-50 text-teal-800 border border-teal-200 rounded-lg px-4 py-2">{notice}</p>
        )}

        {versions.length === 0 ? (
          <p className="font-body text-sm text-ink-500">Esta lectura todavía no tiene versiones.</p>
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              {versions.map(v => (
                <button
                  key={v.id}
                  onClick={() => setActiveLevel(v.level)}
                  className={`font-body text-sm px-3 py-1.5 rounded-lg border ${
                    v.level === activeLevel ? 'bg-ink-800 text-parchment-50 border-ink-800' : 'border-parchment-300 text-ink-600 hover:bg-parchment-100'
                  }`}
                >
                  Nivel {v.level} · {levelName(v.level)}
                </button>
              ))}
            </div>

            {version && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <article className="lg:col-span-2 bg-parchment-50 border border-parchment-200 rounded-xl p-5">
                  <p className="font-mono text-xs text-ink-400 mb-3">{version.word_count} palabras</p>
                  <div className="font-body text-ink-800 leading-relaxed whitespace-pre-line">{version.body}</div>
                  {version.curiosity_fact && (
                    <p className="mt-4 font-body text-sm text-ink-600 bg-parchment-100 rounded-lg p-3">
                      <span className="font-semibold">Dato curioso:</span> {version.curiosity_fact}
                    </p>
                  )}
                </article>

                <aside className="space-y-4">
                  <div className="bg-parchment-50 border border-parchment-200 rounded-xl p-4">
                    <p className="font-display font-semibold text-ink-800 mb-2">Vocabulario</p>
                    {version.vocabulary.length === 0 ? (
                      <p className="font-body text-xs text-ink-500">Sin vocabulario.</p>
                    ) : (
                      <ul className="space-y-2">
                        {version.vocabulary.map((v, i) => (
                          <li key={i} className="font-body text-sm">
                            {v.icon && <span aria-hidden>{v.icon} </span>}<span className="font-semibold text-ink-800">{v.word}:</span>{' '}
                            <span className="text-ink-600">{v.definition}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </aside>
              </div>
            )}

            <div className="bg-parchment-50 border border-parchment-200 rounded-xl p-5">
              <p className="font-display font-semibold text-ink-800 mb-3">Preguntas ({versionQuestions.length})</p>
              <ol className="space-y-4">
                {versionQuestions.map((q, i) => (
                  <li key={q.id}>
                    <p className="font-body text-sm text-ink-900">
                      <span className="font-mono text-xs text-ink-400 mr-2">{i + 1}.</span>
                      {q.text}
                      <span className="ml-2 font-body text-xs px-2 py-0.5 rounded-full bg-parchment-200 text-ink-600">{SKILL_LABELS[q.skill]}</span>
                    </p>
                    <ul className="mt-1 ml-6 space-y-0.5">
                      {q.options.map(o => (
                        <li key={o.id} className={`font-body text-sm ${o.id === q.correct_option ? 'text-teal-700 font-semibold' : 'text-ink-600'}`}>
                          {o.id === q.correct_option ? '✓ ' : '• '}{o.text}
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ol>
            </div>
          </>
        )}
      </div>

      {showAssign && (
        <AssignModal
          readingId={reading.id}
          readingTitle={reading.title}
          availableLevels={versions.map(v => v.level)}
          onClose={() => setShowAssign(false)}
          onAssigned={() => {
            setShowAssign(false)
            setNotice('Lectura asignada. Puedes ver su avance en Asignaciones.')
          }}
        />
      )}
    </div>
  )
}
