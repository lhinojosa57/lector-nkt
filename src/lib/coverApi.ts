/** Portadas en Supabase Storage (bucket público "lec-covers"). */
import { supabase } from '@/lib/supabase'
import { coverFileName } from '@/lib/covers'

const BUCKET = 'lec-covers'

export function coverUrl(path: string | null): string | null {
  if (!path) return null
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl
}

async function deleteFile(path: string) {
  const { data, error } = await supabase.storage.from(BUCKET).remove([path])
  // Sin permiso de lectura, Storage no borra y tampoco marca error: se detecta por la lista vacía.
  if (error || !data?.length) console.error('No se pudo borrar la portada anterior', path, error)
}

/** Sube la portada con un nombre nuevo (evita la caché) y borra la anterior. Devuelve el path nuevo. */
export async function uploadCover(reading: { id: string; cover_path: string | null }, blob: Blob): Promise<string> {
  const type = blob.type === 'image/jpeg' ? 'image/jpeg' : 'image/webp'
  const path = coverFileName(reading.id, type)
  const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, blob, { contentType: type, upsert: false })
  if (upErr) throw upErr
  const { error: dbErr } = await supabase
    .from('lec_readings')
    .update({ cover_path: path, updated_at: new Date().toISOString() })
    .eq('id', reading.id)
  if (dbErr) {
    await deleteFile(path)
    throw dbErr
  }
  if (reading.cover_path && reading.cover_path !== path) await deleteFile(reading.cover_path)
  return path
}

export async function removeCover(reading: { id: string; cover_path: string | null }): Promise<void> {
  const { error } = await supabase
    .from('lec_readings')
    .update({ cover_path: null, updated_at: new Date().toISOString() })
    .eq('id', reading.id)
  if (error) throw error
  if (reading.cover_path) await deleteFile(reading.cover_path)
}
