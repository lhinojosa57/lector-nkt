import { describe, it, expect } from 'vitest'
import { computeTargets } from './assignmentTargets'

const assignment = { created_at: '2026-11-03T16:00:00Z', due_date: '2026-11-08' }

describe('computeTargets', () => {
  const members = new Map([
    ['g1', [
      { student_id: 'mismoDia', joined_at: '2026-11-03T20:00:00Z' },
      { student_id: 'tarde', joined_at: '2026-11-05T15:00:00Z' },
      { student_id: 'sinFila', joined_at: null },
      { student_id: 'baja', joined_at: null },
      { student_id: 'dos', joined_at: null },
    ]],
    ['g2', [{ student_id: 'dos', joined_at: null }]],
  ])
  const res = computeTargets({
    assignment,
    targets: [{ group_id: 'g1', student_id: null }, { group_id: 'g2', student_id: null }, { group_id: null, student_id: 'indiv' }],
    membersByGroup: members,
    bajaDate: new Map([['baja', '2026-11-04']]),
  })

  it('individual, mismo día y sin fila cuentan', () => {
    expect(res.targets.has('indiv')).toBe(true)
    expect(res.targets.has('mismoDia')).toBe(true)
    expect(res.targets.has('sinFila')).toBe(true)
  })
  it('quien se unió después va aparte', () => {
    expect(res.targets.has('tarde')).toBe(false)
    expect(res.lateJoiners.has('tarde')).toBe(true)
  })
  it('baja antes de la fecha límite no está en ninguno', () => {
    expect(res.targets.has('baja')).toBe(false)
    expect(res.lateJoiners.has('baja')).toBe(false)
  })
  it('destinatario por un grupo y unido tarde a otro: solo cuenta en el primero', () => {
    const r = computeTargets({
      assignment,
      targets: [{ group_id: 'gA', student_id: null }, { group_id: 'gB', student_id: null }],
      membersByGroup: new Map([
        ['gA', [{ student_id: 's', joined_at: null }]],
        ['gB', [{ student_id: 's', joined_at: '2026-11-06T15:00:00Z' }, { student_id: 't', joined_at: '2026-11-06T15:00:00Z' }]],
      ]),
      bajaDate: new Map(),
    })
    expect(r.groupOf.get('s')).toEqual(['gA'])
    expect(r.groupOf.get('t')).toEqual(['gB'])
    expect(r.lateJoiners.has('t')).toBe(true)
  })
  it('en dos grupos cuenta una vez, con ambos grupos', () => {
    expect([...res.targets].filter(x => x === 'dos')).toHaveLength(1)
    expect(res.groupOf.get('dos')).toEqual(['g1', 'g2'])
  })
})
