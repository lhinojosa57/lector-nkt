// Avance y subida automática de nivel (RPCs de supabase/migrations/2026-11-09_subida_nivel.sql).
import { supabase } from './supabase'
import type { Language } from './lec'

export interface LevelProgress {
  level: number
  provisional: boolean
  max: boolean
  comprehension: { considered: number; greens: number; avg: number | null; needGreens: number; needCount: number; ok: boolean }
  accuracy: { reviewed: number; ok: boolean }
  compliance: { counted: number; completed: number; overduePending: number; pct: number | null; ok: boolean }
  eligible: boolean
}

export interface LevelUpChange {
  id: string
  language: Language
  to_level: number
}

/** null si falla (por ejemplo, si el SQL todavía no se corre). */
export async function fetchLevelProgress(studentId: string, language: Language): Promise<LevelProgress | null> {
  const { data, error } = await supabase.rpc('lec_level_progress', { p_student: studentId, p_language: language })
  if (error) {
    console.error('No se pudo leer el avance de nivel', error)
    return null
  }
  return (data as LevelProgress) ?? null
}

/** Nunca rompe el flujo: ante cualquier error devuelve null. */
export async function tryLevelUp(studentId: string, language: Language): Promise<number | null> {
  try {
    const { data, error } = await supabase.rpc('lec_try_level_up', { p_student: studentId, p_language: language })
    if (error) {
      console.error('No se pudo evaluar la subida de nivel', error)
      return null
    }
    return typeof data === 'number' ? data : null
  } catch (err) {
    console.error('No se pudo evaluar la subida de nivel', err)
    return null
  }
}

export async function fetchUnseenLevelUps(studentId: string): Promise<LevelUpChange[]> {
  const { data, error } = await supabase
    .from('lec_level_changes')
    .select('id, language, to_level')
    .eq('student_id', studentId)
    .eq('reason', 'auto')
    .is('seen_at', null)
    .order('created_at')
  if (error) {
    console.error('No se pudieron leer las subidas de nivel', error)
    return []
  }
  return (data ?? []) as LevelUpChange[]
}

export async function markLevelSeen(id: string): Promise<void> {
  const { error } = await supabase.rpc('lec_mark_level_seen', { p_change_id: id })
  if (error) console.error('No se pudo marcar la felicitación como vista', error)
}
