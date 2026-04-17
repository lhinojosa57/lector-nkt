import { useState } from 'react'
import DiagnosticIntro from './DiagnosticIntro'
import DiagnosticReading from './DiagnosticReading'

type DiagnosticStep = 'intro' | 'reading' | 'questions' | 'result'

export default function DiagnosticPage() {
  const [step, setStep] = useState<DiagnosticStep>('intro')
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [wordsRead, setWordsRead] = useState(0)

  const handleReadingComplete = (blob: Blob, words: number) => {
    setAudioBlob(blob)
    setWordsRead(words)
    setStep('questions')
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
        <div className="min-h-screen bg-sepia-100 flex items-center justify-center">
          <p className="text-ink-600 font-body">Preguntas — próximamente</p>
        </div>
      )}
      {step === 'result' && (
        <div className="min-h-screen bg-sepia-100 flex items-center justify-center">
          <p className="text-ink-600 font-body">Resultado — próximamente</p>
        </div>
      )}
    </div>
  )
}