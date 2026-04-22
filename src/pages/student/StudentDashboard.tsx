import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'

interface Progress {
  diagnostic_wpm: number
  diagnostic_comprehension: number
  diagnostic_date: string
  current_level: string
  current_wpm_avg: number
  best_wpm: number
  streak_days: number
  total_sessions: number
  wpm_history: { date: string; wpm: number; comprehension: number }[]
}

const LEVEL_LABELS: Record<string, string> = {
  escriba: 'Escriba',
  cronista: 'Cronista',
  pensador: 'Intelectual',
  corresponsal: 'Corresponsal',
  humanista: 'Humanista',
}

const LEVEL_COLORS: Record<string, string> = {
  escriba: 'text-amber-600',
  cronista: 'text-teal-600',
  pensador: 'text-blue-600',
  corresponsal: 'text-purple-600',
  humanista: 'text-rose-600',
}
export default function StudentDashboard() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [progress, setProgress] = useState<Progress | null>(null)
  const [todayDone, setTodayDone] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showJoinModal, setShowJoinModal] = useState(false)
  const [joinCode, setJoinCode] = useState('')
  const [joining, setJoining] = useState(false)
  const [joinError, setJoinError] = useState('')

  useEffect(() => {
    async function load() {
      if (!profile?.id) return

      // Traer progreso del estudiante
      const { data: prog } = await supabase
        .from('student_reading_progress')
        .select('*')
        .eq('student_id', profile.id)
        .single()

      // Si no tiene diagnóstico, mandarlo a hacerlo
      if (!prog?.diagnostic_date) {
        navigate('/diagnostic', { replace: true })
        return
      }

      setProgress({
        ...prog,
        wpm_history: typeof prog.wpm_history === 'string'
          ? JSON.parse(prog.wpm_history)
          : prog.wpm_history ?? [],
      })

      // Verificar si ya hizo la sesión de hoy
      const today = new Date().toISOString().split('T')[0]
      const { data: todaySession } = await supabase
        .from('reading_sessions')
        .select('id, is_completed')
        .eq('student_id', profile.id)
        .eq('session_date', today)
        .eq('is_completed', true)
        .eq('is_diagnostic', false)
        .single()

      setTodayDone(!!todaySession)
      setLoading(false)
    }
    load()
  }, [profile?.id])

    const handleJoin = async () => {
    if (!joinCode.trim() || !profile?.id) return
    setJoining(true)
    setJoinError('')

    const { data: group } = await supabase
      .from('reading_groups')
      .select('id, name')
      .eq('invite_code', joinCode.toUpperCase())
      .eq('archived', false)
      .single()

    if (!group) {
      setJoinError('Código no válido. Verifica e intenta de nuevo.')
      setJoining(false)
      return
    }

    const { error } = await supabase
      .from('reading_group_members')
      .upsert({ student_id: profile.id, group_id: group.id }, { onConflict: 'student_id,group_id' })

    if (error) {
      setJoinError('Error al unirse. Intenta de nuevo.')
      setJoining(false)
      return
    }

    setJoining(false)
    setShowJoinModal(false)
    setJoinCode('')
    alert(`¡Te uniste al grupo "${group.name}" correctamente!`)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-sepia-100 flex items-center justify-center">
        <div className="spinner mx-auto" />
      </div>
    )
  }

  if (!progress) return null

  const wpmDelta = progress.current_wpm_avg - progress.diagnostic_wpm

  return (
    <div className="min-h-screen bg-sepia-100">

      {/* Header */}
      <div className="bg-parchment-50 border-b border-parchment-200 px-6 py-5">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-ink-900">
              Hola, {profile?.full_name?.split(' ')[0]} 👋
            </h1>
            <p className={`font-body text-sm mt-0.5 ${LEVEL_COLORS[progress.current_level]}`}>
              {LEVEL_LABELS[progress.current_level]}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <button
              onClick={() => setShowJoinModal(true)}
              className="font-body text-xs border border-teal-300 text-teal-700 px-3 py-1.5 rounded-lg hover:bg-teal-50 transition-colors"
            >
              + Unirse a grupo
            </button>
            <div className="text-right">
              <p className="font-mono text-3xl font-bold text-teal-600">
                {progress.current_wpm_avg}
              </p>
              <p className="font-body text-xs text-ink-500">wpm actual</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-6 space-y-4">

        {/* Sesión del día */}
        <div className={`rounded-xl p-6 border ${todayDone ? 'bg-teal-50 border-teal-200' : 'bg-parchment-50 border-parchment-200'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-body text-xs text-ink-500 mb-1">
                {todayDone ? 'Sesión de hoy' : 'Tu sesión de hoy'}
              </p>
              <p className="font-display text-lg font-bold text-ink-800">
                {todayDone ? '¡Sesión completada!' : 'Lista para comenzar'}
              </p>
              <p className="font-body text-sm text-ink-500 mt-1">
                {todayDone
                  ? 'Vuelve mañana para continuar tu racha'
                  : '15 minutos de lectura y preguntas'}
              </p>
            </div>
            {!todayDone && (
              <button
                onClick={() => navigate('/student/session')}
                className="bg-teal-600 text-white font-body font-semibold px-6 py-3 rounded-xl hover:bg-teal-500 transition-colors flex-shrink-0"
              >
                Iniciar →
              </button>
            )}
            {todayDone && (
              <div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              </div>
            )}
          </div>
        </div>

        {/* Métricas */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-parchment-50 border border-parchment-200 rounded-xl p-4 text-center">
            <p className="font-mono text-2xl font-bold text-amber-500">
              {progress.streak_days}
            </p>
            <p className="font-body text-xs text-ink-500 mt-1">días de racha</p>
          </div>
          <div className="bg-parchment-50 border border-parchment-200 rounded-xl p-4 text-center">
            <p className={`font-mono text-2xl font-bold ${wpmDelta >= 0 ? 'text-teal-600' : 'text-red-500'}`}>
              {wpmDelta >= 0 ? '+' : ''}{wpmDelta}
            </p>
            <p className="font-body text-xs text-ink-500 mt-1">wpm ganados</p>
          </div>
          <div className="bg-parchment-50 border border-parchment-200 rounded-xl p-4 text-center">
            <p className="font-mono text-2xl font-bold text-blue-600">
              {Math.max(0, progress.total_sessions - 1)}
            </p>
            <p className="font-body text-xs text-ink-500 mt-1">sesiones</p>
          </div>
        </div>

        {/* Diagnóstico inicial */}
        <div className="bg-parchment-50 border border-parchment-200 rounded-xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <svg className="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v18M3 6l9-3 9 3-9 3-9-3z" />
                </svg>
                <p className="font-body text-xs text-ink-500">Punto de partida</p>
              </div>
              <p className="font-display text-base font-bold text-ink-800">
                Diagnóstico realizado
              </p>
              <p className="font-body text-xs text-ink-400 mt-1">
                {new Date(progress.diagnostic_date + 'T12:00:00').toLocaleDateString('es-MX', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric'
                })}
              </p>
            </div>
            <div className="text-right">
              <p className="font-mono text-2xl font-bold text-amber-500">
                {progress.diagnostic_wpm}
              </p>
              <p className="font-body text-xs text-ink-500">wpm inicial</p>
            </div>
          </div>
        </div>

        {/* Historial de WPM */}
        {progress.wpm_history.length > 1 && (
          <div className="bg-parchment-50 border border-parchment-200 rounded-xl p-5">
            <p className="font-body text-xs text-ink-500 mb-4">Tu progreso de WPM</p>
            <div className="flex items-end gap-1.5 h-20">
              {progress.wpm_history.slice(-10).map((h, i) => {
                const max = Math.max(...progress.wpm_history.slice(-10).map(x => x.wpm))
                const pct = Math.round((h.wpm / max) * 100)
                const isLast = i === progress.wpm_history.slice(-10).length - 1
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className={`w-full rounded-sm ${isLast ? 'bg-teal-500' : 'bg-teal-200'}`}
                      style={{ height: `${pct}%` }}
                    />
                  </div>
                )
              })}
            </div>
            <div className="flex justify-between mt-2">
              <span className="font-mono text-xs text-ink-400">
                Inicio: {progress.diagnostic_wpm} wpm
              </span>
              <span className="font-mono text-xs text-teal-600 font-bold">
                Ahora: {progress.current_wpm_avg} wpm
              </span>
            </div>
          </div>
        )}

      </div>
      {showJoinModal && (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', zIndex: 50 }}>
        <div className="bg-parchment-50 rounded-xl w-full max-w-sm border border-parchment-200 p-6">
          <h2 className="font-display text-lg font-bold text-ink-800 mb-2">Unirse a un grupo</h2>
          <p className="font-body text-sm text-ink-500 mb-4">Ingresa el código que te dio tu docente</p>
          <input
            value={joinCode}
            onChange={e => setJoinCode(e.target.value.toUpperCase())}
            placeholder="ej. 18DD4B"
            maxLength={6}
            className="w-full border border-parchment-300 rounded-lg px-3 py-2 font-mono text-lg text-ink-800 bg-white focus:outline-none focus:border-teal-400 tracking-widest text-center mb-3"
          />
          {joinError && <p className="font-body text-xs text-red-500 mb-3">{joinError}</p>}
          <div className="flex gap-3">
            <button
              onClick={() => { setShowJoinModal(false); setJoinCode(''); setJoinError('') }}
              className="flex-1 border border-parchment-300 text-ink-700 py-2.5 rounded-lg font-body text-sm hover:bg-sepia-100 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleJoin}
              disabled={joinCode.length < 6 || joining}
              className="flex-1 bg-teal-600 text-white py-2.5 rounded-lg font-body text-sm font-medium hover:bg-teal-500 disabled:opacity-40 transition-colors"
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