import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { CONSENT_VERSION } from '@/lib/lec'

const RELATIONSHIPS = ['Madre', 'Padre', 'Tutor(a)', 'Otro']
const WHATSAPP = '444 421 1901'

export default function ConsentPage() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [guardianName, setGuardianName] = useState('')
  const [relationship, setRelationship] = useState('')
  const [google, setGoogle] = useState(false)
  const [voice, setVoice] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!profile?.id) return
    supabase.from('lec_consents').select('*').eq('student_id', profile.id).maybeSingle().then(({ data }) => {
      if (!data) return
      setGuardianName(data.guardian_name)
      setRelationship(data.relationship)
      setGoogle(data.accepts_google_services)
      setVoice(data.accepts_voice_recording)
    })
  }, [profile?.id])

  async function handleSave() {
    if (!profile?.id) return
    if (guardianName.trim().split(/\s+/).length < 2 || !relationship) {
      setError('Escribe el nombre completo y el parentesco.')
      return
    }
    setSaving(true)
    setError('')
    const { error } = await supabase.from('lec_consents').upsert({
      student_id: profile.id,
      guardian_name: guardianName.trim(),
      relationship,
      accepts_google_services: google,
      accepts_voice_recording: voice,
      consent_version: CONSENT_VERSION,
      accepted_at: new Date().toISOString(),
    })
    setSaving(false)
    if (error) {
      console.error(error)
      setError('No se pudo guardar. Revisa tu conexión e inténtalo de nuevo.')
      return
    }
    navigate('/student', { replace: true })
  }

  return (
    <div className="min-h-screen bg-sepia-100 p-4 sm:p-6">
      <div className="max-w-2xl mx-auto space-y-4">
        <button onClick={() => navigate('/student')} className="font-body text-xs text-ink-400 hover:text-ink-600">← Volver</button>

        <div className="bg-gold-300/30 border border-gold-400 rounded-xl p-4">
          <p className="font-body text-sm text-ink-800">
            <strong>Esta pantalla es para tu mamá, papá o tutor.</strong> Pídele que la lea y la llene contigo.
          </p>
        </div>

        <div className="bg-parchment-50 border border-parchment-200 rounded-xl p-5 space-y-4">
          <h1 className="font-display text-xl font-bold text-ink-900">Consentimiento de la familia · ciclo 2026-2027</h1>

          <section className="bg-white border border-parchment-200 rounded-lg p-4">
            <p className="font-display font-semibold text-ink-800">1. Servicios de Google para el aprendizaje</p>
            <p className="font-body text-sm text-ink-600 mt-1">
              Además de Classroom, Drive y Meet, la escuela habilitó en la cuenta institucional de tu hija(o):
              YouTube (videos de clase), Google Maps y My Maps (Historia, Geografía y Ciencias),
              Google Arts &amp; Culture (museos y arte), Google Traductor (Inglés) y la Búsqueda de Google (investigar tareas).
            </p>
          </section>

          <section className="bg-white border border-parchment-200 rounded-lg p-4">
            <p className="font-display font-semibold text-ink-800">2. LectorNKT: lectura en voz alta</p>
            <ul className="font-body text-sm text-ink-600 mt-1 space-y-1 list-disc ml-5">
              <li>En algunas lecturas tu hija(o) se grabará leyendo en voz alta durante un minuto, para que su docente la escuche y le ayude a mejorar.</li>
              <li>Solo la escuchan las y los docentes de Aprende NKT.</li>
              <li>Se guarda en el Google Drive institucional de tu hija(o), en la carpeta "LectorNKT". No se publica.</li>
              <li>Se borra al terminar el ciclo escolar; solo se conservan sus resultados de lectura.</li>
              <li>No se usa con fines comerciales ni se comparte con otras empresas.</li>
              <li>Si no aceptas, tu hija(o) puede seguir usando LectorNKT con lecturas en silencio.</li>
            </ul>
          </section>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <label className="sm:col-span-2 block">
              <span className="font-body text-sm font-semibold text-ink-800">Nombre completo de la madre, padre o tutor</span>
              <input
                value={guardianName}
                onChange={e => setGuardianName(e.target.value)}
                className="mt-1 w-full font-body text-sm bg-white border border-parchment-300 rounded-lg px-3 py-2"
              />
            </label>
            <label className="block">
              <span className="font-body text-sm font-semibold text-ink-800">Parentesco</span>
              <select
                value={relationship}
                onChange={e => setRelationship(e.target.value)}
                className="mt-1 w-full font-body text-sm bg-white border border-parchment-300 rounded-lg px-3 py-2"
              >
                <option value="">Elegir...</option>
                {RELATIONSHIPS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </label>
          </div>

          <label className="flex items-start gap-2 font-body text-sm text-ink-800">
            <input type="checkbox" checked={google} onChange={e => setGoogle(e.target.checked)} className="mt-1" />
            Acepto que mi hija(o) use los servicios de Google para el aprendizaje descritos arriba con su cuenta institucional.
          </label>
          <label className="flex items-start gap-2 font-body text-sm text-ink-800">
            <input type="checkbox" checked={voice} onChange={e => setVoice(e.target.checked)} className="mt-1" />
            Acepto que mi hija(o) grabe su lectura en voz alta en LectorNKT, que sus docentes la escuchen y que se guarde en su Drive institucional hasta el fin del ciclo escolar.
          </label>

          {error && <p className="font-body text-sm text-crimson-500">{error}</p>}

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-teal-600 text-white font-body font-semibold py-3 rounded-xl hover:bg-teal-500 disabled:opacity-50"
          >
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
          <p className="font-body text-xs text-ink-500 text-center">
            Puedes cambiar tu decisión cuando quieras escribiendo al WhatsApp {WHATSAPP}.
          </p>
        </div>
      </div>
    </div>
  )
}
