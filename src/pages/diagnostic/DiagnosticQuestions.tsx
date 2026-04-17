import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'

interface Question {
  id: string
  question_text: string
  question_level: string
  options: { id: string; text: string }[]
  correct_answer: string
  explanation: string
  points: number
  order_index: number
}

interface Answer {
  questionId: string
  given: string
  correct: boolean
  points: number
}

interface Props {
  onComplete: (answers: Answer[], score: number) => void
}

const LEVEL_LABELS: Record<string, string> = {
  literal: 'Comprensión literal',
  inferencial: 'Comprensión inferencial',
  critica: 'Comprensión crítica',
  idea_principal: 'Idea principal',
}

const LEVEL_COLORS: Record<string, string> = {
  literal: 'bg-teal-900 text-teal-300',
  inferencial: 'bg-blue-900 text-blue-300',
  critica: 'bg-amber-900 text-amber-300',
  idea_principal: 'bg-purple-900 text-purple-300',
}

export default function DiagnosticQuestions({ onComplete }: Props) {
  const { profile } = useAuth()
  const [questions, setQuestions] = useState<Question[]>([])
  const [current, setCurrent] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [answers, setAnswers] = useState<Answer[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('reading_questions')
        .select('*')
        .eq('text_id', '98c0dbf4-7911-4025-a3bc-31ba4e83e9c0')
        .order('order_index')
      setQuestions(data ?? [])
      setLoading(false)
    }
    load()
  }, [])

  const question = questions[current]

  const handleSubmit = () => {
    if (!selected || !question) return
    const isCorrect = selected === question.correct_answer
    const newAnswer: Answer = {
      questionId: question.id,
      given: selected,
      correct: isCorrect,
      points: isCorrect ? question.points : 0,
    }
    setAnswers(prev => [...prev, newAnswer])
    setSubmitted(true)
  }

  const handleNext = () => {
    const allAnswers = [...answers]
    if (current >= questions.length - 1) {
      const totalPoints = allAnswers.reduce((sum, a) => sum + a.points, 0)
      const maxPoints = questions.reduce((sum, q) => sum + q.points, 0)
      const score = Math.round((totalPoints / maxPoints) * 100)
      onComplete(allAnswers, score)
    } else {
      setCurrent(c => c + 1)
      setSelected(null)
      setSubmitted(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-sepia-100 flex items-center justify-center">
        <div className="spinner mx-auto" />
      </div>
    )
  }

  if (!question) return null

  const isCorrect = selected === question.correct_answer
  const progressPct = ((current) / questions.length) * 100

  return (
    <div className="min-h-screen bg-sepia-100 flex flex-col">
      
      {/* Top bar */}
      <div className="bg-parchment-50 border-b border-parchment-200">
        <div className="max-w-2xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-3">
            <p className="font-display font-semibold text-ink-800">Preguntas de comprensión</p>
            <span className="font-mono text-sm text-ink-500">
              {current + 1} / {questions.length}
            </span>
          </div>
          <div className="h-1.5 bg-parchment-200 rounded-full">
            <div
              className="h-1.5 bg-teal-500 rounded-full transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Contenido */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-2xl w-full">
          
          {/* Badge de tipo */}
          <div className="mb-4">
            <span className={`text-xs font-mono px-3 py-1.5 rounded-full font-medium ${LEVEL_COLORS[question.question_level] || 'bg-gray-800 text-gray-300'}`}>
              {LEVEL_LABELS[question.question_level] || question.question_level}
            </span>
          </div>

          {/* Pregunta */}
          <h2 className="font-display text-xl font-bold text-ink-900 mb-6 leading-snug">
            {question.question_text}
          </h2>

          {/* Opciones */}
          <div className="space-y-3 mb-6">
            {question.options?.map(opt => {
              let style = 'bg-parchment-50 border-parchment-300 text-ink-700 hover:border-teal-400 hover:bg-teal-50'
              if (submitted) {
                if (opt.id === question.correct_answer) {
                  style = 'bg-teal-50 border-teal-500 text-teal-800'
                } else if (opt.id === selected && !isCorrect) {
                  style = 'bg-red-50 border-red-400 text-red-800'
                } else {
                  style = 'bg-parchment-50 border-parchment-200 text-ink-400'
                }
              } else if (selected === opt.id) {
                style = 'bg-teal-50 border-teal-500 text-teal-800'
              }

              return (
                <button
                  key={opt.id}
                  onClick={() => !submitted && setSelected(opt.id)}
                  disabled={submitted}
                  className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all duration-150 ${style}`}
                >
                  <span className="font-mono text-sm font-bold w-6 flex-shrink-0">
                    {opt.id.toUpperCase()})
                  </span>
                  <span className="font-body text-sm leading-snug">{opt.text}</span>
                  {submitted && opt.id === question.correct_answer && (
                    <span className="ml-auto text-teal-600 font-bold">✓</span>
                  )}
                  {submitted && opt.id === selected && !isCorrect && (
                    <span className="ml-auto text-red-500 font-bold">✗</span>
                  )}
                </button>
              )
            })}
          </div>

          {/* Retroalimentación */}
          {submitted && (
            <div className={`rounded-xl p-4 mb-6 border ${isCorrect ? 'bg-teal-50 border-teal-200' : 'bg-red-50 border-red-200'}`}>
              <p className={`font-body font-semibold mb-1 ${isCorrect ? 'text-teal-700' : 'text-red-700'}`}>
                {isCorrect ? '✓ Correcto' : '✗ Incorrecto'}
              </p>
              <p className="font-body text-sm text-ink-600 leading-relaxed">
                {question.explanation}
              </p>
            </div>
          )}

          {/* Botones */}
          {!submitted ? (
            <button
              onClick={handleSubmit}
              disabled={!selected}
              className="w-full bg-ink-800 text-parchment-100 font-body font-semibold py-4 rounded-xl hover:bg-ink-900 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Responder
            </button>
          ) : (
            <button
              onClick={handleNext}
              className="w-full bg-teal-600 text-white font-body font-semibold py-4 rounded-xl hover:bg-teal-500 transition-colors"
            >
              {current >= questions.length - 1 ? 'Ver mi resultado →' : 'Siguiente pregunta →'}
            </button>
          )}

        </div>
      </div>
    </div>
  )
}