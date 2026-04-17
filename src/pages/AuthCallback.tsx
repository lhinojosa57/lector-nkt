import { useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function AuthCallback() {
  useEffect(() => {
    async function handleCallback() {
      const { data, error } = await supabase.auth.getSession()
      if (error || !data.session) {
        setTimeout(async () => {
          const { data: retry } = await supabase.auth.getSession()
          if (retry.session) {
            await redirect(retry.session.user.email ?? '')
          } else {
            window.location.href = '/login'
          }
        }, 2000)
        return
      }
      await redirect(data.session.user.email ?? '')
    }

    async function redirect(email: string) {
      // El trigger set_role_on_profile_update ya asignó el rol
      // Solo esperamos un momento y redirigimos
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('email', email)
        .single()
      
      const role = profile?.role ?? 'student'
      window.location.href = role === 'teacher' ? '/teacher' : '/student'
    }

    handleCallback()
  }, [])

  return (
    <div className="flex items-center justify-center min-h-screen bg-sepia-100">
      <div className="text-center">
        <div className="spinner mx-auto mb-4" />
        <p className="font-body text-ink-600 text-lg">Verificando acceso...</p>
        <p className="font-body text-ink-400 text-sm mt-1">Iniciando sesión con Google Workspace</p>
      </div>
    </div>
  )
}
