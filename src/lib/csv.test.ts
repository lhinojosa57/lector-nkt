import { describe, it, expect } from 'vitest'
import { toCsv } from './csv'

describe('toCsv', () => {
  const csv = toCsv(['Estudiante', 'Comprensión %'], [['Pérez, "Toño"', 80], ['Ana', null]])
  it('empieza con BOM', () => expect(csv.startsWith('﻿')).toBe(true))
  it('escapa comas y comillas', () => expect(csv).toContain('"Pérez, ""Toño""",80'))
  it('null es campo vacío y filas con CRLF', () => {
    expect(csv).toBe('﻿Estudiante,Comprensión %\r\n"Pérez, ""Toño""",80\r\nAna,')
  })
})
