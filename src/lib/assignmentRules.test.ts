import { describe, it, expect } from 'vitest'
import { localDate, effectiveDueDate, isClosed, isTarget } from './assignmentRules'

describe('localDate', () => {
  it('usa el día de México, no el de UTC', () => {
    // 2026-11-10 04:30 UTC = 2026-11-09 22:30 en Ciudad de México
    expect(localDate('2026-11-10T04:30:00Z')).toBe('2026-11-09')
  })
})

describe('effectiveDueDate', () => {
  it('respeta la fecha límite si existe', () => {
    expect(effectiveDueDate({ due_date: '2026-11-12', created_at: '2026-11-01T15:00:00Z' })).toBe('2026-11-12')
  })
  it('sin fecha: 7 días después de creada, en día local', () => {
    expect(effectiveDueDate({ due_date: null, created_at: '2026-11-10T04:30:00Z' })).toBe('2026-11-16')
  })
  it('cruza fin de mes', () => {
    expect(effectiveDueDate({ due_date: null, created_at: '2026-11-28T18:00:00Z' })).toBe('2026-12-05')
  })
})

describe('isClosed', () => {
  const base = { due_date: '2026-11-12', created_at: '2026-11-05T15:00:00Z', archived: false }
  it('abierta el mismo día de la fecha límite', () => expect(isClosed(base, '2026-11-12')).toBe(false))
  it('cerrada al día siguiente', () => expect(isClosed(base, '2026-11-13')).toBe(true))
  it('archivada siempre cerrada', () => expect(isClosed({ ...base, archived: true }, '2026-11-06')).toBe(true))
})

describe('isTarget', () => {
  const a = { assignmentCreatedAt: '2026-11-05T15:00:00Z', dueDate: '2026-11-12' }
  it('miembro desde antes', () =>
    expect(isTarget({ ...a, individual: false, joinedAt: '2026-09-01T12:00:00Z', bajaDate: null })).toBe(true))
  it('se unió el mismo día de la asignación', () =>
    expect(isTarget({ ...a, individual: false, joinedAt: '2026-11-05T20:00:00Z', bajaDate: null })).toBe(true))
  it('se unió después: no es destinatario', () =>
    expect(isTarget({ ...a, individual: false, joinedAt: '2026-11-06T12:00:00Z', bajaDate: null })).toBe(false))
  it('asignación individual siempre cuenta', () =>
    expect(isTarget({ ...a, individual: true, joinedAt: null, bajaDate: null })).toBe(true))
  it('baja antes o el día de la fecha límite: no cuenta', () =>
    expect(isTarget({ ...a, individual: false, joinedAt: '2026-09-01T12:00:00Z', bajaDate: '2026-11-12' })).toBe(false))
  it('baja después de la fecha límite: sí cuenta', () =>
    expect(isTarget({ ...a, individual: false, joinedAt: '2026-09-01T12:00:00Z', bajaDate: '2026-11-20' })).toBe(true))
})
