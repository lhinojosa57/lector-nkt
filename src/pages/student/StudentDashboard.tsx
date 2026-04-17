import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../lib/auth'
import { supabase } from '../../lib/supabase'
import { PlayCircle, CheckCircle, Clock, BookOpen, Plus, X } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

export default function StudentDashboard() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [assignments, setAssignments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [joinCode, setJoinCode] = useState('')
  const [showJoin, setShowJoin] = useState(false)
  const [joining, setJoining] = useState(false)
  const [joinError, setJoinError] = useState('')

  async function load() {
    if (!profile) return
    const { data: memberships } = await supabase
      .from('group_members')
      .select('group_id')
      .eq('student_id', profile.id)

    const groupIds = (memberships ?? []).map((m: any) => m.group_id)

    if (groupIds.length === 0) {
      setAssignments([])
      setLoading(false)
      return
    }

    const { data } = await supabase
      .from('video_assignments')
      .select('*, group:groups(name), student_sessions(id, score, is_completed, started_at)')
      .in('group_id', groupIds)
      .eq('is_published', true)
      .eq('student_sessions.student_id', profile.id)
      .order('created_at', { ascending: false })

    setAssignments(data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [profile])

  const handleJoin = async () => {
    if (!joinCode.trim() || !profile) return
    setJoining(true)
    setJoinError('')
    const { data: group } = await supabase
      .from('groups')
      .select('id, name')
      .eq('invite_code', joinCode.trim().toUpperCase())
      .single()

    if (!group) {
      setJoinError('Código inválido. Verifica con tu docente.')
      setJoining(false)
      return
    }

    const { error } = await supabase.from('group_members').insert({ group_id: group.id, student_id: profile.id })
    if (error?.code === '23505') {
      setJoinError('Ya eres miembro de este grupo.')
    } else {
      setShowJoin(false)
      setJoinCode('')
      load()
    }
    setJoining(false)
  }

  const getSession = (a: any) => a.student_sessions?.[0]

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl font-bold text-ink-900">
            Hola, {profile?.full_name?.split(' ')[0]} 📖
          </h1>
          <p className="font-body text-ink-600 mt-1">Tus actividades</p>
        </div>
        <button
          onClick={() => setShowJoin(true)}
          className="flex items-center gap-2 bg-gold-400 text-ink-900 px-4 py-2.5 rounded-sm font-body font-medium hover:bg-gold-300 transition-colors shadow-manuscript"
        >
          <Plus className="w-4 h-4" />
          Unirse a grupo
        </button>
      </div>

      {loading ? (
        <div className="grid gap-4">
          {[...Array(3)].map((_, i) => <div key={i} className="h-28 bg-parchment-200 rounded-sm animate-pulse" />)}
        </div>
      ) : assignments.length === 0 ? (
        <div className="text-center py-20 bg-parchment-50 rounded-sm border border-parchment-200 shadow-manuscript">
          <BookOpen className="w-16 h-16 mx-auto mb-4 text-parchment-300" />
          <p className="font-display text-xl text-ink-700 mb-2">Sin actividades todavía</p>
          <p className="font-body text-ink-500 mb-6">
            Únete a un grupo con el código que te dio tu docente
          </p>
          <button onClick={() => setShowJoin(true)} className="bg-gold-400 text-ink-900 px-5 py-2.5 rounded-sm font-body font-medium hover:bg-gold-300 transition-colors">
            Ingresar código
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {assignments.map((a: any) => {
            const session = getSession(a)
            const isDone = session?.is_completed
            const inProgress = session && !isDone
            return (
              <div
                key={a.id}
                className="bg-parchment-50 rounded-sm shadow-manuscript border border-parchment-200 p-5 hover:shadow-raised transition-shadow cursor-pointer"
                onClick={() => navigate(`/student/watch/${a.id}`)}
              >
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className={`w-12 h-12 rounded flex items-center justify-center flex-shrink-0 ${isDone ? 'bg-green-700/10' : inProgress ? 'bg-gold-400/20' : 'bg-crimson-500/10'}`}>
                    {isDone
                      ? <CheckCircle className="w-6 h-6 text-green-700" />
                      : inProgress
                      ? <Clock className="w-6 h-6 text-gold-600" />
                      : <PlayCircle className="w-6 h-6 text-crimson-500" />
                    }
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="font-display text-lg font-semibold text-ink-800">{a.title}</h3>
                        <p className="font-body text-sm text-ink-600 mt-0.5">{a.topic}</p>
                        <p className="text-xs text-ink-400 mt-1">{a.group?.name} · {format(new Date(a.created_at), "d 'de' MMMM, yyyy", { locale: es })}</p>
                      </div>
                      <div className="flex-shrink-0 text-right">
                        {isDone && (
                          <div>
                            <span className={`font-mono font-bold text-xl ${session.score >= 80 ? 'text-green-700' : session.score >= 60 ? 'text-gold-600' : 'text-crimson-500'}`}>
                              {Math.round(session.score)}
                            </span>
                            <span className="font-mono text-ink-400 text-sm">/100</span>
                          </div>
                        )}
                        {a.due_date && !isDone && (
                          <p className="text-xs text-crimson-500 font-body">
                            Entrega: {format(new Date(a.due_date), "d MMM", { locale: es })}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Arrow */}
                  <div className="flex-shrink-0 self-center text-ink-300">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>

                {/* Status bar */}
                <div className="mt-3 flex items-center gap-2">
                  <span className={`text-xs font-mono px-2 py-0.5 rounded ${
                    isDone ? 'bg-green-700/10 text-green-700'
                    : inProgress ? 'bg-gold-400/20 text-gold-600'
                    : 'bg-crimson-500/10 text-crimson-500'
                  }`}>
                    {isDone ? '✓ Completada' : inProgress ? '⏱ En progreso' : '▶ Sin iniciar'}
                  </span>
                  {a.objective && (
                    <span className="text-xs text-ink-400 font-body truncate">{a.objective}</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Join modal */}
      {showJoin && (
        <div className="fixed inset-0 bg-ink-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-parchment-50 rounded-sm shadow-raised w-full max-w-sm animate-slide-up border border-parchment-200">
            <div className="flex items-center justify-between p-6 border-b border-parchment-200">
              <h2 className="font-display text-xl font-semibold text-ink-800">Unirse a grupo</h2>
              <button onClick={() => { setShowJoin(false); setJoinError('') }} className="text-ink-400 hover:text-ink-700 p-1"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6">
              <p className="font-body text-sm text-ink-600 mb-4">Ingresa el código que te proporcionó tu docente</p>
              <input
                value={joinCode}
                onChange={e => setJoinCode(e.target.value.toUpperCase())}
                onKeyDown={e => e.key === 'Enter' && handleJoin()}
                placeholder="XXXXXXXX"
                maxLength={8}
                className="w-full border border-parchment-300 rounded px-4 py-3 font-mono text-xl text-center tracking-[0.3em] text-ink-800 bg-white focus:outline-none focus:border-gold-400 focus:ring-2 focus:ring-gold-400/20 uppercase"
              />
              {joinError && <p className="text-crimson-500 text-sm font-body mt-2">{joinError}</p>}
            </div>
            <div className="flex gap-3 p-6 pt-0">
              <button onClick={() => { setShowJoin(false); setJoinError('') }} className="flex-1 border border-parchment-300 text-ink-700 py-2.5 rounded-sm font-body hover:bg-sepia-100 transition-colors">Cancelar</button>
              <button onClick={handleJoin} disabled={!joinCode.trim() || joining} className="flex-1 bg-gold-400 text-ink-900 py-2.5 rounded-sm font-body font-medium hover:bg-gold-300 disabled:opacity-40 transition-colors">
                {joining ? 'Buscando…' : 'Unirse'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
