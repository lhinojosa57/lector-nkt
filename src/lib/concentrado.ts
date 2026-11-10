// "Concentrado de avance del Programa Sintético": filas por grado (diseño 6.7).
import { formatDate } from './lec'
import { localDate } from './assignmentRules'
import { comparePda, type Pda, type PdaGrade } from './pda'
import { STATE_LABEL, type PdaStatusMap } from './pdaProgress'
import { fold } from './teacherShelves'

export interface ConcentradoRow {
  campo: string
  disciplina: string
  contenido: string
  pdaCode: string
  pdaText: string
  estado: string
  lecturas: string
  completaron: string
  comprension: number | null
}

/** Todos los PDA del grado (incluye los "sin grado") de las disciplinas elegidas, en orden oficial. */
export function buildConcentradoRows(catalog: Pda[], statuses: PdaStatusMap, grade: PdaGrade, disciplinas: string[]): ConcentradoRow[] {
  return catalog
    .filter(p => (p.grade === null || p.grade === grade) && disciplinas.includes(p.disciplina))
    .sort(comparePda)
    .map(p => {
      const s = statuses.get(p.id)
      const ev = s?.evidence ?? []
      const done = ev.reduce((n, e) => n + e.completed, 0)
      const total = ev.reduce((n, e) => n + e.total, 0)
      const avgs = ev.map(e => e.avg).filter((x): x is number => x !== null)
      return {
        campo: p.campo,
        disciplina: p.disciplina,
        contenido: `${p.contenido_code} · ${p.contenido_text ?? ''}`.trim(),
        pdaCode: p.code,
        pdaText: p.text,
        estado: STATE_LABEL[s?.state ?? 'pendiente'],
        lecturas: ev.map(e => `${e.readingTitle} (${formatDate(localDate(e.date))})`).join('; '),
        completaron: ev.length ? `${done} de ${total}` : '',
        comprension: avgs.length ? Math.round((avgs.reduce((a, b) => a + b, 0) / avgs.length) * 10) / 10 : null,
      }
    })
}

const slug = (s: string) => fold(s).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

/** Con varios grados (grado null) el nombre no lleva grado. */
export function concentradoFileName(grupo: string, grado: PdaGrade | null, periodo: string, ext: 'xlsx' | 'pdf' = 'xlsx'): string {
  return ['concentrado', slug(grupo), grado ? `${grado}o` : '', slug(periodo)].filter(Boolean).join('-') + `.${ext}`
}
