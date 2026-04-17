import { useState, useEffect } from 'react'

const slides = [
  {
    time: '70,000 a.C.',
    title: 'El Gran Salto Cognitivo',
    body: 'Algo cambió en el cerebro humano. Nadie sabe exactamente qué fue. Pero de repente, los humanos pudieron hablar de cosas que no existían: el pasado, el futuro, los dioses, los sueños.',
    color: 'from-stone-900 to-stone-800',
  },
  {
    time: '40,000 a.C.',
    title: 'Los primeros símbolos',
    body: 'En las paredes de las cuevas aparecieron los primeros trazos. Los humanos comenzaron a externalizar su mente — a sacar sus pensamientos del cerebro y ponerlos en el mundo.',
    color: 'from-stone-800 to-amber-950',
  },
  {
    time: '3,200 a.C.',
    title: 'La escritura sumeria',
    body: 'Por primera vez en la historia, el conocimiento sobrevivió a su portador. Cuando un anciano moría, ya no se perdía una biblioteca entera. Las ideas podían vivir para siempre.',
    color: 'from-amber-950 to-amber-900',
  },
  {
    time: 'Hoy',
    title: 'Tú',
    body: 'Con la capacidad de conectarte con la mente de alguien que murió hace 2,000 años. Simplemente porque aprendes a leer mejor.',
    color: 'from-teal-900 to-teal-800',
  },
  {
    time: '',
    title: 'Leer no es una habilidad escolar.',
    body: 'Es el superpoder más antiguo de la humanidad. Hoy empiezas a entrenarlo.',
    color: 'from-teal-800 to-teal-700',
    isFinal: true,
  },
]

interface Props {
  onComplete: () => void
}

export default function DiagnosticIntro({ onComplete }: Props) {
  const [current, setCurrent] = useState(0)
  const [visible, setVisible] = useState(true)

  const next = () => {
    if (current === slides.length - 1) {
      onComplete()
      return
    }
    setVisible(false)
    setTimeout(() => {
      setCurrent(c => c + 1)
      setVisible(true)
    }, 400)
  }

  useEffect(() => {
    setVisible(true)
  }, [current])

  const slide = slides[current]

  return (
    <div className={`min-h-screen bg-gradient-to-b ${slide.color} flex items-center justify-center p-6 transition-colors duration-700`}>
      <div className={`max-w-lg w-full text-center transition-opacity duration-400 ${visible ? 'opacity-100' : 'opacity-0'}`}>
        
        {slide.time && (
          <p className="font-mono text-sm text-white/50 uppercase tracking-widest mb-6">
            {slide.time}
          </p>
        )}

        <h1 className={`font-display font-bold text-white mb-6 leading-tight ${slide.isFinal ? 'text-3xl' : 'text-4xl'}`}>
          {slide.title}
        </h1>

        <p className="font-body text-white/80 text-lg leading-relaxed mb-12">
          {slide.body}
        </p>

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2 mb-10">
          {slides.map((_, i) => (
            <div
              key={i}
              className={`rounded-full transition-all duration-300 ${
                i === current
                  ? 'w-6 h-2 bg-white'
                  : i < current
                  ? 'w-2 h-2 bg-white/60'
                  : 'w-2 h-2 bg-white/20'
              }`}
            />
          ))}
        </div>

        <button
          onClick={next}
          className="bg-white text-stone-900 font-body font-semibold px-10 py-4 rounded-full hover:bg-white/90 transition-all duration-200 text-lg"
        >
          {current === slides.length - 1 ? 'Comenzar diagnóstico →' : 'Continuar →'}
        </button>

        <p className="text-white/30 text-xs font-mono mt-6">
          {current + 1} / {slides.length}
        </p>
      </div>
    </div>
  )
}