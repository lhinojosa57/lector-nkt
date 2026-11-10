import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth'
import TeacherHeader from '@/components/TeacherHeader'
import { fetchCycles, type Cycle } from '@/lib/pdaProgressApi'
import { fetchSettings, saveSettings, saveTerms, validateTerms, type Settings as S, type Term } from '@/lib/settingsApi'
import { formatDate } from '@/lib/lec'

const input = 'font-body text-sm bg-white border border-parchment-300 rounded-lg px-3 py-2 text-ink-800'
const btnPrimary = 'font-body text-sm px-4 py-2 rounded-lg bg-teal-600 text-white hover:bg-teal-500 disabled:opacity-50'
const btnOutline = 'font-body text-sm px-3 py-2 rounded-lg border border-parchment-300 bg-white text-ink-700 hover:bg-parchment-100'

export default function Settings() {
  const { profile } = useAuth()
  const [settings, setSettings] = useState<S>({ school_name: '', cct: '' })
  const [cycle, setCycle] = useState<Cycle | null>(null)
  const [terms, setTerms] = useState<Term[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [msgSchool, setMsgSchool] = useState('')
  const [msgTerms, setMsgTerms] = useState('')
  const [termsError, setTermsError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let cancelled = false
    Promise.all([fetchSettings(), fetchCycles()])
      .then(([s, cs]) => {
        if (cancelled) return
        setSettings({ school_name: s.school_name ?? '', cct: s.cct ?? '' })
        const cur = cs.find(c => c.is_current) ?? null
        setCycle(cur)
        setTerms(cur?.terms ?? [])
      })
      .catch(err => {
        console.error(err)
        if (!cancelled) setError('No se pudo cargar la configuración. ¿Ya se corrió el SQL de PDA?')
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  async function saveSchool() {
    setBusy(true)
    setMsgSchool('')
    try {
      await saveSettings(settings, profile?.id ?? null)
      setMsgSchool('Guardado ✓')
    } catch (err) {
      console.error(err)
      setMsgSchool('No se pudo guardar. Inténtalo de nuevo.')
    } finally {
      setBusy(false)
    }
  }

  async function saveAllTerms() {
    if (!cycle) return
    const problem = validateTerms(terms, cycle)
    setTermsError(problem ?? '')
    setMsgTerms('')
    if (problem) return
    setBusy(true)
    try {
      await saveTerms(cycle.cycle, terms)
      setMsgTerms('Trimestres guardados ✓')
    } catch (err) {
      console.error(err)
      setTermsError('No se pudieron guardar los trimestres.')
    } finally {
      setBusy(false)
    }
  }

  const setTerm = (i: number, k: keyof Term, v: string) => setTerms(ts => ts.map((t, j) => (j === i ? { ...t, [k]: v } : t)))

  return (
    <div className="min-h-screen bg-sepia-100">
      <TeacherHeader title="Configuración" />
      <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-5">
        {loading ? (
          <div className="p-10 flex justify-center"><div className="spinner" /></div>
        ) : error ? (
          <p role="alert" className="font-body text-sm text-crimson-500">{error}</p>
        ) : (
          <>
            <section aria-labelledby="escuela" className="bg-parchment-50 border border-parchment-200 rounded-xl p-5 space-y-3">
              <div>
                <h2 id="escuela" className="font-display font-semibold text-ink-800">Escuela</h2>
                <p className="font-body text-xs text-ink-500">Aparecen en el encabezado del Concentrado del Programa Sintético.</p>
              </div>
              <label className="block">
                <span className="font-body text-sm text-ink-700">Nombre de la escuela</span>
                <input className={`${input} w-full mt-1`} value={settings.school_name ?? ''} onChange={e => setSettings(s => ({ ...s, school_name: e.target.value }))} />
              </label>
              <label className="block">
                <span className="font-body text-sm text-ink-700">CCT</span>
                <input className={`${input} w-full mt-1 font-mono uppercase`} value={settings.cct ?? ''} onChange={e => setSettings(s => ({ ...s, cct: e.target.value }))} />
              </label>
              <div className="flex items-center gap-3">
                <button onClick={() => void saveSchool()} disabled={busy} className={btnPrimary}>Guardar</button>
                {msgSchool && <p role="status" className="font-body text-sm text-teal-800">{msgSchool}</p>}
              </div>
            </section>

            <section aria-labelledby="trimestres" className="bg-parchment-50 border border-parchment-200 rounded-xl p-5 space-y-3">
              <div>
                <h2 id="trimestres" className="font-display font-semibold text-ink-800">Trimestres del ciclo {cycle?.cycle ?? ''}</h2>
                <p className="font-body text-xs text-ink-500">
                  Sirven para elegir el periodo en el panel de PDA y en el Concentrado.
                  {cycle && ` El ciclo va del ${formatDate(cycle.starts_on)} al ${formatDate(cycle.ends_on)}.`}
                </p>
              </div>
              {!cycle ? (
                <p className="font-body text-sm text-ink-500">No hay un ciclo escolar actual configurado.</p>
              ) : (
                <>
                  {terms.length === 0 && <p className="font-body text-sm text-ink-500">Todavía no hay trimestres.</p>}
                  {terms.map((t, i) => (
                    <div key={i} className="flex flex-wrap items-end gap-2">
                      <label className="flex-1 min-w-[120px]">
                        <span className="font-body text-xs text-ink-600">Nombre</span>
                        <input className={`${input} w-full`} value={t.name} placeholder={`Trimestre ${i + 1}`} onChange={e => setTerm(i, 'name', e.target.value)} />
                      </label>
                      <label>
                        <span className="font-body text-xs text-ink-600 block">Inicio</span>
                        <input type="date" className={input} value={t.starts_on} onChange={e => setTerm(i, 'starts_on', e.target.value)} />
                      </label>
                      <label>
                        <span className="font-body text-xs text-ink-600 block">Fin</span>
                        <input type="date" className={input} value={t.ends_on} onChange={e => setTerm(i, 'ends_on', e.target.value)} />
                      </label>
                      <button onClick={() => setTerms(ts => ts.filter((_, j) => j !== i))} className="font-body text-xs text-crimson-500 hover:text-crimson-600 pb-2" aria-label={`Quitar ${t.name || `trimestre ${i + 1}`}`}>
                        Quitar
                      </button>
                    </div>
                  ))}
                  <div className="flex flex-wrap items-center gap-3">
                    <button onClick={() => setTerms(ts => [...ts, { name: `Trimestre ${ts.length + 1}`, starts_on: '', ends_on: '' }])} className={btnOutline}>
                      + Agregar trimestre
                    </button>
                    <button onClick={() => void saveAllTerms()} disabled={busy} className={btnPrimary}>Guardar trimestres</button>
                    {termsError && <p role="alert" className="font-body text-sm text-crimson-500">{termsError}</p>}
                    {msgTerms && <p role="status" className="font-body text-sm text-teal-800">{msgTerms}</p>}
                  </div>
                </>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  )
}
