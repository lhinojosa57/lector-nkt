// Archivo de resultados que abre bien en Excel en español (BOM UTF-8, comillas dobles).

function cell(v: string | number | null): string {
  if (v === null) return ''
  const s = String(v)
  return /[",;\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function toCsv(header: string[], rows: (string | number | null)[][]): string {
  return '﻿' + [header, ...rows].map(r => r.map(cell).join(',')).join('\r\n')
}

export function downloadCsv(filename: string, csv: string): void {
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
