import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import { useEnrollmentStatus } from '@/lib/useEnrollmentStatus'
import LoginPage from '@/pages/LoginPage'
import AuthCallback from '@/pages/AuthCallback'
import DiagnosticPage from '@/pages/diagnostic/DiagnosticPage'
import StudentDashboard from '@/pages/student/StudentDashboard'
import Students from '@/pages/teacher/Students'
import TeacherGroupsLector from '@/pages/teacher/TeacherGroupsLector'
import SessionPage from '@/pages/session/SessionPage'
import Library from '@/pages/teacher/Library'
import ReadingDetail from '@/pages/teacher/ReadingDetail'
import Assignments from '@/pages/teacher/Assignments'
import AssignmentResults from '@/pages/teacher/AssignmentResults'
import PdaPanel from '@/pages/teacher/PdaPanel'
import Settings from '@/pages/teacher/Settings'
import StudentLibrary from '@/pages/student/StudentLibrary'
import ReadingSession from '@/pages/student/ReadingSession'
import ConsentPage from '@/pages/student/ConsentPage'
import FluencyQueue from '@/pages/teacher/FluencyQueue'
import FluencyReview from '@/pages/teacher/FluencyReview'

function ProtectedRoute({ children, role }: { children: React.ReactNode; role?: string }) {
  const { user, profile, loading, signOut } = useAuth()
  const enrollment = useEnrollmentStatus(profile?.role === 'student' ? profile.id : undefined)

  if (loading || enrollment.loading) {
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
  if (!profile?.role) return null
  if (role && profile.role !== role) {
    return <Navigate to={profile.role === 'teacher' ? '/teacher' : '/student'} replace />
  }
  if (profile.role === 'student' && enrollment.status === 'baja') {
    return (
      <div className="min-h-screen bg-sepia-100 flex items-center justify-center p-6">
        <div role="alert" className="max-w-md bg-parchment-50 border border-parchment-200 rounded-xl p-6 text-center space-y-4">
          <p className="font-body text-ink-800">Tu cuenta ya no está activa en LectorNKT. Si es un error, avisa a tu docente.</p>
          <button onClick={signOut} className="font-body text-sm px-4 py-2 rounded-lg bg-ink-800 text-parchment-50 hover:bg-ink-700">
            Cerrar sesión
          </button>
        </div>
      </div>
    )
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

      {/* El docente entra directo a la Biblioteca. */}
      <Route path="/teacher" element={<Navigate to="/teacher/library" replace />} />

      <Route path="/teacher/students" element={
        <ProtectedRoute role="teacher">
          <Students />
        </ProtectedRoute>
      } />

      <Route path="/teacher/fluency" element={
        <ProtectedRoute role="teacher">
          <FluencyQueue />
        </ProtectedRoute>
      } />

      <Route path="/teacher/fluency/:attemptId" element={
        <ProtectedRoute role="teacher">
          <FluencyReview />
        </ProtectedRoute>
      } />

      <Route path="/teacher/groups" element={
        <ProtectedRoute role="teacher">
          <TeacherGroupsLector />
        </ProtectedRoute>
      } />

      <Route path="/teacher/library" element={
        <ProtectedRoute role="teacher">
          <Library />
        </ProtectedRoute>
      } />

      <Route path="/teacher/library/:readingId" element={
        <ProtectedRoute role="teacher">
          <ReadingDetail />
        </ProtectedRoute>
      } />

      <Route path="/teacher/assignments" element={
        <ProtectedRoute role="teacher">
          <Assignments />
        </ProtectedRoute>
      } />

      <Route path="/teacher/pda" element={
        <ProtectedRoute role="teacher">
          <PdaPanel />
        </ProtectedRoute>
      } />

      <Route path="/teacher/settings" element={
        <ProtectedRoute role="teacher">
          <Settings />
        </ProtectedRoute>
      } />

      <Route path="/teacher/assignments/:assignmentId/results" element={
        <ProtectedRoute role="teacher">
          <AssignmentResults />
        </ProtectedRoute>
      } />

      <Route path="/student" element={
        <ProtectedRoute role="student">
          <StudentDashboard />
        </ProtectedRoute>
      } />

      <Route path="/student/library" element={
        <ProtectedRoute role="student">
          <StudentLibrary />
        </ProtectedRoute>
      } />

      <Route path="/student/read/:assignmentId" element={
        <ProtectedRoute role="student">
          <ReadingSession />
        </ProtectedRoute>
      } />

      <Route path="/student/practice/:readingId" element={
        <ProtectedRoute role="student">
          <ReadingSession />
        </ProtectedRoute>
      } />

      <Route path="/student/consent" element={
        <ProtectedRoute role="student">
          <ConsentPage />
        </ProtectedRoute>
      } />

      <Route path="/" element={
        user && profile
          ? <Navigate to={profile.role === 'teacher' ? '/teacher' : '/student'} replace />
          : <Navigate to="/login" replace />
      } />
      
      <Route path="/diagnostic" element={
        <ProtectedRoute role="student">
          <DiagnosticPage />
        </ProtectedRoute>
      } />
      <Route path="*" element={<Navigate to="/" replace />} />

      <Route path="/student/session" element={
        <ProtectedRoute role="student">
          <SessionPage />
        </ProtectedRoute>
      } />

    </Routes>
  )
}