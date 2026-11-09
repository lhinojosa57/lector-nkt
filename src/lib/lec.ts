// LectorNKT 2.0 — tipos y catálogos compartidos de la biblioteca
// (tablas lec_* creadas en supabase/migrations/2026-11-04_lec_fase1.sql)

export type Language = 'es' | 'en'
export type ReadingStatus = 'draft' | 'published'
export type ReadingMode = 'aloud' | 'silent' | 'comprehension' | 'guided'
export type Skill = 'literal' | 'inferencial' | 'vocabulario' | 'estructura' | 'idea_principal' | 'critica'

export interface VocabularyItem {
  word: string
  definition: string
  example?: string
  /** Emoji que ayuda a recordar el concepto (lo elige el docente). */
  icon?: string
}

export interface QuestionOption {
  id: string
  text: string
}

export interface LecReading {
  id: string
  title: string
  language: Language
  subject: string
  topic: string | null
  text_type: string | null
  source: string | null
  created_by: string | null
  status: ReadingStatus
  cover_path: string | null
  created_at: string
  updated_at: string
}

export interface LecVersion {
  id: string
  reading_id: string
  level: number
  body: string
  word_count: number
  readability: number | null
  vocabulary: VocabularyItem[]
  curiosity_fact: string | null
}

export interface LecQuestion {
  id: string
  version_id: string
  skill: Skill
  text: string
  options: QuestionOption[]
  correct_option?: string   // solo docentes (los estudiantes leen lec_questions_public)
  explanation?: string | null
  position: number
}

export interface LecAssignment {
  id: string
  reading_id: string
  mode: ReadingMode
  fixed_level: number | null
  due_date: string | null
  created_by: string | null
  archived: boolean
  created_at: string
}

export interface ReadingGroup {
  id: string
  name: string
  grado: string | null
  modalidad: string | null
  archived: boolean
}

export const LANGUAGES: { value: Language; label: string }[] = [
  { value: 'es', label: 'Español' },
  { value: 'en', label: 'Inglés' },
]

export const SUBJECTS = [
  'Español',
  'Inglés',
  'Historia',
  'Geografía',
  'Biología',
  'Física',
  'Química',
  'Matemáticas',
  'Formación Cívica y Ética',
  'Artes',
  'Tecnología',
  'Otra',
]

export const LEVELS: { level: number; name: string }[] = [
  { level: 1, name: 'Escriba' },
  { level: 2, name: 'Cronista' },
  { level: 3, name: 'Intelectual' },
  { level: 4, name: 'Corresponsal' },
  { level: 5, name: 'Humanista' },
]

/** Semáforo de comprensión (criterios de Betts: 75% = nivel adecuado, < 50% = frustración). */
export type Light = 'green' | 'yellow' | 'red'
export function comprehensionLight(pct: number): { light: Light; label: string } {
  if (pct >= 75) return { light: 'green', label: 'Comprendiste muy bien' }
  if (pct >= 50) return { light: 'yellow', label: 'Vas bien, repasa lo que fallaste' }
  return { light: 'red', label: 'Vale la pena volver a leerla' }
}

export function levelName(level: number | null | undefined): string {
  return LEVELS.find(l => l.level === level)?.name ?? '—'
}

export const MODES: { value: ReadingMode; label: string; description: string }[] = [
  { value: 'aloud',         label: 'Voz alta',         description: 'Graba 1 minuto leyendo en voz alta y contesta. El docente revisa la grabación.' },
  { value: 'silent',        label: 'En silencio',      description: 'Lee con cronómetro y contesta. Sin grabación ni revisión.' },
  { value: 'comprehension', label: 'Solo comprensión', description: 'Lee sin cronómetro y contesta.' },
  { value: 'guided',        label: 'Lectura guiada',   description: 'La app marca palabra por palabra y hace pausas en los signos de puntuación. Para practicar el ritmo; no mide velocidad.' },
]

export function modeLabel(mode: ReadingMode): string {
  return MODES.find(m => m.value === mode)?.label ?? mode
}

export const SKILL_LABELS: Record<Skill, string> = {
  literal: 'Literal',
  inferencial: 'Inferencial',
  vocabulario: 'Vocabulario',
  estructura: 'Estructura',
  idea_principal: 'Idea principal',
  critica: 'Crítica',
}

/** Normaliza un campo jsonb que pudo guardarse como texto JSON. */
export function asArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[]
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      return Array.isArray(parsed) ? (parsed as T[]) : []
    } catch {
      return []
    }
  }
  return []
}

export function formatDate(iso: string | null): string {
  if (!iso) return '—'
  const [y, m, d] = iso.slice(0, 10).split('-')
  return `${d}/${m}/${y}`
}

export const DEFAULT_LEVEL = 2

/** Elige la versión del nivel pedido; si no existe, la más cercana por debajo y si no, la más baja. */
export function pickVersion<T extends { level: number }>(versions: T[], level: number): T | null {
  if (versions.length === 0) return null
  const sorted = [...versions].sort((a, b) => a.level - b.level)
  return (
    sorted.find(v => v.level === level) ??
    [...sorted].reverse().find(v => v.level < level) ??
    sorted[0]
  )
}

export interface LecConsent {
  student_id: string
  guardian_name: string
  relationship: string
  accepts_google_services: boolean
  accepts_voice_recording: boolean
  consent_version: string
  accepted_at: string
}

export const CONSENT_VERSION = '2026-27-v1'
