import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import DiagnosticIntro from './DiagnosticIntro'
import DiagnosticReading from './DiagnosticReading'
import DiagnosticQuestions from './DiagnosticQuestions'
import DiagnosticResult from './DiagnosticResult'

type DiagnosticStep = 'intro' | 'reading' | 'questions' | 'result'

interface Answer {
  questionId: string
  given: string
  correct: boolean
  points: number
}

export default function DiagnosticPage() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState<DiagnosticStep>('intro')
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [wordsRead, setWordsRead] = useState(0)
  const [comprehensionScore, setComprehensionScore] = useState(0)
  const [answers, setAnswers] = useState<Answer[]>([])
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    async function checkDiagnostic() {
      if (!profile?.id) return
      const { data } = await supabase
        .from('student_reading_progress')
        .select('diagnostic_date')
        .eq('student_id', profile.id)
        .single()

      if (data?.diagnostic_date) {
        navigate('/student', { replace: true })
      } else {
        setChecking(false)
      }
    }
    checkDiagnostic()
  }, [profile?.id])

  if (checking) {
    return (
      <div className="min-h-screen bg-sepia-100 flex items-center justify-center">
        <div className="spinner mx-auto" />
      </div>
    )
  }

  const handleReadingComplete = (blob: Blob, words: number) => {
    setAudioBlob(blob)
    setWordsRead(words)
    setStep('questions')
  }

  const handleQuestionsComplete = (ans: Answer[], score: number) => {
    setAnswers(ans)
    setComprehensionScore(score)
    setStep('result')
  }

  return (
    <div>
      {step === 'intro' && (
        <DiagnosticIntro onComplete={() => setStep('reading')} />
      )}
      {step === 'reading' && (
        <DiagnosticReading onComplete={handleReadingComplete} />
      )}
      {step === 'questions' && (
        <DiagnosticQuestions onComplete={handleQuestionsComplete} />
      )}
      {step === 'result' && (
        <DiagnosticResult
          wordsRead={wordsRead}
          comprehensionScore={comprehensionScore}
          answers={answers}
          audioBlob={audioBlob}
        />
      )}
    </div>
  )
}