import { describe, it, expect } from 'vitest'
import { isAdminEmail, promoteAvailableFrom, canPromoteOn, nextCycle } from './adminRules'

describe('isAdminEmail', () => {
  it('solo la cuenta de sistemas, sin importar mayúsculas', () => {
    expect(isAdminEmail('sistemas@nikolatesla.edu.mx')).toBe(true)
    expect(isAdminEmail('Sistemas@NikolaTesla.edu.mx')).toBe(true)
    expect(isAdminEmail('otra@nikolatesla.edu.mx')).toBe(false)
    expect(isAdminEmail(null)).toBe(false)
  })
})

describe('pasar de grado: fecha', () => {
  it('se habilita 46 días antes del fin del ciclo', () => {
    expect(promoteAvailableFrom('2027-07-31')).toBe('2027-06-15')
  })
  it('antes no, desde ese día sí', () => {
    expect(canPromoteOn('2026-11-10', '2027-07-31')).toBe(false)
    expect(canPromoteOn('2027-06-14', '2027-07-31')).toBe(false)
    expect(canPromoteOn('2027-06-15', '2027-07-31')).toBe(true)
  })
})

describe('nextCycle', () => {
  it('2026-2027 → 2027-2028', () => expect(nextCycle('2026-2027')).toBe('2027-2028'))
})
