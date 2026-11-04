import { NavLink } from 'react-router-dom'
import { useAuth } from '@/lib/auth'

const LINKS = [
  { to: '/teacher', label: 'Estudiantes', end: true },
  { to: '/teacher/library', label: 'Biblioteca', end: false },
  { to: '/teacher/assignments', label: 'Asignaciones', end: false },
  { to: '/teacher/groups', label: 'Grupos', end: false },
]

export default function TeacherHeader({ title }: { title: string }) {
  const { profile, signOut } = useAuth()

  return (
    <div className="bg-parchment-50 border-b border-parchment-200 px-4 sm:px-6 py-4">
      <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-bold text-ink-900">{title}</h1>
          <p className="font-body text-xs text-ink-500 mt-0.5">{profile?.full_name ?? profile?.email}</p>
        </div>
        <nav className="flex flex-wrap items-center gap-2">
          {LINKS.map(link => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) =>
                `font-body text-xs px-3 py-2 rounded-lg border transition-colors ${
                  isActive
                    ? 'bg-teal-600 border-teal-600 text-white'
                    : 'border-parchment-300 text-ink-600 hover:bg-parchment-100'
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
          <button
            onClick={signOut}
            className="font-body text-xs text-ink-400 hover:text-ink-600 transition-colors ml-2"
          >
            Cerrar sesión
          </button>
        </nav>
      </div>
    </div>
  )
}
