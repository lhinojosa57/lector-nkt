import { useState } from 'react'
import DiagnosticIntro from './DiagnosticIntro'

type DiagnosticStep = 'intro' | 'reading' | 'questions' | 'result'

export default function DiagnosticPage() {
  const [step, setStep] = useState<DiagnosticStep>('intro')

  return (
    <div>
      {step === 'intro' && (
        <DiagnosticIntro onComplete={() => setStep('reading')} />
      )}
      {step === 'reading' && (
        <div className="min-h-screen bg-ink-900 flex items-center justify-center">
          <p className="text-parchment-200 font-body">Lectura — próximamente</p>
        </div>
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