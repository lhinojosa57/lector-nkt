// COPIADO DE HISTOVID - ADAPTADO PARA VIDEONKT
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../lib/auth'
import { supabase } from '../../lib/supabase'
import { Users, Video, CheckSquare, TrendingUp, Plus, ArrowRight } from 'lucide-react'

interface Stats { groups: number; assignments: number; students: number; completions: number }

export default function TeacherDashboard() {
  const { profile } = useAuth()
  const [stats, setStats] = useState<Stats>({ groups: 0, assignments: 0, students: 0, completions: 0 })
  const [recentAssignments, setRecentAssignments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      if (!profile) return
      const [groupsRes, assignmentsRes] = await Promise.all([
        supabase.from('groups').select('id, group_members(count)').eq('teacher_id', profile.id),
        supabase.from('video_assignments').select('id, title, topic, subject, is_published, created_at, group:groups(name)').eq('teacher_id', profile.id).order('created_at', { ascending: false }).limit(5),
      ])
      const groups = groupsRes.data ?? []
      const assignments = assignmentsRes.data ?? []
      const totalStudents = groups.reduce((s: number, g: any) => s + (g.group_members?.[0]?.count ?? 0), 0)

      const sessionRes = await supabase.from('student_sessions')
        .select('id', { count: 'exact' })
        .in('assignment_id', assignments.map((a: any) => a.id))
        .eq('is_completed', true)

      setStats({ groups: groups.length, assignments: assignments.length, students: totalStudents, completions: sessionRes.count ?? 0 })
      setRecentAssignments(assignments)
      setLoading(false)
    }
    load()
  }, [profile])

  const statCards = [
    { label: 'Grupos', value: stats.groups, icon: Users, color: 'bg-gold-400/20 text-gold-500' },
    { label: 'Actividades', value: stats.assignments, icon: Video, color: 'bg-crimson-500/20 text-crimson-500' },
    { label: 'Estudiantes', value: stats.students, icon: TrendingUp, color: 'bg-ink-600/20 text-ink-600' },
    { label: 'Completadas', value: stats.completions, icon: CheckSquare, color: 'bg-green-700/20 text-green-700' },
  ]

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold text-ink-900">
          Buenos días, {profile?.full_name?.split(' ')[0]} 👋
        </h1>
        <p className="font-body text-ink-600 mt-1">Aquí tienes un resumen de tu actividad docente</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-4 gap-4 mb-8">
          {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-parchment-200 rounded-sm animate-pulse" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {statCards.map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-parchment-50 rounded-sm shadow-manuscript p-5 border border-parchment-200">
              <div className={`w-10 h-10 rounded flex items-center justify-center mb-3 ${color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <p className="font-display text-3xl font-bold text-ink-900">{value}</p>
              <p className="text-sm text-ink-500 font-body mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <Link to="/teacher/assignments/new" className="flex items-center gap-4 bg-crimson-500 text-parchment-50 p-5 rounded-sm shadow-manuscript hover:bg-crimson-600 transition-colors group">
          <div className="w-10 h-10 bg-white/20 rounded flex items-center justify-center flex-shrink-0">
            <Plus className="w-5 h-5" />
          </div>
          <div>
            <p className="font-body font-semibold">Nueva actividad de video</p>
            <p className="text-sm text-crimson-200">Asigna un video con preguntas</p>
          </div>
          <ArrowRight className="w-5 h-5 ml-auto group-hover:translate-x-1 transition-transform" />
        </Link>

        <Link to="/teacher/groups" className="flex items-center gap-4 bg-parchment-50 border border-parchment-200 p-5 rounded-sm shadow-manuscript hover:shadow-raised transition-shadow group">
          <div className="w-10 h-10 bg-gold-400/20 rounded flex items-center justify-center flex-shrink-0">
            <Users className="w-5 h-5 text-gold-500" />
          </div>
          <div>
            <p className="font-body font-semibold text-ink-800">Gestionar grupos</p>
            <p className="text-sm text-ink-500">Ver y editar tus grupos</p>
          </div>
          <ArrowRight className="w-5 h-5 ml-auto text-ink-400 group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>

      <div className="bg-parchment-50 rounded-sm shadow-manuscript border border-parchment-200">
        <div className="flex items-center justify-between p-5 border-b border-parchment-200">
          <h2 className="font-display text-xl font-semibold text-ink-800">Actividades recientes</h2>
          <Link to="/teacher/assignments" className="text-sm text-crimson-500 hover:text-crimson-600 font-body font-medium">
            Ver todas →
          </Link>
        </div>
        {recentAssignments.length === 0 ? (
          <div className="p-10 text-center text-ink-500 font-body">
            <Video className="w-12 h-12 mx-auto mb-3 text-ink-300" />
            <p>Aún no has creado actividades</p>
            <Link to="/teacher/assignments/new" className="text-crimson-500 hover:underline mt-2 inline-block">
              Crear la primera
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-parchment-200">
            {recentAssignments.map((a: any) => (
              <div key={a.id} className="flex items-center justify-between px-5 py-4 hover:bg-sepia-100/50 transition-colors">
                <div className="min-w-0">
                  <p className="font-body font-medium text-ink-800 truncate">{a.title}</p>
                  <p className="text-sm text-ink-500 truncate">{a.topic} · {a.group?.name}</p>
                </div>
                <span className={`flex-shrink-0 ml-4 text-xs font-mono px-2 py-1 rounded ${a.is_published ? 'bg-green-700/10 text-green-700' : 'bg-ink-600/10 text-ink-500'}`}>
                  {a.is_published ? 'Publicada' : 'Borrador'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
