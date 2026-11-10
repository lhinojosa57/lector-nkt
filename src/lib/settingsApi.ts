// Configuración de la escuela (encabezado del Concentrado) y trimestres del ciclo.
import { supabase } from './supabase'

export interface Settings { school_name: string | null; cct: string | null }
export interface Term { name: string; starts_on: string; ends_on: string }

export async function fetchSettings(): Promise<Settings> {
  const { data, error } = await supabase.from('lec_settings').select('school_name, cct').eq('id', true).maybeSingle()
  if (error) throw error
  return (data as Settings | null) ?? { school_name: null, cct: null }
}

export async function saveSettings(s: Settings, userId: string | null): Promise<void> {
  const { error } = await supabase
    .from('lec_settings')
    .upsert({ id: true, school_name: s.school_name?.trim() || null, cct: s.cct?.trim().toUpperCase() || null, updated_at: new Date().toISOString(), updated_by: userId })
  if (error) throw error
}

/** Valida y devuelve el primer problema, o null si los trimestres están bien. */
export function validateTerms(terms: Term[], cycle: { starts_on: string; ends_on: string }): string | null {
  for (const [i, t] of terms.entries()) {
    const n = t.name.trim() || `El trimestre ${i + 1}`
    if (!t.name.trim()) return `El trimestre ${i + 1} no tiene nombre.`
    if (!t.starts_on || !t.ends_on) return `${n}: falta una fecha.`
    if (t.starts_on > t.ends_on) return `${n}: el inicio es después del fin.`
    if (t.starts_on < cycle.starts_on || t.ends_on > cycle.ends_on) return `${n}: debe quedar dentro del ciclo.`
  }
  return null
}

export async function saveTerms(cycle: string, terms: Term[]): Promise<void> {
  const clean = terms.map(t => ({ name: t.name.trim(), starts_on: t.starts_on, ends_on: t.ends_on }))
    .sort((a, b) => a.starts_on.localeCompare(b.starts_on))
  const { error } = await supabase.from('lec_cycles').update({ terms: clean }).eq('cycle', cycle)
  if (error) throw error
}
