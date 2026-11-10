import { describe, it, expect } from 'vitest'
import { validateTerms } from './settingsApi'

const cycle = { starts_on: '2026-08-01', ends_on: '2027-07-31' }

describe('validateTerms', () => {
  it('bien', () => expect(validateTerms([{ name: 'T1', starts_on: '2026-09-28', ends_on: '2026-12-18' }], cycle)).toBeNull())
  it('sin nombre', () => expect(validateTerms([{ name: ' ', starts_on: '2026-09-28', ends_on: '2026-12-18' }], cycle)).toBe('El trimestre 1 no tiene nombre.'))
  it('al revés', () => expect(validateTerms([{ name: 'T1', starts_on: '2026-12-18', ends_on: '2026-09-28' }], cycle)).toBe('T1: el inicio es después del fin.'))
  it('fuera del ciclo', () => expect(validateTerms([{ name: 'T3', starts_on: '2027-04-12', ends_on: '2027-08-02' }], cycle)).toBe('T3: debe quedar dentro del ciclo.'))
})
