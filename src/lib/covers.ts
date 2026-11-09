/**
 * Portadas: colores por materia (decididos por Larisa, ajustados a contraste AA),
 * prompt para generar la portada en Gemini y validación del archivo a subir.
 * Diseño 2026-11-09, sección 6.1.
 */

export interface SubjectStyle { bg: string; fg: string; motif: string }

const INK = '#2b2014'

export const SUBJECT_STYLES: Record<string, SubjectStyle> = {
  'Español': { bg: '#1e4fa3', fg: '#ffffff', motif: '📖' },
  'Inglés': { bg: '#5fb3e6', fg: '#0b2540', motif: '🗽' },
  'Historia': { bg: '#7a4a2a', fg: '#ffffff', motif: '🏛️' },
  'Geografía': { bg: '#e9dcb8', fg: '#3d2e14', motif: '🗺️' },
  'Biología': { bg: '#2f6b3a', fg: '#ffffff', motif: '🌿' },
  'Física': { bg: '#8bb43a', fg: '#1f2a0a', motif: '🧲' },
  'Química': { bg: '#0e7a5f', fg: '#ffffff', motif: '⚗️' },
  'Matemáticas': { bg: '#c62828', fg: '#ffffff', motif: '📐' },
  'Formación Cívica y Ética': { bg: '#ef7d1a', fg: INK, motif: '⚖️' },
  'Artes': { bg: '#e57aa8', fg: INK, motif: '🎨' },
  'Tecnología': { bg: '#6a3fa0', fg: '#ffffff', motif: '🤖' },
  'Otra': { bg: '#5f6670', fg: '#ffffff', motif: '📚' },
}

export function subjectStyle(subject: string): SubjectStyle {
  return SUBJECT_STYLES[subject] ?? SUBJECT_STYLES['Otra']
}

function luminance(hex: string): number {
  const h = hex.replace('#', '')
  const [r, g, b] = [0, 2, 4].map(i => {
    const c = parseInt(h.slice(i, i + 2), 16) / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** Razón de contraste WCAG entre dos colores hex (#rrggbb). */
export function contrastRatio(hexA: string, hexB: string): number {
  const [l1, l2] = [luminance(hexA), luminance(hexB)].sort((a, b) => b - a)
  return (l1 + 0.05) / (l2 + 0.05)
}

export function coverPrompt(title: string, subject: string): string {
  return `Ilustración vertical (proporción 2:3) para la portada de una lectura escolar titulada «${title}», de ${subject}. ` +
    'Estilo de portada de libro juvenil, colorida y atractiva para estudiantes de secundaria. ' +
    'Sin texto ni letras en la imagen. Si aparecen personas, que sean mexicanas.'
}

export const COVER_STEPS = 'Copia el prompt → pégalo en Gemini → descarga la imagen → "Subir portada".'

export const COVER_ACCEPT = 'image/jpeg,image/png,image/webp'
export const COVER_MAX_BYTES = 10 * 1024 * 1024

export function validateCoverFile(f: { type: string; size: number }): string | null {
  if (!COVER_ACCEPT.split(',').includes(f.type)) {
    return 'Sube una imagen JPG, PNG o WebP. Si es una foto del celular en HEIC, primero guárdala como JPG.'
  }
  if (f.size > COVER_MAX_BYTES) {
    return 'La imagen pesa más de 10 MB. Descárgala de Gemini en un tamaño menor.'
  }
  return null
}

/** Ruta del archivo en el bucket: nombre nuevo en cada subida (evita la caché). */
export function coverFileName(readingId: string, mime: string, now: number = Date.now()): string {
  return `${readingId}/${now}.${mime === 'image/jpeg' ? 'jpg' : 'webp'}`
}
