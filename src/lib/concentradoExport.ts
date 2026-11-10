// Descarga del Concentrado en Excel (SheetJS) y PDF (jsPDF + autotable).
// Las librerías se cargan solo al descargar, para no hacer más pesada la app.
import type { ConcentradoRow } from './concentrado'
import type { PdaGrade } from './pda'

export interface ConcentradoHeader {
  escuela: string
  cct: string
  ciclo: string
  grupo: string
  docente: string
  periodo: string
}

export interface ConcentradoSheet { grade: PdaGrade; rows: ConcentradoRow[] }

const COLS = ['Campo formativo', 'Disciplina', 'Contenido', 'Código PDA', 'PDA', 'Estado', 'Lecturas (fechas)', 'Completaron', 'Comprensión promedio']
const MISSING = '(Configura escuela y CCT)'

function headerLines(h: ConcentradoHeader, grade: PdaGrade): [string, string][] {
  return [
    ['Concentrado de avance del Programa Sintético', ''],
    ['Escuela', h.escuela || MISSING],
    ['CCT', h.cct || MISSING],
    ['Ciclo · Grupo · Grado', `${h.ciclo} · ${h.grupo} · ${grade}°`],
    ['Docente · Periodo', `${h.docente} · ${h.periodo}`],
  ]
}

const rowValues = (r: ConcentradoRow) => [
  r.campo, r.disciplina, r.contenido, r.pdaCode, r.pdaText, r.estado, r.lecturas, r.completaron,
  r.comprension === null ? '' : `${Math.round(r.comprension)}%`,
]

export async function downloadConcentradoXlsx(h: ConcentradoHeader, sheets: ConcentradoSheet[], filename: string): Promise<void> {
  const XLSX = await import('xlsx')
  const wb = XLSX.utils.book_new()
  for (const s of sheets) {
    const aoa: (string | number)[][] = [...headerLines(h, s.grade), [], COLS, ...s.rows.map(rowValues)]
    const ws = XLSX.utils.aoa_to_sheet(aoa)
    ws['!cols'] = [{ wch: 22 }, { wch: 18 }, { wch: 45 }, { wch: 14 }, { wch: 70 }, { wch: 22 }, { wch: 40 }, { wch: 12 }, { wch: 12 }]
    XLSX.utils.book_append_sheet(wb, ws, `${s.grade}° grado`)
  }
  XLSX.writeFile(wb, filename)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AutoTableFn = (doc: any, options: any) => unknown

/**
 * jspdf-autotable llega con formas distintas según cómo se empaquete (ESM, CommonJS
 * envuelto por Vite…). En el navegador "default" no era la función: se busca aquí.
 */
export function resolveAutoTable(mod: unknown): AutoTableFn {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const m = mod as any
  const candidates = [m?.default, m?.default?.default, m?.autoTable, m?.default?.autoTable]
  const found = candidates.find(c => typeof c === 'function')
  if (found) return found as AutoTableFn
  const apply = m?.applyPlugin ?? m?.default?.applyPlugin
  if (typeof apply === 'function') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (doc: any, options: any) => { apply(doc.constructor); return doc.autoTable(options) }
  }
  throw new Error('No se pudo cargar la librería del PDF')
}

export async function downloadConcentradoPdf(h: ConcentradoHeader, sheets: ConcentradoSheet[], filename: string): Promise<void> {
  const { jsPDF } = await import('jspdf')
  const autoTable = resolveAutoTable(await import('jspdf-autotable'))
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'letter' })
  sheets.forEach((s, i) => {
    if (i > 0) doc.addPage()
    let y = 36
    for (const [k, v] of headerLines(h, s.grade)) {
      doc.setFont('helvetica', k.startsWith('Concentrado') ? 'bold' : 'normal')
      doc.setFontSize(k.startsWith('Concentrado') ? 13 : 9)
      doc.text(v ? `${k}: ${v}` : k, 36, y)
      y += k.startsWith('Concentrado') ? 18 : 13
    }
    // Filas de título por campo → disciplina, como el Programa Sintético.
    type Cell = string | { content: string; colSpan: number; styles: Record<string, unknown> }
    const body: Cell[][] = []
    let lastCampo = ''
    let lastDisc = ''
    for (const r of s.rows) {
      if (r.campo !== lastCampo) {
        body.push([{ content: r.campo, colSpan: 7, styles: { fontStyle: 'bold', fillColor: [230, 220, 200] } }])
        lastCampo = r.campo
        lastDisc = ''
      }
      if (r.disciplina !== lastDisc) {
        body.push([{ content: r.disciplina, colSpan: 7, styles: { fontStyle: 'bold', fillColor: [245, 238, 225] } }])
        lastDisc = r.disciplina
      }
      const v = rowValues(r)
      body.push([v[2], v[3], v[4], v[5], v[6], v[7], v[8]])
    }
    autoTable(doc, {
      startY: y + 6,
      head: [['Contenido', 'Código', 'PDA', 'Estado', 'Lecturas (fechas)', 'Completaron', 'Comprensión']],
      body,
      styles: { fontSize: 7, cellPadding: 3, overflow: 'linebreak' },
      headStyles: { fillColor: [15, 118, 110] },
      columnStyles: { 0: { cellWidth: 130 }, 1: { cellWidth: 60 }, 2: { cellWidth: 240 }, 3: { cellWidth: 70 }, 4: { cellWidth: 120 }, 5: { cellWidth: 50 }, 6: { cellWidth: 50 } },
      margin: { left: 36, right: 36 },
    })
  })
  doc.save(filename)
}
