/** Cálculos de fluidez y criterios de interpretación (Betts / escala NAEP de fluidez oral). */

/** Divide el texto en palabras; las posiciones de error se guardan sobre esta lista. */
export function tokenizeWords(body: string): string[] {
  return body.split(/\s+/).filter(Boolean)
}

export function fluencyMetrics(wordsRead: number, errors: number, seconds: number) {
  const correct = Math.max(0, wordsRead - errors)
  const wcpm = seconds > 0 ? Math.round((correct * 60) / seconds) : 0
  const accuracy = wordsRead > 0 ? Math.round((correct / wordsRead) * 1000) / 10 : 0
  return { correct, wcpm, accuracy }
}

/** Nivel de precisión según Betts (lectura en voz alta). */
export function accuracyBand(accuracy: number): { label: string; tone: 'green' | 'yellow' | 'red' } {
  if (accuracy >= 98) return { label: 'Independiente: el texto le resulta fácil', tone: 'green' }
  if (accuracy >= 95) return { label: 'Instruccional: nivel adecuado para practicar', tone: 'green' }
  if (accuracy >= 90) return { label: 'En el límite: puede necesitar apoyo', tone: 'yellow' }
  return { label: 'Frustración: el texto le resulta difícil', tone: 'red' }
}

/** Escala de expresión (adaptada de la escala de fluidez oral de NAEP, 4 niveles). */
export const EXPRESSION_LEVELS = [
  { value: 1, label: 'Palabra por palabra', hint: 'Lee palabra por palabra, sin agrupar ni respetar signos.' },
  { value: 2, label: 'Grupos cortos', hint: 'Agrupa de dos en dos palabras; pocas pausas con sentido.' },
  { value: 3, label: 'Frases con sentido', hint: 'Lee por frases; respeta la mayoría de los signos, con poca expresión.' },
  { value: 4, label: 'Fluida y expresiva', hint: 'Lee por frases con sentido, respeta los signos y da entonación.' },
]
