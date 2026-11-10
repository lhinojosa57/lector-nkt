import { describe, it, expect } from 'vitest'
import { pdaGradesCovered, missingGradeWarnings } from './pda'

describe('pdaGradesCovered', () => {
  it('vacío', () => expect([...pdaGradesCovered([])]).toEqual([]))
  it('un grado', () => expect([...pdaGradesCovered([{ grade: 1 }])]).toEqual([1]))
  it('sin grado cubre los tres', () => expect([...pdaGradesCovered([{ grade: null }])].sort()).toEqual([1, 2, 3]))
})

describe('missingGradeWarnings', () => {
  it('sin PDA: un solo aviso general', () => {
    expect(missingGradeWarnings([], [1, 3])).toEqual(['Esta lectura no tiene PDA; no sumará al cumplimiento'])
  })
  it('grado presente sin PDA', () => {
    expect(missingGradeWarnings([{ grade: 1 }], [1, 3])).toEqual([
      'Esta lectura no tiene PDA de 3°; tus estudiantes de 3° la leerán, pero no sumará a su cumplimiento',
    ])
  })
  it('sin grados presentes, sin avisos de grado', () => expect(missingGradeWarnings([{ grade: 1 }], [])).toEqual([]))
})
