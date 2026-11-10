import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
// @ts-expect-error módulo .mjs sin tipos
import { parsePdaCatalog } from './pdaParse.mjs'

type P = { code: string; campo: string; disciplina: string; contenido_code: string; contenido_text: string | null; grade: number | null; text: string }
const parse = (t: string) => parsePdaCatalog(t) as { pdas: P[]; warnings: string[] }

const SAMPLE = [
  '# L. Lenguaje',
  '',
  '## E.Español',
  '',
  'C. Contenidos  ',
  'G1. 1er grado  ',
  'L.E.C1. La diversidad de lenguas y su uso  ',
  'L.E.C1.G2. Comprende las características.  ',
  'L.E.C1.G2. Comprende las características.  ',
  'L.E.C1.G2. Otra redacción distinta.  ',
  '# F. FÍSICA',
  'S. Saberes y pensamiento científico',
  'S.M.C2. Extensión de los números.  ',
  'S.M.C2.G1.b Compara y ordena números con signo.  ',
  'E.H.C1. Historia de Mesoamérica.  ',
  'E.H.C1.ñ.G1. Reconstruye aspectos de la vida cotidiana.  ',
  'H.ESE.C3. Contenido socioemocional.  ',
  'H.ESE.b.C3.Reconoce nuevos intereses, habilidades y necesidades.  ',
  'H.EF.C1. Capacidades, habilidades y destrezas motrices.  ',
  'H.EF.a.C1. Capacidades, habilidades y destrezas motrices.  ',
].join('\n')

describe('parsePdaCatalog', () => {
  const { pdas, warnings } = parse(SAMPLE)
  const by = (code: string) => pdas.filter(p => p.code === code)

  it('PDA de Español con grado, campo y contenido', () => {
    expect(by('L.E.C1.G2')[0]).toMatchObject({ grade: 2, campo: 'Lenguajes', disciplina: 'Español', contenido_code: 'L.E.C1', contenido_text: 'La diversidad de lenguas y su uso' })
  })
  it('duplicado exacto se descarta; mismo código con otro texto se conserva', () => {
    expect(by('L.E.C1.G2')).toHaveLength(2)
  })
  it('código con sufijo y espacio', () => {
    expect(by('S.M.C2.G1.b')[0]).toMatchObject({ grade: 1, disciplina: 'Matemáticas', campo: 'Saberes y pensamiento científico' })
  })
  it('segmento ñ fuera del contenido', () => {
    expect(by('E.H.C1.ñ.G1')[0]).toMatchObject({ contenido_code: 'E.H.C1', grade: 1, disciplina: 'Historia' })
  })
  it('PDA sin grado y sin espacio después del código', () => {
    expect(by('H.ESE.b.C3')[0]).toMatchObject({ grade: null, contenido_code: 'H.ESE.C3', text: 'Reconoce nuevos intereses, habilidades y necesidades.', disciplina: 'Educación socioemocional' })
  })
  it('línea igual a su contenido no es PDA; encabezados no rompen', () => {
    expect(pdas.filter(p => p.code.startsWith('H.EF'))).toHaveLength(0)
    expect(warnings).toEqual([])
  })
  it('sufijos de dos letras (aa, ab)', () => {
    const r = parse('E.H.C5. Contenido.\nE.H.C5.aa.G2. Comprende la noción de territorio.')
    expect(r.pdas[0]).toMatchObject({ code: 'E.H.C5.aa.G2', grade: 2, contenido_code: 'E.H.C5', contenido_text: 'Contenido.' })
  })
  it('dos renglones pegados en una línea se separan', () => {
    const r = parse('E.H.C4. Las revoluciones modernas y sus tendencias.E.H.C4.a.G2. Establece las características.\nE.H.C4. Las revoluciones modernas y sus tendencias.')
    expect(r.pdas).toHaveLength(1)
    expect(r.pdas[0]).toMatchObject({ code: 'E.H.C4.a.G2', grade: 2, contenido_text: 'Las revoluciones modernas y sus tendencias.' })
  })
  it('errata de la línea 226', () => {
    const lines = Array.from({ length: 230 }, () => '')
    lines[223] = 'S.M.C2. Extensión de los números a positivos y negativos y su orden.'
    lines[225] = 'S.M.C1.G1. Reconoce la necesidad de los números negativos a partir de usar cantidades.'
    expect(parse(lines.join('\n')).pdas[0].code).toBe('S.M.C2.G1')
  })

  const real = 'C:/Users/laris/NKT/NKT-CS/raw/Catalogo-de-PDAs.md'
  it.skipIf(!existsSync(real))('archivo real: sin warnings y 13 disciplinas', () => {
    const r = parse(readFileSync(real, 'utf8'))
    expect(r.warnings).toEqual([])
    const ds = new Set(r.pdas.map(p => p.disciplina))
    expect(ds.size).toBe(13)
    expect(r.pdas.filter(p => p.disciplina === 'Español').every(p => p.campo === 'Lenguajes')).toBe(true)
  })
})
