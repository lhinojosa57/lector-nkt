import { describe, it, expect } from 'vitest'
import { buildConcentradoRows, concentradoFileName } from './concentrado'
import type { Pda } from './pda'

const p = (id: string, disciplina: string, campo: string, grade: 1 | 2 | 3 | null, position: number): Pda =>
  ({ id, code: `X.${id}`, campo, disciplina, contenido_code: 'X.C1', contenido_text: 'Contenido', grade, text: `Texto ${id}`, position })

const catalog = [
  p('h1', 'Historia', 'Ética, naturaleza y sociedades', 1, 500),
  p('e1', 'Español', 'Lenguajes', 1, 1),
  p('e2', 'Español', 'Lenguajes', 2, 2),
  p('m0', 'Matemáticas', 'Saberes y pensamiento científico', null, 200),
  p('ef', 'Educación física', 'De lo humano y lo comunitario', 1, 600),
]

describe('buildConcentradoRows', () => {
  it('sin asignaciones: todos pendientes, en orden de campos, solo el grado y disciplinas elegidas', () => {
    const rows = buildConcentradoRows(catalog, new Map(), 1, ['Español', 'Matemáticas', 'Historia'])
    expect(rows.map(r => r.pdaCode)).toEqual(['X.e1', 'X.m0', 'X.h1'])
    expect(rows.every(r => r.estado === 'Pendiente por trabajar')).toBe(true)
    expect(rows[0]).toMatchObject({ campo: 'Lenguajes', disciplina: 'Español', contenido: 'X.C1 · Contenido', lecturas: '', completaron: '', comprension: null })
  })
  it('con evidencia', () => {
    const statuses = new Map([['e1', {
      state: 'logro' as const,
      evidence: [
        { assignmentId: 'a', readingTitle: 'El fuego', date: '2026-11-03T16:00:00Z', state: 'abordado' as const, completed: 3, total: 5, avg: 70 },
        { assignmentId: 'b', readingTitle: 'El agua', date: '2026-11-08T16:00:00Z', state: 'logro' as const, completed: 4, total: 5, avg: 90 },
      ],
    }]])
    const [row] = buildConcentradoRows(catalog, statuses, 1, ['Español'])
    expect(row).toMatchObject({ estado: 'Con evidencia de logro', lecturas: 'El fuego (03/11/2026); El agua (08/11/2026)', completaron: '7 de 10', comprension: 80 })
  })
})

describe('concentradoFileName', () => {
  it('sin acentos ni espacios', () => {
    expect(concentradoFileName('1° A Virtual', 1, 'Trimestre 1')).toBe('concentrado-1-a-virtual-1o-trimestre-1.xlsx')
  })
})
