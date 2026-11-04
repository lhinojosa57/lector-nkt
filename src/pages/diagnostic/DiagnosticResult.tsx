import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'

interface Answer {
  questionId: string
  given: string
  correct: boolean
  points: number
}

interface Props {
  wordsRead: number
  comprehensionScore: number
  answers: Answer[]
  audioBlob: Blob | null
}

const LEVELS = [
  { key: 'escriba',      label: 'Escriba',      min: 0,   max: 119,  color: 'text-amber-600',  bg: 'bg-amber-50',  border: 'border-amber-200' },
  { key: 'cronista',     label: 'Cronista',     min: 120, max: 159,  color: 'text-teal-600',   bg: 'bg-teal-50',   border: 'border-teal-200' },
  { key: 'pensador',     label: 'Intelectual',     min: 160, max: 199,  color: 'text-blue-600',   bg: 'bg-blue-50',   border: 'border-blue-200' },
  { key: 'corresponsal', label: 'Corresponsal', min: 200, max: 259,  color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200' },
  { key: 'humanista',    label: 'Humanista',    min: 260, max: 9999, color: 'text-rose-600',   bg: 'bg-rose-50',   border: 'border-rose-200' },
]

function getLevel(wpm: number) {
  return LEVELS.find(l => wpm >= l.min && wpm <= l.max) ?? LEVELS[0]
}

export default function DiagnosticResult({ wordsRead, comprehensionScore, answers, audioBlob:_audioBlob }: Props) {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [saving, setSaving] = useState(true)
  const [saveError, setSaveError] = useState(false)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    async function saveResults() {
      if (!profile?.id) return
      setSaving(true)
      setSaveError(false)

      // Guardar la sesión del diagnóstico
      const { error: sessionError } = await supabase
        .from('reading_sessions')
        .upsert({
          student_id: profile.id,
          text_id: '98c0dbf4-7911-4025-a3bc-31ba4e83e9c0',
          is_diagnostic: true,
          session_date: new Date().toISOString().split('T')[0],
          wpm: wordsRead,
          words_read: wordsRead,
          comprehension_score: comprehensionScore,
          questions_correct: answers.filter(a => a.correct).length,
          questions_total: answers.length,
          is_completed: true,
          completed_at: new Date().toISOString(),
        }, { onConflict: 'student_id,text_id' })

      if (sessionError) {
        console.error('Error al guardar el diagnóstico:', sessionError)
        setSaveError(true)
        setSaving(false)
        return
      }

      // Guardar el progreso inicial del estudiante
      const { error: progressError } = await supabase
        .from('student_reading_progress')
        .upsert({
          student_id: profile.id,
          diagnostic_wpm: wordsRead,
          diagnostic_comprehension: comprehensionScore,
          diagnostic_date: new Date().toISOString().split('T')[0],
          current_wpm_avg: wordsRead,
          best_wpm: wordsRead,
          current_level: getLevel(wordsRead).key,
          total_sessions: 1,
          wpm_history: JSON.stringify([{
            date: new Date().toISOString().split('T')[0],
            wpm: wordsRead,
            comprehension: comprehensionScore,
          }]),
        }, { onConflict: 'student_id' })

      if (progressError) {
        console.error('Error al guardar el progreso:', progressError)
        setSaveError(true)
      }
      setSaving(false)
    }

    saveResults()
  }, [profile?.id, attempt])
  const level = getLevel(wordsRead)

  if (saveError) {
    return (
      <div className="min-h-screen bg-sepia-100 flex items-center justify-center p-6">
        <div className="max-w-sm w-full text-center bg-parchment-50 border border-parchment-200 rounded-xl p-6">
          <p className="font-display text-lg font-bold text-ink-900 mb-2">No pudimos guardar tu diagnóstico</p>
          <p className="font-body text-sm text-ink-600 mb-5">
            Revisa tu conexión a internet e inténtalo de nuevo. Tus respuestas siguen aquí.
          </p>
          <button
            onClick={() => setAttempt(a => a + 1)}
            className="w-full bg-teal-600 text-white font-body font-semibold py-3 rounded-xl hover:bg-teal-500 transition-colors"
          >
            Intentar de nuevo
          </button>
        </div>
      </div>
    )
  }

  if (saving) {
    return (
      <div className="min-h-screen bg-sepia-100 flex items-center justify-center">
        <div className="text-center">
          <div className="spinner mx-auto mb-4" />
          <p className="font-body text-ink-600">Guardando resultados...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-sepia-100 flex flex-col">
      <div className="bg-parchment-50 border-b border-parchment-200 px-6 py-4">
        <p className="font-display font-semibold text-ink-800">Diagnóstico completado</p>
        <p className="text-ink-500 text-xs font-body mt-0.5">Tu punto de partida queda registrado</p>
      </div>

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-lg w-full space-y-4">

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-parchment-50 border border-parchment-200 rounded-xl p-5 text-center">
              <p className="font-mono text-4xl font-bold text-teal-600">{wordsRead}</p>
              <p className="font-body text-xs text-ink-500 mt-1">palabras por minuto</p>
            </div>
            <div className="bg-parchment-50 border border-parchment-200 rounded-xl p-5 text-center">
              <p className={`font-mono text-4xl font-bold ${
                comprehensionScore >= 75 ? 'text-teal-600'
                : comprehensionScore >= 50 ? 'text-amber-500'
                : 'text-red-500'
              }`}>
                {comprehensionScore}%
              </p>
              <p className="font-body text-xs text-ink-500 mt-1">comprensión lectora</p>
            </div>
          </div>

          <div className={`${level.bg} ${level.border} border rounded-xl p-5`}>
            <p className="font-body text-xs text-ink-500 mb-1">Tu nivel inicial</p>
            <p className={`font-display text-2xl font-bold ${level.color}`}>
              {level.label}
            </p>
            <p className="font-body text-sm text-ink-600 mt-2 leading-relaxed">
              {level.key === 'escriba' && 'Como los escribas del antiguo Egipto, dominas los símbolos básicos. Con práctica diaria llegarás más lejos.'}
              {level.key === 'cronista' && 'Como los cronistas de la Nueva España, documentas lo que lees con atención. Tu ritmo va creciendo.'}
              {level.key === 'pensador' && 'Como los pensadores ilustrados, lees con fluidez e intención. Estás por encima del promedio.'}
              {level.key === 'corresponsal' && 'Como un corresponsal de prensa, capturas la información con velocidad y precisión.'}
              {level.key === 'humanista' && 'Eres un lector experto. Tu velocidad y comprensión son excepcionales.'}
            </p>
          </div>

          <button
            onClick={() => navigate(profile?.role === 'teacher' ? '/teacher' : '/student')}
            className="w-full bg-teal-600 text-white font-body font-semibold py-4 rounded-xl hover:bg-teal-500 transition-colors text-lg"
          >
            Comenzar mi entrenamiento →
          </button>

        </div>
      </div>
    </div>
  )
}