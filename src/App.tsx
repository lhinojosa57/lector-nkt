import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import LoginPage from '@/pages/LoginPage'
import AuthCallback from '@/pages/AuthCallback'

function ProtectedRoute({ children, role }: { children: React.ReactNode; role?: string }) {
  const { user, profile, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-sepia-100">
        <div className="text-center">
          <div className="spinner mx-auto mb-4" />
          <p className="font-body text-ink-600">Cargando...</p>
        </div>
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />
  if (!profile?.role) return <Navigate to="/login" replace />
  if (role && profile.role !== role) {
    return <Navigate to={profile.role === 'teacher' ? '/teacher' : '/student'} replace />
  }

  return <>{children}</>
}

export default function App() {
  const { user, profile, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-sepia-100">
        <div className="spinner mx-auto" />
      </div>
    )
  }

  return (
    <Routes>
      <Route path="/login" element={
        user && profile
          ? <Navigate to={profile.role === 'teacher' ? '/teacher' : '/student'} replace />
          : <LoginPage />
      } />
      <Route path="/auth/callback" element={<AuthCallback />} />

      {/* Teacher routes — por construir */}
      <Route path="/teacher" element={
        <ProtectedRoute role="teacher">
          <div className="flex items-center justify-center min-h-screen">
            <p className="text-ink-600 font-body">Panel docente — próximamente</p>
          </div>
        </ProtectedRoute>
      } />

      {/* Student routes — por construir */}
      <Route path="/student" element={
        <ProtectedRoute role="student">
          <div className="flex items-center justify-center min-h-screen">
          <p className="text-ink-600 font-body">Panel estudiante — próximamente</p>
          </div>
        </ProtectedRoute>
      } />

      <Route path="/" element={
        user && profile
          ? <Navigate to={profile.role === 'teacher' ? '/teacher' : '/student'} replace />
          : <Navigate to="/login" replace />
      } />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}