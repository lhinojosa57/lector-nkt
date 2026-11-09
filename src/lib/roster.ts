/** Grados y listas pegadas (correo, grado) para la pestaña Estudiantes. */

export type Grade = 1 | 2 | 3
export type EnrollmentStatus = 'activo' | 'baja' | 'egresado'

const WORDS: Record<string, Grade> = {
  primero: 1, primer: 1, septimo: 1,
  segundo: 2, octavo: 2,
  tercero: 3, tercer: 3, noveno: 3,
}

/** Acepta 1-3, 7-9 (7° = 1°), "1°", "2º", "9o", "Primero", "Segundo grado", etc. */
export function parseGrade(raw: string): Grade | null {
  const s = raw
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[°º]/g, '')
    .replace(/(\d)o\b/g, '$1')
    .replace(/\bgrado\b/g, '')
    .trim()
  if (!s) return null
  if (/^\d+$/.test(s)) {
    const n = Number(s)
    if (n >= 1 && n <= 3) return n as Grade
    if (n >= 7 && n <= 9) return (n - 6) as Grade
    return null
  }
  return WORDS[s] ?? null
}

export function formatGrade(g: Grade | null): string {
  return g ? `${g}°` : '—'
}

export interface PasteResult {
  rows: { email: string; grade: Grade | null }[]
  invalid: { line: number; text: string }[]
}

/** Interpreta texto pegado de Excel, Classroom o a mano: una fila por línea. */
export function parseRosterPaste(text: string): PasteResult {
  const byEmail = new Map<string, Grade | null>()
  const invalid: PasteResult['invalid'] = []
  const lines = text.split(/\r?\n/)
  let seenContent = false

  lines.forEach((raw, i) => {
    const line = raw.trim()
    if (!line) return
    const isFirst = !seenContent
    seenContent = true
    const sep = line.search(/[\t,;]/)
    const first = (sep === -1 ? line : line.slice(0, sep)).trim()
    const second = sep === -1 ? '' : line.slice(sep + 1).trim()

    if (!first.includes('@')) {
      if (isFirst && !line.includes('@')) return // encabezado
      invalid.push({ line: i + 1, text: raw.replace(/\r$/, '') })
      return
    }
    let grade: Grade | null = null
    if (second) {
      grade = parseGrade(second)
      if (grade === null) {
        invalid.push({ line: i + 1, text: raw.replace(/\r$/, '') })
        return
      }
    }
    const email = first.toLowerCase()
    byEmail.delete(email) // la última gana y conserva el orden de su aparición
    byEmail.set(email, grade)
  })

  return { rows: [...byEmail].map(([email, grade]) => ({ email, grade })), invalid }
}
