import { useCallback, useState, type CSSProperties } from 'react'

/** Preferencias de lectura del estudiante (se guardan en su navegador). */
export interface ReadingPrefs {
  size: 0 | 1 | 2 | 3
  theme: 'normal' | 'high' | 'dark'
  spacious: boolean
}

const KEY = 'lectornkt-prefs'
const DEFAULT: ReadingPrefs = { size: 0, theme: 'normal', spacious: false }

export const SIZE_LABELS = ['Normal', 'Grande', 'Más grande', 'Muy grande']
const FONT_REM = [1.125, 1.375, 1.625, 2]
const ZOOM = [1, 1.2, 1.4, 1.7]

function read(): ReadingPrefs {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? { ...DEFAULT, ...JSON.parse(raw) } : DEFAULT
  } catch {
    return DEFAULT
  }
}

export function useReadingPrefs() {
  const [prefs, setPrefs] = useState<ReadingPrefs>(read)
  const update = useCallback((patch: Partial<ReadingPrefs>) => {
    setPrefs(p => {
      const next = { ...p, ...patch }
      try { localStorage.setItem(KEY, JSON.stringify(next)) } catch { /* sin almacenamiento */ }
      return next
    })
  }, [])
  return { prefs, update }
}

/** Tamaño y espaciado para el texto de la lectura (la regla de lectura se ajusta sola). */
export function textStyle(p: ReadingPrefs): CSSProperties {
  return { fontSize: `${FONT_REM[p.size]}rem`, lineHeight: p.spacious ? 2.1 : 1.65 }
}

/** Escala para tarjetas de palabras clave y preguntas. */
export function zoomStyle(p: ReadingPrefs): CSSProperties {
  return p.size ? ({ zoom: ZOOM[p.size] } as CSSProperties) : {}
}

/** Clase de contraste para una tarjeta. */
export function themeClass(p: ReadingPrefs): string {
  return p.theme === 'high' ? 'lec-high' : p.theme === 'dark' ? 'lec-dark' : ''
}
