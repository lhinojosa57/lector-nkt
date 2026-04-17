import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'

interface SessionText {
  id: string
  title: string
  curiosity_fact: string
  vocabulary: { word: string; definition: string }[]
}

interface Answer {
  questionId: string
  given: string
  correct: boolean
  points: number
}

interface Props {
  text: SessionText
  wordsRead: number
  comprehensionScore: number
  answers: Answer[]
  audioBlob: Blob | null
}

export default function SessionClose({ text, wordsRead, comprehensionScore, answers, audioBlob: _audioBlob }: Props) {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [saving, setSaving] = useState(true)
  const [reflection, setReflection] = useState('')
  const reflectionTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    async function saveSession() {
      if (!profile?.id) return

      await supabase
        .from('reading_sessions')
        .upsert({
          student_id: profile.id,
          text_id: text.id,
          session_date: new Date().toISOString().split('T')[0],
          wpm: wordsRead,
          words_read: wordsRead,
          comprehension_score: comprehensionScore,
          questions_correct: answers.filter(a => a.correct).length,
          questions_total: answers.length,
          is_completed: true,
          completed_at: new Date().toISOString(),
        }, { onConflict: 'student_id,text_id' })

      setSaving(false)
    }
    saveSession()
  }, [])

  const handleReflection = (value: string) => {
    setReflection(value)
    if (reflectionTimer.current) clearTimeout(reflectionTimer.current)
    reflectionTimer.current = setTimeout(async () => {
      if (!value.trim() || !profile?.id) return
      await supabase
        .from('reading_sessions')
        .update({ reflection_text: value })
        .eq('student_id', profile.id)
        .eq('text_id', text.id)
    }, 1500)
  }

  if (saving) {
    return (
      <div className="min-h-screen bg-sepia-100 flex items-center justify-center">
        <div className="text-center">
          <div className="spinner mx-auto mb-4" />
          <p className="font-body text-ink-600">Guardando sesión...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-sepia-100 flex flex-col">

      <div className="bg-parchment-50 border-b border-parchment-200 px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <p className="font-display font-semibold text-ink-800">Sesión completada</p>
          <span className="font-mono text-xs text-ink-500">4 / 4</span>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-lg w-full space-y-4">

          {/* Métricas del día */}
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
              <p className="font-body text-xs text-ink-500 mt-1">comprensión</p>
            </div>
          </div>

          {/* Dato curioso */}
          <div className="bg-parchment-50 border-l-4 border-teal-500 rounded-r-xl p-5">
            <p className="font-body text-xs font-semibold text-teal-600 uppercase tracking-wider mb-2">
              Dato curioso
            </p>
            <p className="font-body text-sm text-ink-700 leading-relaxed">
              {text.curiosity_fact}
            </p>
          </div>

          {/* Vocabulario */}
          {text.vocabulary?.length > 0 && (
            <div className="bg-parchment-50 border border-parchment-200 rounded-xl p-5">
              <p className="font-body text-xs font-semibold text-ink-500 uppercase tracking-wider mb-3">
                Palabras de hoy
              </p>
              <div className="space-y-2">
                {text.vocabulary.map((v, i) => (
                  <div key={i} className="flex gap-2">
                    <span className="font-body text-sm font-semibold text-teal-700 min-w-24 flex-shrink-0">{v.word}</span>
                    <span className="font-body text-sm text-ink-600">{v.definition}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Reflexión metacognitiva */}
          <div className="bg-parchment-50 border border-parchment-200 rounded-xl p-5">
            <p className="font-body text-sm font-semibold text-ink-700 mb-2">
              ¿Qué fue lo más interesante de lo que leíste hoy?
            </p>
            <p className="font-body text-xs text-ink-400 mb-3">
              No se califica — solo activa tu memoria.
            </p>
            <textarea
              value={reflection}
              onChange={e => handleReflection(e.target.value)}
              onPaste={e => e.preventDefault()}
              placeholder="Escribe lo que quieras..."
              rows={3}
              className="w-full border border-parchment-300 rounded-lg px-3 py-2 font-body text-sm text-ink-800 bg-white focus:outline-none focus:border-teal-400 resize-none"
            />
          </div>

          {/* Botón final */}
          <button
            onClick={() => navigate('/student')}
            className="w-full bg-teal-600 text-white font-body font-semibold py-4 rounded-xl hover:bg-teal-500 transition-colors text-lg"
          >
            Volver al inicio →
          </button>

        </div>
      </div>
    </div>
  )
}