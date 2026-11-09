import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { EnrollmentStatus } from '@/lib/roster'

/**
 * Estado del estudiante en el ciclo actual. Sin fila, o si la consulta falla,
 * se considera 'activo': nunca se bloquea a nadie por un error.
 * `loading` es verdadero hasta tener la respuesta para ESTE estudiante, para que
 * nadie de baja alcance a ver su biblioteca ni un instante.
 */
export function useEnrollmentStatus(studentId: string | undefined): { loading: boolean; status: EnrollmentStatus } {
  const [result, setResult] = useState<{ for: string; status: EnrollmentStatus } | null>(null)

  useEffect(() => {
    if (!studentId) return
    let cancelled = false
    async function load(id: string) {
      const { data: cycle } = await supabase.from('lec_cycles').select('cycle').eq('is_current', true).maybeSingle()
      let status: EnrollmentStatus = 'activo'
      if (cycle?.cycle) {
        const { data } = await supabase
          .from('lec_enrollments')
          .select('status')
          .eq('student_id', id)
          .eq('cycle', cycle.cycle)
          .maybeSingle()
        if (data?.status) status = data.status as EnrollmentStatus
      }
      if (!cancelled) setResult({ for: id, status })
    }
    load(studentId).catch(() => { if (!cancelled) setResult({ for: studentId, status: 'activo' }) })
    return () => { cancelled = true }
  }, [studentId])

  if (!studentId) return { loading: false, status: 'activo' }
  if (result?.for !== studentId) return { loading: true, status: 'activo' }
  return { loading: false, status: result.status }
}
