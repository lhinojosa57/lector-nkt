import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import LevelBadge, { levelMotto } from '@/components/LevelBadge'
import {
  DEFAULT_LEVEL, comprehensionLight, formatDate, levelName, modeLabel, type Light,
  type Language, type LecAssignment, type LecConsent,
} from '@/lib/lec'

interface AssignmentRow extends LecAssignment {
  title: string
  language: Language
  subject: string
  completed: boolean
  comprehension: number | null
  completedAt: string | null
  fluency: { wcpm: number; accuracy_pct: number; comment: string | null } | null
}

const LIGHT_DOT: Record<Light, string> = {
  green: 'bg-emerald-500',
  yellow: 'bg-amber-400',
  red: 'bg-red-500',
}

export default function StudentDashboard() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [assignments, setAssignments] = useState<AssignmentRow[]>([])
  const [levels, setLevels] = useState<Record<Language, { level: number; provisional: boolean }>>({
    es: { level: DEFAULT_LEVEL, provisional: true },
    en: { level: DEFAULT_LEVEL, provisional: true },
  })
  const [consent, setConsent] = useState<LecConsent | null>(null)
  const [reload, setReload] = useState(0)

  const [showJoin, setShowJoin] = useState(false)
  const [joinCode, setJoinCode] = useState('')
  const [joining, setJoining] = useState(false)
  const [joinError, setJoinError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    if (!profile?.id) return
    const studentId = profile.id
    let cancelled = false

    async function load() {
      const [assignRes, attemptsRes, levelsRes, consentRes] = await Promise.all([
        supabase
          .from('lec_assignments')
          .select('*, lec_readings(title, language, subject)')
          .eq('archived', false)
          .order('created_at', { ascending: false }),
        supabase
          .from('lec_attempts')
          .select('assignment_id, comprehension_pct, completed_at, lec_fluency_reviews(wcpm, accuracy_pct, comment)')
          .eq('student_id', studentId)
          .not('assignment_id', 'is', null)
          .not('completed_at', 'is', null),
        supabase.from('lec_student_levels').select('language, level, is_provisional').eq('student_id', studentId),
        supabase.from('lec_consents').select('*').eq('student_id', studentId).maybeSingle(),
      ])
      if (cancelled) return

      type Fl = { wcpm: number; accuracy_pct: number; comment: string | null }
      const done = new Map<string, { pct: number | null; at: string; fluency: Fl | null }>()
      for (const a of (attemptsRes.data ?? []) as unknown as { assignment_id: string; comprehension_pct: number | null; completed_at: string; lec_fluency_reviews: Fl | Fl[] | null }[]) {
        const f = Array.isArray(a.lec_fluency_reviews) ? a.lec_fluency_reviews[0] ?? null : a.lec_fluency_reviews
        done.set(a.assignment_id, { pct: a.comprehension_pct, at: a.completed_at, fluency: f })
      }

      type Raw = LecAssignment & { lec_readings: { title: string; language: Language; subject: string } | null }
      const rows = ((assignRes.data ?? []) as Raw[])
        .filter(a => a.lec_readings)
        .map(a => ({
          ...a,
          title: a.lec_readings!.title,
          language: a.lec_readings!.language,
          subject: a.lec_readings!.subject,
          completed: done.has(a.id),
          comprehension: done.get(a.id)?.pct ?? null,
          completedAt: done.get(a.id)?.at ?? null,
          fluency: done.get(a.id)?.fluency ?? null,
        }))
        // Pendientes primero, luego por fecha límite
        .sort((a, b) => Number(a.completed) - Number(b.completed) || (a.due_date ?? '9999').localeCompare(b.due_date ?? '9999'))

      const lv = { es: { level: DEFAULT_LEVEL, provisional: true }, en: { level: DEFAULT_LEVEL, provisional: true } }
      for (const l of (levelsRes.data ?? []) as { language: Language; level: number; is_provisional: boolean }[]) {
        lv[l.language] = { level: l.level, provisional: l.is_provisional }
      }

      setAssignments(rows)
      setLevels(lv)
      setConsent((consentRes.data as LecConsent) ?? null)
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [profile?.id, reload])

  async function handleJoin() {
    if (!joinCode.trim() || !profile?.id) return
    setJoining(true)
    setJoinError('')

    const { data: group } = await supabase
      .from('reading_groups')
      .select('id, name')
      .eq('invite_code', joinCode.toUpperCase())
      .eq('archived', false)
      .maybeSingle()

    if (!group) {
      setJoinError('Código no válido. Verifica e intenta de nuevo.')
      setJoining(false)
      return
    }

    const { error } = await supabase
      .from('reading_group_members')
      .upsert({ student_id: profile.id, group_id: group.id }, { onConflict: 'student_id,group_id' })

    setJoining(false)
    if (error) {
      setJoinError('Error al unirse. Intenta de nuevo.')
      return
    }
    setShowJoin(false)
    setJoinCode('')
    setNotice(`Te uniste al grupo "${group.name}".`)
    setReload(r => r + 1)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-sepia-100 flex items-center justify-center"><div className="spinner" /></div>
    )
  }

  const pending = assignments.filter(a => !a.completed)
  const completed = assignments.filter(a => a.completed)

  return (
    <div className="min-h-screen bg-sepia-100">
      <div className="bg-parchment-50 border-b border-parchment-200 px-4 sm:px-6 py-4">
        <div className="max-w-3xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-xl font-bold text-ink-900">LectorNKT</h1>
            <p className="font-body text-xs text-ink-500 mt-0.5">{profile?.full_name ?? profile?.email}</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowJoin(true)}
              className="font-body text-xs border border-parchment-300 text-ink-600 px-3 py-2 rounded-lg hover:bg-parchment-100"
            >
              + Unirse a grupo
            </button>
            <button onClick={signOut} className="font-body text-xs text-ink-400 hover:text-ink-600">Cerrar sesión</button>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-5">
        {notice && (
          <p role="status" className="font-body text-sm bg-teal-50 text-teal-800 border border-teal-200 rounded-lg px-4 py-2">{notice}</p>
        )}

        {!consent && (
          <div className="bg-gold-300/30 border border-gold-400 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
            <p className="font-body text-sm text-ink-800">
              Falta el consentimiento de tu familia para las lecturas en voz alta.
            </p>
            <button
              onClick={() => navigate('/student/consent')}
              className="font-body text-sm px-4 py-2 rounded-lg bg-ink-800 text-parchment-50 hover:bg-ink-700"
            >
              Llenarlo con mi familia
            </button>
          </div>
        )}

        {/* Niveles */}
        <div className="grid grid-cols-2 gap-3">
          {(['es', 'en'] as Language[]).map(lang => (
            <div key={lang} className="bg-parchment-50 border border-parchment-200 rounded-xl p-4 flex items-center gap-3">
              <LevelBadge level={levels[lang].level} />
              <div className="min-w-0">
                <p className="font-body text-xs text-ink-500">{lang === 'es' ? 'Lectura en español' : 'Lectura en inglés'}</p>
                <p className="font-display text-lg font-bold text-ink-900 leading-tight">
                  Nivel {levels[lang].level} · {levelName(levels[lang].level)}
                </p>
                <p className="font-body text-xs text-ink-500 italic">{levelMotto(levels[lang].level)}</p>
                {levels[lang].provisional && (
                  <p className="font-body text-xs text-ink-400 mt-0.5">Provisional, hasta tu diagnóstico</p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Mis lecturas */}
        <section className="bg-parchment-50 border border-parchment-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-parchment-200">
            <h2 className="font-display font-semibold text-ink-800">Mis lecturas</h2>
            <p className="font-body text-xs text-ink-500">Las que te asignaron tus docentes</p>
          </div>
          {pending.length === 0 ? (
            <p className="px-5 py-4 font-body text-sm text-ink-500">No tienes lecturas pendientes.</p>
          ) : (
            <ul className="divide-y divide-parchment-200">
              {pending.map(a => (
                <li key={a.id} className="px-5 py-4 flex flex-wrap items-center gap-3">
                  <div className="flex-1 min-w-[200px]">
                    <p className="font-display font-semibold text-ink-900">{a.title}</p>
                    <p className="font-body text-xs text-ink-500 mt-0.5">
                      {a.subject} · {modeLabel(a.mode)}{a.due_date ? ` · Entregar antes del ${formatDate(a.due_date)}` : ''}
                    </p>
                  </div>
                  <button
                    onClick={() => navigate(`/student/read/${a.id}`)}
                    aria-label={`Leer ${a.title}`}
                    className="font-body text-sm px-4 py-2 rounded-lg bg-teal-600 text-white hover:bg-teal-500"
                  >
                    Leer →
                  </button>
                </li>
              ))}
            </ul>
          )}
          {completed.length > 0 && (
            <div className="border-t border-parchment-200">
              <p className="px-5 pt-3 pb-1 font-body text-xs text-ink-500">Completadas</p>
              <ul className="divide-y divide-parchment-200">
                {completed.map(a => {
                  const light = a.comprehension !== null ? comprehensionLight(a.comprehension) : null
                  return (
                    <li key={a.id} className="px-5 py-3 flex items-center gap-3">
                      <span
                        className={`w-3.5 h-3.5 rounded-full flex-shrink-0 ${light ? LIGHT_DOT[light.light] : 'bg-parchment-300'}`}
                        aria-hidden
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-body text-sm text-ink-800">{a.title}</p>
                        <p className="font-body text-xs text-ink-500">
                          {a.subject} · {modeLabel(a.mode)}{a.completedAt ? ` · ${new Date(a.completedAt).toLocaleDateString('es-MX')}` : ''}
                          {light ? ` · ${light.label}` : ''}
                        </p>
                        {a.mode === 'aloud' && (
                          <p className="font-body text-xs text-ink-700 mt-0.5">
                            {a.fluency
                              ? <>Fluidez: <strong>{Math.round(a.fluency.wcpm)}</strong> palabras correctas por minuto · {a.fluency.accuracy_pct}% de precisión</>
                              : 'Tu docente todavía no revisa tu grabación.'}
                          </p>
                        )}
                        {a.fluency?.comment && (
                          <p className="font-body text-xs text-ink-600 italic mt-0.5">Tu docente: “{a.fluency.comment}”</p>
                        )}
                      </div>
                      {a.comprehension !== null && (
                        <span className="font-mono text-sm font-bold text-ink-700">{Math.round(a.comprehension)}%</span>
                      )}
                    </li>
                  )
                })}
              </ul>
              <p className="px-5 py-2 font-body text-[11px] text-ink-400 border-t border-parchment-200">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 mr-1" />75% o más
                <span className="inline-block w-2 h-2 rounded-full bg-amber-400 ml-3 mr-1" />50 a 74%
                <span className="inline-block w-2 h-2 rounded-full bg-red-500 ml-3 mr-1" />menos de 50%
              </p>
            </div>
          )}
        </section>

        {/* Entrenamiento libre */}
        <button
          onClick={() => navigate('/student/library')}
          className="w-full text-left bg-parchment-50 border border-parchment-200 rounded-xl p-5 hover:bg-parchment-100 transition-colors"
        >
          <p className="font-display font-semibold text-ink-800">Entrenamiento libre →</p>
          <p className="font-body text-sm text-ink-500 mt-1">Elige una lectura de tu nivel sobre el tema que quieras.</p>
        </button>
      </div>

      {showJoin && (
        <div
          className="fixed inset-0 z-50 bg-ink-900/50 flex items-center justify-center p-4"
          onKeyDown={e => { if (e.key === 'Escape') { setShowJoin(false); setJoinCode(''); setJoinError('') } }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="join-title"
            aria-describedby="join-desc"
            className="bg-parchment-50 rounded-xl w-full max-w-sm border border-parchment-200 p-6"
          >
            <h2 id="join-title" className="font-display text-lg font-bold text-ink-800 mb-2">Unirse a un grupo</h2>
            <p id="join-desc" className="font-body text-sm text-ink-500 mb-4">Escribe el código que te dio tu docente</p>
            <input
              autoFocus
              aria-label="Código del grupo"
              value={joinCode}
              onChange={e => setJoinCode(e.target.value.toUpperCase())}
              placeholder="ej. 18DD4B"
              maxLength={6}
              className="w-full border border-parchment-300 rounded-lg px-3 py-2 font-mono text-lg text-ink-800 bg-white focus:border-teal-400 tracking-widest text-center mb-3"
            />
            {joinError && <p role="alert" className="font-body text-xs text-crimson-500 mb-3">{joinError}</p>}
            <div className="flex gap-3">
              <button
                onClick={() => { setShowJoin(false); setJoinCode(''); setJoinError('') }}
                className="flex-1 border border-parchment-300 text-ink-700 py-2.5 rounded-lg font-body text-sm hover:bg-sepia-100"
              >
                Cancelar
              </button>
              <button
                onClick={handleJoin}
                disabled={joinCode.length < 6 || joining}
                className="flex-1 bg-teal-600 text-white py-2.5 rounded-lg font-body text-sm font-medium hover:bg-teal-500 disabled:opacity-40"
              >
                {joining ? 'Uniéndose...' : 'Unirse'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
