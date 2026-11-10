// PDA (Fase 6): catálogo, etiquetas por lectura y reglas simples. Solo docentes.
import { supabase } from './supabase'

export type PdaGrade = 1 | 2 | 3

export interface Pda {
  id: string
  code: string
  campo: string
  disciplina: string
  contenido_code: string
  contenido_text: string | null
  /** null = aplica a los tres grados */
  grade: PdaGrade | null
  text: string
  position: number
}

export const CAMPOS: { campo: string; disciplinas: string[] }[] = [
  { campo: 'Lenguajes', disciplinas: ['Español', 'Inglés', 'Artes'] },
  { campo: 'Saberes y pensamiento científico', disciplinas: ['Matemáticas', 'Biología', 'Física', 'Química'] },
  { campo: 'Ética, naturaleza y sociedades', disciplinas: ['Geografía', 'Historia', 'Formación Cívica y Ética'] },
  { campo: 'De lo humano y lo comunitario', disciplinas: ['Tecnología', 'Educación socioemocional', 'Educación física'] },
]

export const ALL_DISCIPLINAS = CAMPOS.flatMap(c => c.disciplinas)

/** Orden oficial: campo, disciplina y posición en el catálogo. */
export function comparePda(a: Pda, b: Pda): number {
  const ia = ALL_DISCIPLINAS.indexOf(a.disciplina)
  const ib = ALL_DISCIPLINAS.indexOf(b.disciplina)
  return ia - ib || a.position - b.position
}

export function pdaGradesCovered(pdas: { grade: PdaGrade | null }[]): Set<PdaGrade> {
  const s = new Set<PdaGrade>()
  for (const p of pdas) {
    if (p.grade === null) { s.add(1); s.add(2); s.add(3) } else s.add(p.grade)
  }
  return s
}

/** Avisos al asignar: grados presentes en los grupos que la lectura no cubre. */
export function missingGradeWarnings(pdas: { grade: PdaGrade | null }[], gradesPresent: PdaGrade[]): string[] {
  if (pdas.length === 0) return ['Esta lectura no tiene PDA; no sumará al cumplimiento']
  const covered = pdaGradesCovered(pdas)
  return [...new Set(gradesPresent)].sort().filter(g => !covered.has(g))
    .map(g => `Esta lectura no tiene PDA de ${g}°; tus estudiantes de ${g}° la leerán, pero no sumará a su cumplimiento`)
}

let catalogCache: Promise<Pda[]> | null = null

/** Todo el catálogo (unos 600 PDA), una vez por sesión. */
export function fetchPdaCatalog(): Promise<Pda[]> {
  if (!catalogCache) {
    catalogCache = (async () => {
      const out: Pda[] = []
      for (let from = 0; ; from += 1000) {
        const { data, error } = await supabase.from('lec_pda').select('*').order('position').range(from, from + 999)
        if (error) throw error
        out.push(...((data ?? []) as Pda[]))
        if (!data || data.length < 1000) break
      }
      return out.sort(comparePda)
    })().catch(err => {
      catalogCache = null
      throw err
    })
  }
  return catalogCache
}

export async function fetchReadingPdas(readingId: string): Promise<Pda[]> {
  const { data, error } = await supabase.from('lec_reading_pdas').select('lec_pda(*)').eq('reading_id', readingId)
  if (error) throw error
  type Row = { lec_pda: Pda | Pda[] | null }
  return ((data ?? []) as unknown as Row[])
    .map(r => (Array.isArray(r.lec_pda) ? r.lec_pda[0] : r.lec_pda))
    .filter((p): p is Pda => !!p)
    .sort(comparePda)
}

export async function setReadingPdas(readingId: string, pdaIds: string[], userId: string | null): Promise<void> {
  const { data, error } = await supabase.from('lec_reading_pdas').select('pda_id').eq('reading_id', readingId)
  if (error) throw error
  const current = new Set(((data ?? []) as { pda_id: string }[]).map(r => r.pda_id))
  const wanted = new Set(pdaIds)
  const toRemove = [...current].filter(id => !wanted.has(id))
  const toAdd = [...wanted].filter(id => !current.has(id))
  if (toRemove.length) {
    const { error: e } = await supabase.from('lec_reading_pdas').delete().eq('reading_id', readingId).in('pda_id', toRemove)
    if (e) throw e
  }
  if (toAdd.length) {
    const { error: e } = await supabase.from('lec_reading_pdas').insert(toAdd.map(pda_id => ({ reading_id: readingId, pda_id, added_by: userId })))
    if (e) throw e
  }
}
