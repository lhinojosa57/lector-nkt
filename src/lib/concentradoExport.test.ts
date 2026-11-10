import { describe, it, expect } from 'vitest'
import { resolveAutoTable } from './concentradoExport'

const fn = () => 'tabla'

describe('resolveAutoTable', () => {
  it('módulo ESM con default función', () => expect(resolveAutoTable({ default: fn })).toBe(fn))
  it('módulo CommonJS envuelto (default.default)', () => expect(resolveAutoTable({ default: { default: fn } })).toBe(fn))
  it('export con nombre', () => expect(resolveAutoTable({ autoTable: fn })).toBe(fn))
  it('sin función: error claro', () => expect(() => resolveAutoTable({ default: {} })).toThrow('No se pudo cargar la librería del PDF'))
})

describe('PDF real con la librería instalada', () => {
  it('genera el documento con filas de título y acentos', async () => {
    const { jsPDF } = await import('jspdf')
    const autoTable = resolveAutoTable(await import('jspdf-autotable'))
    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'letter' })
    doc.text('Concentrado · 1° · lingüística', 36, 36)
    autoTable(doc, { startY: 50, head: [['A', 'B']], body: [[{ content: 'Lenguajes', colSpan: 2 }], ['Español', 'Pendiente por trabajar']] })
    expect(doc.output().length).toBeGreaterThan(1000)
  })
})
