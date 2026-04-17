import { useAuth } from '@/lib/auth'

export default function LoginPage() {
  const { signInWithGoogle } = useAuth()

  return (
    <div className="min-h-screen bg-sepia-100 paper-texture flex items-center justify-center p-4">
      {/* Decorative border */}
      <div className="absolute inset-4 border border-gold-400/30 pointer-events-none rounded-sm hidden md:block" />

      <div className="w-full max-w-md animate-fade-in">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-12 h-12 bg-crimson-500 rounded flex items-center justify-center shadow-manuscript">
              <svg viewBox="0 0 24 24" className="w-7 h-7 text-parchment-50 fill-current">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
              </svg>
            </div>
            <h1 className="font-display text-4xl font-bold text-ink-900 tracking-tight">
              VideoNKT
            </h1>
          </div>
          <p className="font-body text-ink-600 text-lg italic">
            Plataforma de video interactivo
          </p>
          <div className="flex items-center justify-center gap-3 mt-3">
            <div className="h-px flex-1 bg-gold-400/40" />
            <span className="text-gold-500 text-xs font-mono uppercase tracking-widest">Colegio Nikola Tesla</span>
            <div className="h-px flex-1 bg-gold-400/40" />
          </div>
        </div>

        {/* Card */}
        <div className="bg-parchment-50 rounded-sm shadow-raised p-8 border border-parchment-200">
          <h2 className="font-display text-2xl text-ink-800 mb-2 text-center">
            Bienvenido/a
          </h2>
          <p className="text-ink-600 text-sm text-center mb-8 font-body">
            Accede con tu cuenta de Google Workspace educativa
          </p>

          <button
            onClick={signInWithGoogle}
            className="w-full flex items-center justify-center gap-3 bg-white border border-parchment-300 rounded px-5 py-3.5 text-ink-800 font-body font-medium hover:bg-parchment-50 hover:border-gold-400 transition-all duration-200 shadow-manuscript hover:shadow-raised group"
          >
            <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            <span>Continuar con Google</span>
            <svg className="w-4 h-4 text-ink-400 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          <div className="mt-6 p-4 bg-sepia-100 rounded border border-parchment-200">
            <p className="text-xs text-ink-600 font-body text-center leading-relaxed">
              🔒 Solo se permite el acceso con cuentas{' '}
              <span className="font-semibold text-crimson-500">@nikolatesla.edu.mx</span>
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-ink-500 font-body mt-6">
          Al ingresar aceptas el uso educativo de esta plataforma
        </p>
      </div>
    </div>
  )
}
