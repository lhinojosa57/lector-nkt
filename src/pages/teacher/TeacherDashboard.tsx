import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'

interface StudentProgress {
  student_id: string
  full_name: string
  email: string
  diagnostic_wpm: number | null
  diagnostic_date: string | null
  current_level: string | null
  current_wpm_avg: number | null
  total_sessions: number | null
  today_done: boolean
}

const LEVEL_LABELS: Record<string, string> = {
  escriba: 'Escriba',
  cronista: 'Cronista',
  intelectual: 'Intelectual',
  corresponsal: 'Corresponsal',
  humanista: 'Humanista',
}

const LEVEL_COLORS: Record<string, string> = {
  escriba: 'bg-amber-100 text-amber-800',
  cronista: 'bg-teal-100 text-teal-800',
  intelectual: 'bg-blue-100 text-blue-800',
  corresponsal: 'bg-purple-100 text-purple-800',
  humanista: 'bg-rose-100 text-rose-800',
}

export default function TeacherDashboard() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const [students, setStudents] = useState<StudentProgress[]>([])
  const [loading, setLoading] = useState(true)
  const today = new Date().toISOString().split('T')[0]

  useEffect(() => {
    async function load() {
      // Traer todos los perfiles de estudiantes
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('role', 'student')
        .order('full_name')

      if (!profiles) { setLoading(false); return }

      // Traer todos los progresos
      const { data: progresses } = await supabase
        .from('student_reading_progress')
        .select('*')

      // Traer sesiones de hoy
      const { data: todaySessions } = await supabase
        .from('reading_sessions')
        .select('student_id')
        .eq('session_date', today)
        .eq('is_completed', true)
        .eq('is_diagnostic', false)

      const todaySet = new Set(todaySessions?.map(s => s.student_id) ?? [])

      const result: StudentProgress[] = profiles.map(p => {
        const prog = progresses?.find(pr => pr.student_id === p.id)
        return {
          student_id: p.id,
          full_name: p.full_name ?? p.email,
          email: p.email,
          diagnostic_wpm: prog?.diagnostic_wpm ?? null,
          diagnostic_date: prog?.diagnostic_date ?? null,
          current_level: prog?.current_level ?? null,
          current_wpm_avg: prog?.current_wpm_avg ?? null,
          total_sessions: prog?.total_sessions ? prog.total_sessions - 1 : 0,
          today_done: todaySet.has(p.id),
        }
      })

      setStudents(result)
      setLoading(false)
    }
    load()
  }, [])

  const diagnosed = students.filter(s => s.diagnostic_date !== null).length
  const todayDone = students.filter(s => s.today_done).length

  if (loading) {
    return (
      <div className="min-h-screen bg-sepia-100 flex items-center justify-center">
        <div className="spinner mx-auto" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-sepia-100">

      {/* Header */}
      <div className="bg-parchment-50 border-b border-parchment-200 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="font-display text-xl font-bold text-ink-900">
              LectorNKT — Panel docente
            </h1>
            <p className="font-body text-xs text-ink-500 mt-0.5">
              {profile?.full_name ?? profile?.email}
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/teacher/groups')}
              className="font-body text-xs border border-parchment-300 text-ink-600 px-4 py-2 rounded-lg hover:bg-parchment-100 transition-colors"
            >
              Grupos
            </button>
           
            <button
              onClick={signOut}
              className="font-body text-xs text-ink-400 hover:text-ink-600 transition-colors"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-6 space-y-4">

        {/* Métricas rápidas */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-parchment-50 border border-parchment-200 rounded-xl p-4 text-center">
            <p className="font-mono text-3xl font-bold text-ink-800">{students.length}</p>
            <p className="font-body text-xs text-ink-500 mt-1">estudiantes</p>
          </div>
          <div className="bg-parchment-50 border border-parchment-200 rounded-xl p-4 text-center">
            <p className="font-mono text-3xl font-bold text-teal-600">{diagnosed}</p>
            <p className="font-body text-xs text-ink-500 mt-1">diagnóstico completado</p>
          </div>
          <div className="bg-parchment-50 border border-parchment-200 rounded-xl p-4 text-center">
            <p className="font-mono text-3xl font-bold text-blue-600">{todayDone}</p>
            <p className="font-body text-xs text-ink-500 mt-1">sesión de hoy</p>
          </div>
        </div>

        {/* Tabla de estudiantes */}
        <div className="bg-parchment-50 border border-parchment-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-parchment-200 flex items-center justify-between">
            <p className="font-display font-semibold text-ink-800">Mis estudiantes</p>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-teal-500"></div>
              <span className="font-body text-xs text-ink-500">Sesión de hoy completada</span>
              <div className="w-2 h-2 rounded-full bg-parchment-300 ml-2"></div>
              <span className="font-body text-xs text-ink-500">Pendiente</span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full" style={{ tableLayout: 'fixed' }}>
              <thead>
                <tr className="bg-sepia-100 border-b border-parchment-200">
                  <th className="text-left px-5 py-3 font-body text-xs text-ink-500 font-medium w-8"></th>
                  <th className="text-left px-5 py-3 font-body text-xs text-ink-500 font-medium">Estudiante</th>
                  <th className="text-center px-3 py-3 font-body text-xs text-ink-500 font-medium">Diagnóstico</th>
                  <th className="text-center px-3 py-3 font-body text-xs text-ink-500 font-medium">WPM inicial</th>
                  <th className="text-center px-3 py-3 font-body text-xs text-ink-500 font-medium">WPM actual</th>
                  <th className="text-center px-3 py-3 font-body text-xs text-ink-500 font-medium">Nivel</th>
                  <th className="text-center px-3 py-3 font-body text-xs text-ink-500 font-medium">Sesiones</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s, i) => (
                  <tr key={s.student_id}
                    className={`border-b border-parchment-200 ${i % 2 === 0 ? 'bg-parchment-50' : 'bg-white'}`}>
                    <td className="px-5 py-3 text-center">
                      <div className={`w-2.5 h-2.5 rounded-full mx-auto ${s.today_done ? 'bg-teal-500' : 'bg-parchment-300'}`} />
                    </td>
                    <td className="px-5 py-3">
                      <p className="font-body text-sm font-medium text-ink-800 truncate">
                        {s.full_name}
                      </p>
                      <p className="font-body text-xs text-ink-400 truncate">{s.email}</p>
                    </td>
                    <td className="px-3 py-3 text-center">
                      {s.diagnostic_date ? (
                        <span className="font-body text-xs text-teal-600 font-medium">
                          {new Date(s.diagnostic_date + 'T12:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
                        </span>
                      ) : (
                        <span className="font-body text-xs text-ink-400">Pendiente</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className="font-mono text-sm font-bold text-amber-500">
                        {s.diagnostic_wpm ?? '—'}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className="font-mono text-sm font-bold text-teal-600">
                        {s.current_wpm_avg ?? '—'}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      {s.current_level ? (
                        <span className={`font-body text-xs px-2 py-1 rounded-full font-medium ${LEVEL_COLORS[s.current_level] ?? 'bg-gray-100 text-gray-800'}`}>
                          {LEVEL_LABELS[s.current_level] ?? s.current_level}
                        </span>
                      ) : (
                        <span className="font-body text-xs text-ink-400">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className="font-mono text-sm text-ink-600">
                        {s.total_sessions ?? 0}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  )
}