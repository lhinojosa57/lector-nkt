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
          <div className="text-right">
            <p className="font-mono text-3xl font-bold text-teal-600">
              {progress.current_wpm_avg}
            </p>
            <p className="font-body text-xs text-ink-500">wpm actual</p>
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
    </div>
  )
}