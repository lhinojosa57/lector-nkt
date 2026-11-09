import { describe, it, expect } from 'vitest'
import { SUBJECTS } from './lec'
import { SUBJECT_STYLES, subjectStyle, contrastRatio, coverPrompt, validateCoverFile, COVER_STEPS } from './covers'

describe('estilos de materia', () => {
  it('hay estilo para cada materia de SUBJECTS', () => {
    for (const s of SUBJECTS) expect(SUBJECT_STYLES[s], s).toBeDefined()
  })
  it.each(SUBJECTS)('%s: texto con contraste AA (≥ 4.5)', s => {
    const { bg, fg } = SUBJECT_STYLES[s]
    expect(contrastRatio(bg, fg)).toBeGreaterThanOrEqual(4.5)
  })
  it('Biología, Física y Química son tres verdes distintos', () => {
    const greens = ['Biología', 'Física', 'Química'].map(s => SUBJECT_STYLES[s].bg.toLowerCase())
    expect(new Set(greens).size).toBe(3)
  })
  it('materia desconocida usa el estilo de Otra', () => {
    expect(subjectStyle('Ciencias')).toEqual(SUBJECT_STYLES['Otra'])
  })
  it('contrastRatio: negro sobre blanco = 21', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 1)
  })
})

describe('coverPrompt', () => {
  it('pone título y materia en el texto exacto', () => {
    expect(coverPrompt('El planeta que nos presta su casa', 'Español')).toBe(
      'Ilustración vertical (proporción 2:3) para la portada de una lectura escolar titulada «El planeta que nos presta su casa», de Español. Estilo de portada de libro juvenil, colorida y atractiva para estudiantes de secundaria. Sin texto ni letras en la imagen. Si aparecen personas, que sean mexicanas.'
    )
  })
  it('pasos exactos', () => {
    expect(COVER_STEPS).toBe('Copia el prompt → pégalo en Gemini → descarga la imagen → "Subir portada".')
  })
})

describe('validateCoverFile', () => {
  it('acepta jpg, png y webp de hasta 10 MB', () => {
    expect(validateCoverFile({ type: 'image/jpeg', size: 2_000_000 })).toBeNull()
    expect(validateCoverFile({ type: 'image/png', size: 10 * 1024 * 1024 })).toBeNull()
    expect(validateCoverFile({ type: 'image/webp', size: 1 })).toBeNull()
  })
  it('rechaza HEIC y otros formatos con mensaje claro', () => {
    expect(validateCoverFile({ type: 'image/heic', size: 1000 })).toMatch(/JPG, PNG o WebP/)
    expect(validateCoverFile({ type: 'application/pdf', size: 1000 })).toMatch(/JPG, PNG o WebP/)
  })
  it('rechaza más de 10 MB', () => {
    expect(validateCoverFile({ type: 'image/jpeg', size: 10 * 1024 * 1024 + 1 })).toMatch(/10 MB/)
  })
})

describe('coverFileName', () => {
  it('usa la extensión del tipo de imagen', async () => {
    const { coverFileName } = await import('./covers')
    expect(coverFileName('abc', 'image/webp', 123)).toBe('abc/123.webp')
    expect(coverFileName('abc', 'image/jpeg', 123)).toBe('abc/123.jpg')
  })
})
