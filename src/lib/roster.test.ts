import { describe, it, expect } from 'vitest'
import { parseGrade, parseRosterPaste, formatGrade } from './roster'

describe('parseGrade', () => {
  it.each([
    ['1', 1], ['2', 2], ['3', 3], ['7', 1], ['8', 2], ['9', 3],
    ['1°', 1], ['7°', 1], ['2º', 2], ['9o', 3],
    ['Primero', 1], ['segundo', 2], ['TERCERO', 3],
    ['séptimo', 1], ['octavo', 2], ['noveno', 3],
    [' 2 ', 2], ['Primer grado', 1], ['Segundo grado', 2],
  ])('%s → %s', (raw, expected) => expect(parseGrade(raw)).toBe(expected))

  it.each(['', '4', '10', 'quinto', 'abc'])('%s → null', raw => expect(parseGrade(raw)).toBeNull())
})

describe('formatGrade', () => {
  it('muestra grado o guion', () => {
    expect(formatGrade(1)).toBe('1°')
    expect(formatGrade(null)).toBe('—')
  })
})

describe('parseRosterPaste', () => {
  it('acepta tabulaciones de Excel, encabezado y mayúsculas', () => {
    const r = parseRosterPaste('Correo\tGrado\nAna.Lopez@NikolaTesla.edu.mx\t7°\nbeto@nikolatesla.edu.mx\t2\n')
    expect(r.rows).toEqual([
      { email: 'ana.lopez@nikolatesla.edu.mx', grade: 1 },
      { email: 'beto@nikolatesla.edu.mx', grade: 2 },
    ])
    expect(r.invalid).toEqual([])
  })

  it('acepta comas, punto y coma y correos solos (lista de bajas)', () => {
    const r = parseRosterPaste('a@nikolatesla.edu.mx, tercero\nb@nikolatesla.edu.mx;1\nc@nikolatesla.edu.mx')
    expect(r.rows).toEqual([
      { email: 'a@nikolatesla.edu.mx', grade: 3 },
      { email: 'b@nikolatesla.edu.mx', grade: 1 },
      { email: 'c@nikolatesla.edu.mx', grade: null },
    ])
  })

  it('reporta líneas sin correo o con grado ilegible, con su número de línea', () => {
    const r = parseRosterPaste('a@nikolatesla.edu.mx\t1\nJuan Pérez\t2\nb@nikolatesla.edu.mx\tquinto')
    expect(r.rows).toEqual([{ email: 'a@nikolatesla.edu.mx', grade: 1 }])
    expect(r.invalid).toEqual([
      { line: 2, text: 'Juan Pérez\t2' },
      { line: 3, text: 'b@nikolatesla.edu.mx\tquinto' },
    ])
  })

  it('ignora líneas vacías y quita correos repetidos (gana la última)', () => {
    const r = parseRosterPaste('\na@nikolatesla.edu.mx\t1\n\nA@nikolatesla.edu.mx\t2\n')
    expect(r.rows).toEqual([{ email: 'a@nikolatesla.edu.mx', grade: 2 }])
  })
})
