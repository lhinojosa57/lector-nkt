import { useState } from 'react'
import DiagnosticIntro from './DiagnosticIntro'
import DiagnosticReading from './DiagnosticReading'
import DiagnosticQuestions from './DiagnosticQuestions'

type DiagnosticStep = 'intro' | 'reading' | 'questions' | 'result'

interface Answer {
  questionId: string
  given: string
  correct: boolean
  points: number
}

export default function DiagnosticPage() {
  const [step, setStep] = useState<DiagnosticStep>('intro')
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [wordsRead, setWordsRead] = useState(0)
  const [comprehensionScore, setComprehensionScore] = useState(0)
  const [answers, setAnswers] = useState<Answer[]>([])

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
        <div className="min-h-screen bg-sepia-100 flex items-center justify-center">
          <div className="text-center">
            <p className="text-ink-600 font-body text-lg">Comprensión: {comprehensionScore}%</p>
            <p className="text-ink-400 font-body text-sm mt-2">Resultado completo — próximamente</p>
          </div>
        </div>
      )}
    </div>
  )
}