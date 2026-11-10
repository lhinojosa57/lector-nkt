import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/lib/auth'
import { fold } from '@/lib/teacherShelves'
import { CAMPOS, comparePda, fetchPdaCatalog, fetchReadingPdas, setReadingPdas, type Pda } from '@/lib/pda'

const MAX_RESULTS = 50
const btnPrimary = 'font-body text-sm px-3 py-2 rounded-lg bg-teal-600 text-white hover:bg-teal-500 disabled:opacity-50'
const btnOutline = 'font-body text-sm px-3 py-2 rounded-lg border border-parchment-300 bg-white text-ink-700 hover:bg-parchment-100'
const selectClass = 'font-body text-sm bg-white border border-parchment-300 rounded-lg px-2 py-1.5 text-ink-700'

const gradeLabel = (g: Pda['grade']) => (g === null ? '1°, 2° y 3°' : `${g}°`)

/** "PDA que trabaja esta lectura": lista agrupada y selector con búsqueda. Solo docentes. */
export default function PdaPicker({ readingId }: { readingId: string }) {
  const { profile } = useAuth()
  const [chosen, setChosen] = useState<Pda[]>([])
  const [catalog, setCatalog] = useState<Pda[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)
  const [q, setQ] = useState('')
  const [campo, setCampo] = useState('')
  const [disciplina, setDisciplina] = useState('')
  const [grade, setGrade] = useState('')

  useEffect(() => {
    let cancelled = false
    fetchReadingPdas(readingId)
      .then(p => { if (!cancelled) setChosen(p) })
      .catch(err => {
        console.error(err)
        if (!cancelled) setError('No se pudieron cargar los PDA de esta lectura.')
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [readingId])

  async function openEditor() {
    setNotice('')
    setDraft(new Set(chosen.map(p => p.id)))
    setEditing(true)
    if (!catalog) {
      try {
        setCatalog(await fetchPdaCatalog())
      } catch (err) {
        console.error(err)
        setError('No se pudo cargar el catálogo de PDA.')
      }
    }
  }

  const disciplinas = campo ? CAMPOS.find(c => c.campo === campo)?.disciplinas ?? [] : CAMPOS.flatMap(c => c.disciplinas)
  const results = useMemo(() => {
    if (!catalog) return []
    const f = fold(q.trim())
    return catalog.filter(p =>
      (!campo || p.campo === campo) &&
      (!disciplina || p.disciplina === disciplina) &&
      (!grade || p.grade === null || String(p.grade) === grade) &&
      (!f || fold(`${p.code} ${p.text} ${p.contenido_text ?? ''}`).includes(f)))
  }, [catalog, q, campo, disciplina, grade])

  function toggle(id: string) {
    setDraft(d => {
      const n = new Set(d)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  }

  async function save() {
    setSaving(true)
    setError('')
    try {
      await setReadingPdas(readingId, [...draft], profile?.id ?? null)
      const all = catalog ?? []
      setChosen(all.filter(p => draft.has(p.id)).sort(comparePda))
      setEditing(false)
      setNotice('PDA guardados ✓')
    } catch (err) {
      console.error(err)
      setError('No se pudieron guardar los PDA. Inténtalo de nuevo.')
    } finally {
      setSaving(false)
    }
  }

  async function remove(id: string) {
    setError('')
    const next = chosen.filter(p => p.id !== id)
    try {
      await setReadingPdas(readingId, next.map(p => p.id), profile?.id ?? null)
      setChosen(next)
    } catch (err) {
      console.error(err)
      setError('No se pudo quitar el PDA.')
    }
  }

  // Agrupado por campo → disciplina
  const grouped = CAMPOS.map(c => ({
    campo: c.campo,
    disciplinas: c.disciplinas
      .map(d => ({ disciplina: d, pdas: chosen.filter(p => p.disciplina === d) }))
      .filter(d => d.pdas.length > 0),
  })).filter(c => c.disciplinas.length > 0)

  return (
    <section aria-labelledby="pda-title" className="bg-parchment-50 border border-parchment-200 rounded-xl p-5 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 id="pda-title" className="font-display font-semibold text-ink-800">PDA que trabaja esta lectura</h2>
          <p className="font-body text-xs text-ink-500">Puede ser de varias disciplinas, campos y grados. Los estudiantes no lo ven.</p>
        </div>
        {!editing && <button onClick={() => void openEditor()} className={btnOutline}>+ Agregar PDA</button>}
      </div>

      {error && <p role="alert" className="font-body text-sm text-crimson-500">{error}</p>}
      {notice && <p role="status" className="font-body text-sm text-teal-800">{notice}</p>}

      {loading ? (
        <div className="py-4 flex justify-center"><div className="spinner" /></div>
      ) : chosen.length === 0 ? (
        <p className="font-body text-sm text-ink-500">Todavía no tiene PDA. Sin PDA, sus asignaciones no suman al cumplimiento.</p>
      ) : (
        <div className="space-y-3">
          {grouped.map(c => (
            <div key={c.campo}>
              <p className="font-body text-xs uppercase tracking-wide text-ink-400">{c.campo}</p>
              {c.disciplinas.map(d => (
                <div key={d.disciplina} className="mt-1">
                  <p className="font-body text-sm font-semibold text-ink-800">{d.disciplina}</p>
                  <ul className="space-y-1 mt-1">
                    {d.pdas.map(p => (
                      <li key={p.id} className="flex items-start gap-2 font-body text-sm text-ink-700">
                        <span className="flex-1 min-w-0">
                          <span className="font-mono text-xs text-ink-500">{p.code}</span> · {p.text}
                          <span className="ml-1 text-xs text-ink-400">({gradeLabel(p.grade)})</span>
                        </span>
                        <button onClick={() => void remove(p.id)} className="font-body text-xs text-crimson-500 hover:text-crimson-600 shrink-0" aria-label={`Quitar ${p.code}`}>
                          Quitar
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {editing && (
        <div className="border-t border-parchment-200 pt-3 space-y-3">
          <div className="flex flex-wrap gap-2">
            <input
              type="search"
              aria-label="Buscar PDA"
              placeholder="Buscar por código o texto…"
              value={q}
              onChange={e => setQ(e.target.value)}
              className="font-body text-sm flex-1 min-w-[180px] bg-white border border-parchment-300 rounded-lg px-3 py-1.5"
            />
            <select aria-label="Campo formativo" value={campo} onChange={e => { setCampo(e.target.value); setDisciplina('') }} className={selectClass}>
              <option value="">Todos los campos</option>
              {CAMPOS.map(c => <option key={c.campo} value={c.campo}>{c.campo}</option>)}
            </select>
            <select aria-label="Disciplina" value={disciplina} onChange={e => setDisciplina(e.target.value)} className={selectClass}>
              <option value="">Todas las disciplinas</option>
              {disciplinas.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <select aria-label="Grado" value={grade} onChange={e => setGrade(e.target.value)} className={selectClass}>
              <option value="">Todos los grados</option>
              <option value="1">1°</option>
              <option value="2">2°</option>
              <option value="3">3°</option>
            </select>
          </div>

          {!catalog ? (
            <div className="py-4 flex justify-center"><div className="spinner" /></div>
          ) : (
            <>
              <p className="font-body text-xs text-ink-500">
                {results.length} resultado{results.length === 1 ? '' : 's'}{results.length > MAX_RESULTS ? ` · se muestran ${MAX_RESULTS}; afina la búsqueda` : ''} · {draft.size} elegido{draft.size === 1 ? '' : 's'}
              </p>
              <ul className="max-h-80 overflow-y-auto divide-y divide-parchment-200 border border-parchment-200 rounded-lg bg-white">
                {results.slice(0, MAX_RESULTS).map(p => (
                  <li key={p.id}>
                    <label className="flex items-start gap-2 px-3 py-2 cursor-pointer hover:bg-parchment-50">
                      <input type="checkbox" className="mt-1" checked={draft.has(p.id)} onChange={() => toggle(p.id)} />
                      <span className="font-body text-sm text-ink-800">
                        <span className="font-mono text-xs text-ink-500">{p.code}</span> · {p.text}
                        <span className="block text-xs text-ink-400">{p.disciplina} · {gradeLabel(p.grade)}{p.contenido_text ? ` · ${p.contenido_text}` : ''}</span>
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            </>
          )}

          <div className="flex gap-2 justify-end">
            <button onClick={() => setEditing(false)} className={btnOutline}>Cancelar</button>
            <button onClick={() => void save()} disabled={saving || !catalog} className={btnPrimary}>{saving ? 'Guardando…' : 'Guardar'}</button>
          </div>
        </div>
      )}
    </section>
  )
}
