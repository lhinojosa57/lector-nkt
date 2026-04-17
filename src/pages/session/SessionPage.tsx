import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import SessionWarmup from './SessionWarmup'
import SessionReading from './SessionReading'
import SessionQuestions from './SessionQuestions'
import SessionClose from './SessionClose'

type SessionStep = 'warmup' | 'reading' | 'questions' | 'close'

interface SessionText {
  id: string
  title: string
  body: string
  word_count: number
  curiosity_fact: string
  vocabulary: { word: string; definition: string }[]
}

interface Answer {
  questionId: string
  given: string
  correct: boolean
  points: number
}

export default function SessionPage() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState<SessionStep>('warmup')
  const [sessionText, setSessionText] = useState<SessionText | null>(null)
  const [loading, setLoading] = useState(true)
  const [noSession, setNoSession] = useState(false)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [wordsRead, setWordsRead] = useState(0)
  const [comprehensionScore, setComprehensionScore] = useState(0)
  const [answers, setAnswers] = useState<Answer[]>([])

  useEffect(() => {
    async function load() {
      if (!profile?.id) return

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

      if (todaySession) {
        navigate('/student', { replace: true })
        return
      }

      // Obtener la semana y día actual del calendario
      const { data: calendarDay } = await supabase
        .from('school_calendar')
        .select('week_number, day_of_week')
        .eq('date', today)
        .single()

      if (!calendarDay) {
        setNoSession(true)
        setLoading(false)
        return
      }

      // Obtener el nivel del estudiante
      const { data: progress } = await supabase
        .from('student_reading_progress')
        .select('current_level')
        .eq('student_id', profile.id)
        .single()

      const level = progress?.current_level ?? 'escriba'

      // Buscar el texto del día
      const { data: text } = await supabase
        .from('reading_texts')
        .select('*')
        .eq('week_number', calendarDay.week_number)
        .eq('day_of_week', calendarDay.day_of_week)
        .eq('is_active', true)
        .single()

      if (!text) {
        setNoSession(true)
        setLoading(false)
        return
      }

      setSessionText({
        ...text,
        vocabulary: typeof text.vocabulary === 'string'
          ? JSON.parse(text.vocabulary)
          : text.vocabulary ?? [],
      })
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

  if (noSession) {
    return (
      <div className="min-h-screen bg-sepia-100 flex items-center justify-center p-6">
        <div className="max-w-sm w-full text-center">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 9v7.5" />
            </svg>
          </div>
          <h2 className="font-display text-xl font-bold text-ink-800 mb-2">
            Hoy no hay sesión
          </h2>
          <p className="font-body text-ink-500 text-sm mb-6">
            Hoy es un día de descanso o no hay clase programada. Vuelve el próximo día de clases.
          </p>
          <button
            onClick={() => navigate('/student')}
            className="bg-teal-600 text-white font-body font-semibold px-6 py-3 rounded-xl hover:bg-teal-500 transition-colors"
          >
            Volver al inicio
          </button>
        </div>
      </div>
    )
  }

  if (!sessionText) return null

  return (
    <div>
      {step === 'warmup' && (
        <SessionWarmup
          onComplete={() => setStep('reading')}
        />
      )}
      {step === 'reading' && (
        <SessionReading
          text={sessionText}
          onComplete={(blob, words) => {
            setAudioBlob(blob)
            setWordsRead(words)
            setStep('questions')
          }}
        />
      )}
      {step === 'questions' && (
        <SessionQuestions
          textId={sessionText.id}
          onComplete={(ans, score) => {
            setAnswers(ans)
            setComprehensionScore(score)
            setStep('close')
          }}
        />
      )}
      {step === 'close' && (
        <SessionClose
          text={sessionText}
          wordsRead={wordsRead}
          comprehensionScore={comprehensionScore}
          answers={answers}
          audioBlob={audioBlob}
        />
      )}
    </div>
  )
}