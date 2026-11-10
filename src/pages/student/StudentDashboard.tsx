import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { recordGroupJoin } from '@/lib/rosterApi'
import { useAuth } from '@/lib/auth'
import LevelBadge from '@/components/LevelBadge'
import ReadingCover from '@/components/ReadingCover'
import Shelf from '@/components/Shelf'
import BookSpine from '@/components/BookSpine'
import DoneBookDialog from '@/components/DoneBookDialog'
import LevelPathCard from '@/components/LevelPathCard'
import LevelUpCelebration from '@/components/LevelUpCelebration'
import { comprehensionLight, levelName, modeLabel, type LecConsent } from '@/lib/lec'
import { fetchStudentShelves, type StudentShelves } from '@/lib/studentShelvesApi'

const kpiBox = 'bg-parchment-50 border border-parchment-200 rounded-xl p-3 min-w-0'
const readBtn = 'mt-2 font-body text-sm px-4 py-1.5 rounded-lg bg-teal-600 text-white hover:bg-teal-500'

export default function StudentDashboard() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [shelves, setShelves] = useState<StudentShelves | null>(null)
  const [consent, setConsent] = useState<LecConsent | null>(null)
  const [reload, setReload] = useState(0)
  const [openBook, setOpenBook] = useState<StudentShelves['done'][number] | null>(null)
  const [levelUpIndex, setLevelUpIndex] = useState(0)

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
      try {
        const [sh, consentRes] = await Promise.all([
          fetchStudentShelves(studentId),
          supabase.from('lec_consents').select('*').eq('student_id', studentId).maybeSingle(),
        ])
        if (cancelled) return
        setShelves(sh)
        setLevelUpIndex(0)
        setConsent((consentRes.data as LecConsent) ?? null)
        setLoadError('')
      } catch (err) {
        console.error(err)
        if (!cancelled) setLoadError('No pudimos cargar tu biblioteca. Revisa tu conexión y recarga la página.')
      } finally {
        if (!cancelled) setLoading(false)
      }
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
    await recordGroupJoin(profile.id, group.id).catch(err => console.error('No se registró la fecha de unión', err))
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

  const k = shelves?.kpis
  const gainLang = shelves?.languages.find(l => shelves.kpis.gain[l])
  const gain = shelves && gainLang ? shelves.kpis.gain[gainLang] : undefined
  const levelUp = shelves?.unseenLevelUps[levelUpIndex]

  return (
    <div className="min-h-screen bg-sepia-100">
      <div className="bg-parchment-50 border-b border-parchment-200 px-4 sm:px-6 py-4">
        <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-3">
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

      <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-5">
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

        {loadError && <p role="alert" className="font-body text-sm text-crimson-500">{loadError}</p>}

        {shelves && k && (
          <>
            {/* Encabezado "Mi biblioteca" */}
            <div className="flex flex-col lg:flex-row gap-4 lg:items-start">
              <div className="lg:w-56 shrink-0 space-y-2">
                <h2 className="font-display text-2xl font-bold text-ink-900">Mi biblioteca</h2>
                {shelves.languages.map(lang => (
                  <div key={lang} className="flex items-center gap-2">
                    <LevelBadge level={shelves.levels[lang].level} size="sm" />
                    <p className="font-body text-sm text-ink-800 leading-tight">
                      {shelves.languages.length > 1 && <span className="text-ink-500">{lang === 'es' ? 'Español · ' : 'Inglés · '}</span>}
                      <strong>Nivel {shelves.levels[lang].level} · {levelName(shelves.levels[lang].level)}</strong>
                    </p>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 flex-1 min-w-0">
                <div className={kpiBox}>
                  <p className="font-display text-2xl font-bold text-ink-900">{k.readCount.toLocaleString('es-MX')}</p>
                  <p className="font-body text-xs text-ink-600">{k.readCount === 1 ? 'lectura leída' : 'lecturas leídas'}</p>
                  <p className="font-body text-xs text-ink-500 mt-1">
                    📖 {k.words.toLocaleString('es-MX')} palabras ≈ {k.pages.toLocaleString('es-MX')} {k.pages === 1 ? 'página' : 'páginas'}
                  </p>
                </div>
                <div className={kpiBox}>
                  {gain && gain.delta > 0 ? (
                    <>
                      <p className="font-display text-2xl font-bold text-teal-700">
                        +{gain.delta} <span className="text-sm font-body text-ink-500">ppm</span>
                      </p>
                      <p className="font-body text-xs text-ink-600">desde tu primera lectura en voz alta ({gain.first} → {gain.last})</p>
                    </>
                  ) : gain ? (
                    <p className="font-body text-sm text-ink-700">Tu última lectura: <strong>{gain.last}</strong> ppm</p>
                  ) : (
                    <p className="font-body text-sm text-ink-600">Lee en voz alta para ver tu avance</p>
                  )}
                </div>
                <div className="space-y-2 min-w-0">
                  {shelves.languages.map(lang => (
                    <LevelPathCard key={lang} language={lang} progress={shelves.progress[lang] ?? null} />
                  ))}
                </div>
              </div>
            </div>

            {/* Estante 1: asignadas */}
            <Shelf
              title="📌 Lecturas asignadas"
              subtitle="Las que tus docentes te pidieron · la más reciente primero"
              badge={shelves.pending.length > 0 && (
                <span className="font-body text-xs bg-amber-700 text-white rounded-full px-2.5 py-0.5">
                  {shelves.pending.length} por leer
                </span>
              )}
              empty="No tienes lecturas asignadas pendientes. 🎉"
            >
              {shelves.pending.map(b => (
                <div key={b.assignmentId} className="shrink-0 w-[140px] pb-3">
                  <ReadingCover title={b.title} subject={b.subject} coverPath={b.coverPath} size="md" />
                  <p className="font-display text-sm font-semibold text-ink-900 mt-2 leading-tight line-clamp-2 break-words">{b.title}</p>
                  <p className="font-body text-xs text-ink-500">{b.subject} · {modeLabel(b.mode)}</p>
                  <p className={`font-body text-xs ${b.overdue ? 'text-amber-800 font-semibold' : 'text-ink-500'}`}>
                    {b.dueLabel}{b.overdue ? ' · vencida' : ''}
                  </p>
                  <button onClick={() => navigate(`/student/read/${b.assignmentId}`)} aria-label={`Leer ${b.title}`} className={readBtn}>
                    Leer
                  </button>
                </div>
              ))}
            </Shelf>

            {/* Estante 2: entrenamiento libre */}
            <Shelf
              title="🌱 Entrenamiento libre"
              subtitle="Tres sugerencias de tu nivel para hoy"
              empty="Ya leíste todas las lecturas de tu nivel. ¡Pronto habrá más!"
              footer={
                <button onClick={() => navigate('/student/library')} className="font-body text-sm text-teal-700 hover:underline">
                  Ver toda la biblioteca →
                </button>
              }
            >
              {shelves.suggestions.map(r => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => navigate(`/student/practice/${r.id}`)}
                  aria-label={`Leer ${r.title}, ${r.subject}${r.levelShown ? `, nivel ${r.levelShown}` : ''}`}
                  className="shrink-0 w-[140px] pb-3 text-left rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-600"
                >
                  <ReadingCover title={r.title} subject={r.subject} coverPath={r.coverPath} size="md" />
                  <p className="font-display text-sm font-semibold text-ink-900 mt-2 leading-tight line-clamp-2 break-words">{r.title}</p>
                  <p className="font-body text-xs text-ink-500">{r.subject}{r.levelShown ? ` · Nivel ${r.levelShown}` : ''}</p>
                </button>
              ))}
            </Shelf>

            {/* Estante 3: realizadas */}
            <Shelf
              title="📚 Lecturas realizadas"
              subtitle="Toca un libro para ver cómo te fue"
              empty="Aquí se irán acomodando los libros que termines."
              footer={shelves.done.length > 0 && (
                <p className="font-body text-[11px] text-ink-400">
                  <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 mr-1" />75% o más
                  <span className="inline-block w-2 h-2 rounded-full bg-amber-400 ml-3 mr-1" />50 a 74%
                  <span className="inline-block w-2 h-2 rounded-full bg-red-500 ml-3 mr-1" />menos de 50%
                </p>
              )}
            >
              {shelves.done.map(b => (
                <BookSpine
                  key={b.readingId}
                  title={b.reading.title}
                  subject={b.reading.subject}
                  words={b.latest.words}
                  pct={b.latest.comprehension}
                  light={b.latest.comprehension !== null ? comprehensionLight(b.latest.comprehension).light : null}
                  onClick={() => setOpenBook(b)}
                />
              ))}
            </Shelf>
          </>
        )}
      </div>

      {openBook && (
        <DoneBookDialog
          book={openBook}
          onClose={() => setOpenBook(null)}
          onReadAgain={() => navigate(`/student/practice/${openBook.readingId}`)}
        />
      )}

      {levelUp && !openBook && !showJoin && (
        <LevelUpCelebration change={levelUp} onClose={() => setLevelUpIndex(i => i + 1)} />
      )}

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
