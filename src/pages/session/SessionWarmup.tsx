interface Props {
  onComplete: () => void
}

const WARMUPS = [
  {
    day: 1,
    type: 'Campo visual',
    instruction: 'Lee cada columna de arriba a abajo en un solo golpe de vista. No pronuncies las palabras — solo reconócelas.',
    columns: [
      ['México', 'historia', 'cultura', 'pueblo', 'tierra'],
      ['nueva españa', 'vida diaria', 'pueblo indígena', 'ciudad real', 'gran mercado'],
      ['comercio en plaza', 'trabajo de campo', 'lengua y escritura', 'arte colonial nuevo', 'mezcla de culturas'],
    ]
  },
  {
    day: 2,
    type: 'Velocidad de reconocimiento',
    instruction: 'Lee cada palabra tan rápido como puedas. No te detengas — confía en tu primer instinto.',
    words: ['fotosíntesis','civilización','independencia','revolución','democracia','continente','ecosistema','atmósfera','gravitación','electricidad','microscópico','biodiversidad']
  },
  {
    day: 3,
    type: 'Vocabulario del día',
    instruction: 'Lee cada palabra, su definición y el ejemplo. Intenta memorizarlas — aparecerán en el texto de hoy.',
    vocab: [
      { word: 'mandarín', def: 'Variedad del chino hablada en el norte de China.', example: 'El mandarín es el idioma oficial de China.' },
      { word: 'carácter', def: 'Símbolo de la escritura china que representa una idea.', example: 'Aprendió 100 caracteres chinos en un mes.' },
      { word: 'hablante', def: 'Persona que habla un idioma.', example: 'Hay 500 millones de hablantes de español.' },
    ]
  },
  {
    day: 4,
    type: 'Movimiento ocular',
    instruction: 'Sigue el punto con los ojos sin mover la cabeza. Intenta anticiparte a su posición.',
    durations: [800, 700, 600, 500, 400]
  },
  {
    day: 5,
    type: 'Repaso de la semana',
    instruction: 'Lee cada palabra en voz alta. ¿Recuerdas qué significa?',
    words: ['mandarín', 'creatividad', 'renovable', 'castellano', 'consentimiento']
  },
]

export default function SessionWarmup({ onComplete }: Props) {
  const dayOfWeek = new Date().getDay() || 1
  const warmup = WARMUPS.find(w => w.day === dayOfWeek) ?? WARMUPS[0]

  return (
    <div className="min-h-screen bg-ink-900 flex flex-col">
      <div className="flex items-center justify-between px-6 py-4 border-b border-ink-700">
        <div>
          <p className="font-display text-parchment-100 font-semibold">Calentamiento</p>
          <p className="text-ink-400 text-xs font-body mt-0.5">{warmup.type} · 2 minutos</p>
        </div>
        <span className="font-mono text-xs text-ink-500">1 / 4</span>
      </div>

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-lg w-full">

          <p className="font-body text-parchment-300 text-sm text-center mb-8 leading-relaxed">
            {warmup.instruction}
          </p>

          {/* Campo visual */}
          {'columns' in warmup && warmup.columns && (
            <div className="bg-ink-800 rounded-xl p-6 border border-ink-700 mb-8">
              <div className="flex justify-around gap-4">
                {warmup.columns.map((col, ci) => (
                  <div key={ci} className={`text-center ${ci === 1 ? 'border-x border-ink-600 px-4' : ''}`}>
                    {ci > 0 && <p className="font-mono text-xs text-ink-500 mb-2">{ci + 1} palabras</p>}
                    {col.map((w, wi) => (
                      <p key={wi} className="font-body text-parchment-200 text-sm leading-loose">{w}</p>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Velocidad / Repaso */}
          {'words' in warmup && warmup.words && (
            <div className="bg-ink-800 rounded-xl p-6 border border-ink-700 mb-8">
              <div className="flex flex-wrap gap-3 justify-center">
                {warmup.words.map((w, i) => (
                  <span key={i} className="bg-ink-700 text-parchment-200 font-body px-3 py-1.5 rounded-lg text-sm">
                    {w}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Vocabulario */}
          {'vocab' in warmup && warmup.vocab && (
            <div className="space-y-3 mb-8">
              {warmup.vocab.map((v, i) => (
                <div key={i} className="bg-ink-800 rounded-xl p-4 border border-ink-700">
                  <p className="font-display text-teal-400 font-bold text-lg mb-1">{v.word}</p>
                  <p className="font-body text-parchment-300 text-sm mb-1">{v.def}</p>
                  <p className="font-body text-ink-400 text-xs italic">"{v.example}"</p>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={onComplete}
            className="w-full bg-teal-600 text-white font-body font-semibold py-4 rounded-xl hover:bg-teal-500 transition-colors"
          >
            Listo, continuar →
          </button>

        </div>
      </div>
    </div>
  )
}