import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import AloudRecorder from '@/components/AloudRecorder'
import { audioFileName, preloadDrive, requestDriveAccess, uploadAudio } from '@/lib/drive'
import {
  DEFAULT_LEVEL, SKILL_LABELS, asArray, levelName, modeLabel, pickVersion,
  type Language, type LecReading, type LecVersion, type QuestionOption, type ReadingMode, type Skill, type VocabularyItem,
} from '@/lib/lec'

interface PublicQuestion {
  id: string
  skill: Skill
  text: string
  options: QuestionOption[]
}

type Step = 'loading' | 'error' | 'already' | 'intro' | 'vocab' | 'reading' | 'questions' | 'saving' | 'close'

// Los audios se guardan en el Drive institucional del estudiante (ver src/lib/drive.ts).
const AUDIO_UPLOAD_ENABLED = true

type UploadState = 'idle' | 'uploading' | 'done' | 'error'


export default function ReadingSession() {
  const { assignmentId, readingId: practiceReadingId } = useParams<{ assignmentId?: string; readingId?: string }>()
  const { profile } = useAuth()
  const navigate = useNavigate()

  const [step, setStep] = useState<Step>('loading')
  const [errorMsg, setErrorMsg] = useState('')
  const [reading, setReading] = useState<LecReading | null>(null)
  const [version, setVersion] = useState<LecVersion | null>(null)
  const [questions, setQuestions] = useState<PublicQuestion[]>([])
  const [mode, setMode] = useState<ReadingMode>('silent')
  const [modeNotice, setModeNotice] = useState('')
  const [attemptId, setAttemptId] = useState<string | null>(null)

  const [readingSeconds, setReadingSeconds] = useState<number | null>(null)
  const [audioSeconds, setAudioSeconds] = useState<number | null>(null)
  const [comprehension, setComprehension] = useState<number | null>(null)
  const readingStartRef = useRef(0)
  const [driveError, setDriveError] = useState('')
  const [upload, setUpload] = useState<UploadState>('idle')
  const audioBlobRef = useRef<Blob | null>(null)

  useEffect(() => {
    if (mode === 'aloud' && AUDIO_UPLOAD_ENABLED) preloadDrive()
  }, [mode])

  useEffect(() => {
    if (step === 'reading') readingStartRef.current = Date.now()
  }, [step])

  useEffect(() => {
    if (!profile?.id) return
    const studentId = profile.id
    let cancelled = false

    async function load() {
      let readingIdToLoad = practiceReadingId ?? null
      let assignedMode: ReadingMode | null = null
      let fixedLevel: number | null = null

      if (assignmentId) {
        const { data: a } = await supabase
          .from('lec_assignments')
          .select('reading_id, mode, fixed_level')
          .eq('id', assignmentId)
          .maybeSingle()
        if (!a) {
          if (!cancelled) { setErrorMsg('No encontramos esta lectura asignada.'); setStep('error') }
          return
        }
        const { data: done } = await supabase
          .from('lec_attempts')
          .select('id')
          .eq('student_id', studentId)
          .eq('assignment_id', assignmentId)
          .not('completed_at', 'is', null)
          .limit(1)
        if (done && done.length) {
          if (!cancelled) setStep('already')
          return
        }
        readingIdToLoad = a.reading_id
        assignedMode = a.mode as ReadingMode
        fixedLevel = a.fixed_level
      }

      if (!readingIdToLoad) return

      const [{ data: r }, { data: vs }] = await Promise.all([
        supabase.from('lec_readings').select('*').eq('id', readingIdToLoad).maybeSingle(),
        supabase.from('lec_versions').select('*').eq('reading_id', readingIdToLoad),
      ])
      if (!r || !vs || vs.length === 0) {
        if (!cancelled) { setErrorMsg('Esta lectura no está disponible.'); setStep('error') }
        return
      }
      const lecReading = r as LecReading

      const [{ data: lvl }, { data: consent }] = await Promise.all([
        supabase.from('lec_student_levels').select('level')
          .eq('student_id', studentId).eq('language', lecReading.language as Language).maybeSingle(),
        supabase.from('lec_consents').select('accepts_voice_recording').eq('student_id', studentId).maybeSingle(),
      ])

      const studentLevel = lvl?.level ?? DEFAULT_LEVEL
      const chosen = pickVersion(vs as LecVersion[], fixedLevel ?? studentLevel)!
      const { data: qs } = await supabase
        .from('lec_questions_public')
        .select('id, skill, text, options, position')
        .eq('version_id', chosen.id)
        .order('position')

      let effectiveMode: ReadingMode = assignedMode ?? 'silent'
      let notice = ''
      if (effectiveMode === 'aloud' && !consent?.accepts_voice_recording) {
        effectiveMode = 'silent'
        notice = 'Esta lectura es en voz alta, pero todavía falta el consentimiento de tu familia para grabar. Por ahora la harás en silencio.'
      }

      if (cancelled) return
      setReading(lecReading)
      setVersion({ ...chosen, vocabulary: asArray<VocabularyItem>(chosen.vocabulary) })
      setQuestions(((qs ?? []) as PublicQuestion[]).map(q => ({ ...q, options: asArray<QuestionOption>(q.options) })))
      setMode(effectiveMode)
      setModeNotice(notice)
      setStep('intro')
    }
    load()
    return () => { cancelled = true }
  }, [profile?.id, assignmentId, practiceReadingId])

  async function start() {
    if (!profile?.id || !version) return
    if (mode === 'aloud' && AUDIO_UPLOAD_ENABLED) {
      setDriveError('')
      try {
        await requestDriveAccess(profile.email)
      } catch (err) {
        console.error(err)
        setDriveError(
          'Para guardar tu grabación necesitamos tu permiso en la ventana de Google. ' +
          'Si no se abrió, revisa que tu navegador no esté bloqueando ventanas emergentes.'
        )
        return
      }
    }
    const { data, error } = await supabase
      .from('lec_attempts')
      .insert({
        student_id: profile.id,
        version_id: version.id,
        assignment_id: assignmentId ?? null,
        mode,
      })
      .select('id')
      .single()
    if (error || !data) {
      console.error(error)
      setErrorMsg('No pudimos iniciar la lectura. Revisa tu conexión e inténtalo de nuevo.')
      setStep('error')
      return
    }
    setAttemptId(data.id)
    setStep(version.vocabulary.length ? 'vocab' : 'reading')
  }

  async function sendAudio() {
    const blob = audioBlobRef.current
    if (!blob || !attemptId || !reading || !version) return
    setUpload('uploading')
    try {
      const { id, shared } = await uploadAudio(blob, audioFileName(reading.title, version.level, blob.type))
      if (!shared) console.warn('El audio se guardó pero no se pudo compartir con docentes')
      const { error } = await supabase.from('lec_attempts').update({ drive_file_id: id }).eq('id', attemptId)
      if (error) throw error
      setUpload('done')
    } catch (err) {
      console.error(err)
      setUpload('error')
    }
  }

  function goToQuestions(secondsRead?: number) {
    if (secondsRead !== undefined) setReadingSeconds(secondsRead)
    if (questions.length === 0) void finish(null, secondsRead)
    else setStep('questions')
  }

  async function finish(pct: number | null, secondsOverride?: number) {
    if (!attemptId) return
    setComprehension(pct)
    setStep('saving')
    const { error } = await supabase
      .from('lec_attempts')
      .update({
        completed_at: new Date().toISOString(),
        comprehension_pct: pct,
        reading_seconds: secondsOverride ?? readingSeconds,
        audio_seconds: audioSeconds,
      })
      .eq('id', attemptId)
    if (error) {
      console.error(error)
      setErrorMsg('No pudimos guardar tu lectura. Revisa tu conexión.')
      setStep('error')
      return
    }
    setStep('close')
  }

  // ---------------- Pantallas ----------------

  if (step === 'loading' || step === 'saving') {
    return <Centered><div className="spinner" /></Centered>
  }

  if (step === 'error') {
    return (
      <Centered>
        <Card>
          <p className="font-display text-lg font-bold text-ink-900 mb-2">Algo salió mal</p>
          <p className="font-body text-sm text-ink-600 mb-5">{errorMsg}</p>
          <div className="flex gap-2">
            <button onClick={() => window.location.reload()} className="flex-1 bg-teal-600 text-white font-body py-2.5 rounded-lg">Intentar de nuevo</button>
            <button onClick={() => navigate('/student')} className="flex-1 border border-parchment-300 text-ink-700 font-body py-2.5 rounded-lg">Volver</button>
          </div>
        </Card>
      </Centered>
    )
  }

  if (step === 'already') {
    return (
      <Centered>
        <Card>
          <p className="font-display text-lg font-bold text-ink-900 mb-2">Ya completaste esta lectura ✓</p>
          <p className="font-body text-sm text-ink-600 mb-5">Puedes practicar con otras en el entrenamiento libre.</p>
          <button onClick={() => navigate('/student')} className="w-full bg-teal-600 text-white font-body py-2.5 rounded-lg">Volver a mis lecturas</button>
        </Card>
      </Centered>
    )
  }

  if (!reading || !version) return null

  const header = (
    <div className="bg-parchment-50 border-b border-parchment-200 px-4 sm:px-6 py-3">
      <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="font-display font-semibold text-ink-800 truncate">{reading.title}</p>
          <p className="font-body text-xs text-ink-500">{modeLabel(mode)} · Nivel {version.level} · {levelName(version.level)}</p>
        </div>
        <button onClick={() => navigate('/student')} className="font-body text-xs text-ink-400 hover:text-ink-600 flex-shrink-0">Salir</button>
      </div>
    </div>
  )

  if (step === 'intro') {
    return (
      <div className="min-h-screen bg-sepia-100">
        {header}
        <div className="max-w-xl mx-auto p-4 sm:p-6">
          <Card>
            <p className="font-display text-2xl font-bold text-ink-900">{reading.title}</p>
            <p className="font-body text-sm text-ink-500 mt-1">{reading.subject} · {version.word_count} palabras</p>

            {modeNotice && (
              <p className="mt-4 font-body text-sm bg-gold-300/30 border border-gold-400 rounded-lg p-3 text-ink-800">{modeNotice}</p>
            )}

            {practiceReadingId && (
              <div className="mt-4 flex gap-2">
                {(['silent', 'comprehension'] as ReadingMode[]).map(m => (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    className={`flex-1 font-body text-sm py-2 rounded-lg border ${
                      mode === m ? 'bg-teal-600 text-white border-teal-600' : 'border-parchment-300 text-ink-600'
                    }`}
                  >
                    {modeLabel(m)}
                  </button>
                ))}
              </div>
            )}

            <div className="mt-5 font-body text-sm text-ink-700 space-y-2">
              {version.vocabulary.length > 0 && <p>1. Conoce las palabras clave de la lectura.</p>}
              {mode === 'aloud' && <p>{version.vocabulary.length ? '2' : '1'}. Lee en voz alta durante 1 minuto mientras te grabas. Lee con calma, como si se lo leyeras a alguien.</p>}
              {mode === 'silent' && <p>{version.vocabulary.length ? '2' : '1'}. Lee el texto completo en silencio. Un cronómetro medirá cuánto tardas.</p>}
              {mode === 'comprehension' && <p>{version.vocabulary.length ? '2' : '1'}. Lee el texto completo a tu ritmo.</p>}
              <p>{version.vocabulary.length ? '3' : '2'}. Contesta {questions.length} preguntas sobre lo que leíste.</p>
            </div>

            {driveError && (
              <div className="mt-4 bg-gold-300/30 border border-gold-400 rounded-lg p-3 space-y-2">
                <p className="font-body text-sm text-ink-800">{driveError}</p>
                <button onClick={() => { setMode('silent'); setDriveError('') }} className="font-body text-xs underline text-ink-600">
                  Mejor hacerla en silencio
                </button>
              </div>
            )}

            <button onClick={start} className="mt-6 w-full bg-teal-600 text-white font-body font-semibold py-3 rounded-xl hover:bg-teal-500">
              Empezar
            </button>
          </Card>
        </div>
      </div>
    )
  }

  if (step === 'vocab') {
    return (
      <div className="min-h-screen bg-sepia-100">
        {header}
        <div className="max-w-xl mx-auto p-4 sm:p-6">
          <Card>
            <p className="font-display text-lg font-bold text-ink-900 mb-1">Palabras clave</p>
            <p className="font-body text-sm text-ink-500 mb-4">Las vas a encontrar en el texto.</p>
            <ul className="space-y-3">
              {version.vocabulary.map((v, i) => (
                <li key={i} className="bg-white border border-parchment-200 rounded-lg p-3">
                  <p className="font-display font-semibold text-ink-900">{v.word}</p>
                  <p className="font-body text-sm text-ink-600">{v.definition}</p>
                  {v.example && <p className="font-body text-xs text-ink-400 italic mt-1">{v.example}</p>}
                </li>
              ))}
            </ul>
            <button onClick={() => setStep('reading')} className="mt-5 w-full bg-teal-600 text-white font-body font-semibold py-3 rounded-xl hover:bg-teal-500">
              Ir a la lectura →
            </button>
          </Card>
        </div>
      </div>
    )
  }

  if (step === 'reading') {
    return (
      <div className="min-h-screen bg-sepia-100">
        {header}
        <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-4">
          {mode === 'aloud' && (
            <AloudRecorder
              onDone={(seconds, blob) => {
                setAudioSeconds(seconds)
                audioBlobRef.current = blob
                if (AUDIO_UPLOAD_ENABLED) void sendAudio()
              }}
              uploadEnabled={AUDIO_UPLOAD_ENABLED}
            />
          )}
          {mode === 'silent' && <SilentTimer startRef={readingStartRef} />}

          <article className="bg-parchment-50 border border-parchment-200 rounded-xl p-5 sm:p-8" {...noCopy}>
            <h2 className="font-display text-2xl font-bold text-ink-900 mb-4">{reading.title}</h2>
            <div className="font-body text-lg text-ink-800 leading-relaxed whitespace-pre-line">{version.body}</div>
          </article>

          <button
            onClick={() => goToQuestions(
              mode === 'silent' ? Math.max(1, Math.round((Date.now() - readingStartRef.current) / 1000)) : undefined
            )}
            disabled={mode === 'aloud' && (audioSeconds === null || (AUDIO_UPLOAD_ENABLED && upload !== 'done'))}
            className="w-full bg-teal-600 text-white font-body font-semibold py-3 rounded-xl hover:bg-teal-500 disabled:opacity-40"
          >
            {mode === 'aloud' && audioSeconds === null
              ? 'Primero graba tu lectura'
              : mode === 'aloud' && upload === 'uploading'
                ? 'Enviando tu grabación...'
                : 'Terminé de leer →'}
          </button>
          {mode === 'aloud' && upload === 'error' && (
            <div className="bg-red-50 border border-crimson-400 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
              <p className="font-body text-sm text-crimson-600">No pudimos guardar tu grabación en tu Drive. Revisa tu conexión.</p>
              <button onClick={() => void sendAudio()} className="font-body text-sm bg-crimson-500 text-white px-4 py-2 rounded-lg">
                Reintentar
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  if (step === 'questions') {
    return (
      <div className="min-h-screen bg-sepia-100">
        {header}
        <QuestionsStep
          attemptId={attemptId!}
          questions={questions}
          onFinish={finish}
        />
      </div>
    )
  }

  // step === 'close'
  return (
    <div className="min-h-screen bg-sepia-100">
      {header}
      <div className="max-w-xl mx-auto p-4 sm:p-6">
        <CloseStep
          attemptId={attemptId!}
          comprehension={comprehension}
          readingSeconds={readingSeconds}
          wordCount={version.word_count}
          curiosity={version.curiosity_fact}
          aloud={mode === 'aloud'}
          onBack={() => navigate('/student')}
        />
      </div>
    </div>
  )
}

// ---------------- Componentes internos ----------------

/** Evita seleccionar, copiar, arrastrar o abrir el menú del botón derecho sobre el texto. */
const blockEvent = (e: React.SyntheticEvent) => e.preventDefault()
const noCopy = {
  style: { userSelect: 'none', WebkitUserSelect: 'none' } as React.CSSProperties,
  onCopy: blockEvent,
  onCut: blockEvent,
  onContextMenu: blockEvent,
  onDragStart: blockEvent,
}

/** Más rápido que esto no es lectura real en secundaria; no mostramos el número. */
const MAX_PLAUSIBLE_WPM = 400

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-sepia-100 flex items-center justify-center p-4">{children}</div>
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="bg-parchment-50 border border-parchment-200 rounded-xl p-6 w-full max-w-xl">{children}</div>
}

function SilentTimer({ startRef }: { startRef: React.RefObject<number> }) {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - startRef.current) / 1000)), 1000)
    return () => clearInterval(id)
  }, [startRef])

  const mm = String(Math.floor(elapsed / 60)).padStart(2, '0')
  const ss = String(elapsed % 60).padStart(2, '0')

  return (
    <div className="sticky top-0 z-10 bg-ink-800 text-parchment-50 rounded-xl px-5 py-3 flex items-center justify-between">
      <span className="font-mono text-xl">{mm}:{ss}</span>
      <span className="font-body text-xs text-parchment-300">Al terminar, presiona el botón de abajo</span>
    </div>
  )
}

function QuestionsStep({ attemptId, questions, onFinish }: {
  attemptId: string
  questions: PublicQuestion[]
  onFinish: (pct: number | null) => void
}) {
  const [index, setIndex] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)
  const [result, setResult] = useState<{ is_correct: boolean; correct_option: string; explanation: string | null } | null>(null)
  const [correctCount, setCorrectCount] = useState(0)
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState('')

  const q = questions[index]

  async function check() {
    if (!selected) return
    setChecking(true)
    setError('')
    const { data, error } = await supabase.rpc('lec_answer', {
      p_attempt_id: attemptId,
      p_question_id: q.id,
      p_selected: selected,
    })
    setChecking(false)
    if (error || !data || !data[0]) {
      console.error(error)
      setError('No pudimos revisar tu respuesta. Inténtalo de nuevo.')
      return
    }
    const r = data[0] as { is_correct: boolean; correct_option: string; explanation: string | null }
    setResult(r)
    if (r.is_correct) setCorrectCount(c => c + 1)
  }

  function next() {
    if (index + 1 < questions.length) {
      setIndex(i => i + 1)
      setSelected(null)
      setResult(null)
    } else {
      onFinish(Math.round((correctCount / questions.length) * 100))
    }
  }

  return (
    <div className="max-w-xl mx-auto p-4 sm:p-6 space-y-3">
      <div className="flex items-center justify-between">
        <p className="font-mono text-xs text-ink-500">Pregunta {index + 1} de {questions.length}</p>
        <span className="font-body text-xs px-2 py-1 rounded-full bg-parchment-200 text-ink-600">{SKILL_LABELS[q.skill]}</span>
      </div>

      <div className="bg-parchment-50 border border-parchment-200 rounded-xl p-5" {...noCopy}>
        <p className="font-display text-lg font-bold text-ink-900 mb-4 leading-snug">{q.text}</p>
        <div className="space-y-2">
          {q.options.map(opt => {
            let style = 'border-parchment-300 bg-white text-ink-800 hover:border-teal-400'
            if (result) {
              if (opt.id === result.correct_option) style = 'border-teal-500 bg-teal-50 text-teal-800'
              else if (opt.id === selected) style = 'border-crimson-400 bg-red-50 text-crimson-600'
              else style = 'border-parchment-200 bg-white text-ink-400'
            } else if (opt.id === selected) {
              style = 'border-teal-500 bg-teal-50 text-ink-900'
            }
            return (
              <button
                key={opt.id}
                disabled={!!result}
                onClick={() => setSelected(opt.id)}
                className={`w-full text-left font-body text-sm border rounded-lg px-4 py-3 transition-colors ${style}`}
              >
                {opt.text}
              </button>
            )
          })}
        </div>

        {result && (
          <div className={`mt-4 rounded-lg p-3 font-body text-sm ${result.is_correct ? 'bg-teal-50 text-teal-800' : 'bg-parchment-100 text-ink-700'}`}>
            <p className="font-semibold">{result.is_correct ? '¡Correcto!' : 'No exactamente.'}</p>
            {result.explanation && <p className="mt-1">{result.explanation}</p>}
          </div>
        )}
        {error && <p className="mt-3 font-body text-sm text-crimson-500">{error}</p>}
      </div>

      {result ? (
        <button onClick={next} className="w-full bg-teal-600 text-white font-body font-semibold py-3 rounded-xl hover:bg-teal-500">
          {index + 1 < questions.length ? 'Siguiente →' : 'Terminar'}
        </button>
      ) : (
        <button
          onClick={check}
          disabled={!selected || checking}
          className="w-full bg-teal-600 text-white font-body font-semibold py-3 rounded-xl hover:bg-teal-500 disabled:opacity-40"
        >
          {checking ? 'Revisando...' : 'Comprobar'}
        </button>
      )}

    </div>
  )
}

function CloseStep({ attemptId, comprehension, readingSeconds, wordCount, curiosity, aloud, onBack }: {
  attemptId: string
  comprehension: number | null
  readingSeconds: number | null
  wordCount: number
  curiosity: string | null
  aloud: boolean
  onBack: () => void
}) {
  const [reflection, setReflection] = useState('')
  const [saved, setSaved] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  function handleChange(value: string) {
    setReflection(value)
    setSaved(false)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(async () => {
      if (!value.trim()) return
      const { error } = await supabase.from('lec_attempts').update({ reflection: value }).eq('id', attemptId)
      if (!error) setSaved(true)
    }, 1200)
  }

  const rawWpm = readingSeconds ? Math.round((wordCount / readingSeconds) * 60) : null
  const tooFast = rawWpm !== null && rawWpm > MAX_PLAUSIBLE_WPM
  const wpm = tooFast ? null : rawWpm

  return (
    <div className="space-y-4">
      <div className="bg-parchment-50 border border-parchment-200 rounded-xl p-6 text-center">
        <p className="font-display text-2xl font-bold text-ink-900">¡Lectura terminada!</p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="bg-white border border-parchment-200 rounded-lg p-3">
            <p className="font-mono text-2xl font-bold text-teal-600">{comprehension !== null ? `${comprehension}%` : '—'}</p>
            <p className="font-body text-xs text-ink-500">comprensión</p>
          </div>
          <div className="bg-white border border-parchment-200 rounded-lg p-3">
            <p className="font-mono text-2xl font-bold text-ink-800">{wpm ?? '—'}</p>
            <p className="font-body text-xs text-ink-500">{wpm ? 'palabras por minuto (aprox.)' : 'velocidad'}</p>
          </div>
        </div>
        {tooFast && (
          <p className="mt-4 font-body text-sm text-ink-600">
            Terminaste demasiado rápido para medir tu velocidad. La próxima vez lee el texto completo con calma y luego presiona "Terminé de leer".
          </p>
        )}
        {aloud && (
          <p className="mt-4 font-body text-sm text-ink-600">
            {AUDIO_UPLOAD_ENABLED
              ? 'Tu docente escuchará tu grabación y te dará tu resultado de fluidez.'
              : 'Versión de prueba: la grabación todavía no se envía a tu docente.'}
          </p>
        )}
      </div>

      {curiosity && (
        <div className="bg-parchment-100 border border-parchment-200 rounded-xl p-4">
          <p className="font-body text-sm text-ink-700"><span className="font-semibold">Dato curioso:</span> {curiosity}</p>
        </div>
      )}

      <div className="bg-parchment-50 border border-parchment-200 rounded-xl p-5">
        <p className="font-display font-semibold text-ink-800 mb-2">¿Qué fue lo más interesante de lo que leíste?</p>
        <textarea
          value={reflection}
          onChange={e => handleChange(e.target.value)}
          onPaste={e => e.preventDefault()}
          rows={4}
          placeholder="Escribe con tus palabras..."
          className="w-full font-body text-sm bg-white border border-parchment-300 rounded-lg p-3"
        />
        <p className="font-body text-xs text-ink-400 mt-1">{saved ? 'Guardado ✓' : 'Se guarda solo mientras escribes'}</p>
      </div>

      <button onClick={onBack} className="w-full bg-teal-600 text-white font-body font-semibold py-3 rounded-xl hover:bg-teal-500">
        Volver a mis lecturas
      </button>
    </div>
  )
}
