import { useEffect, useRef, useState } from 'react'
import ReadingCover from '@/components/ReadingCover'
import { COVER_ACCEPT, COVER_STEPS, coverPrompt, validateCoverFile } from '@/lib/covers'
import { toCoverBlob } from '@/lib/coverImage'
import { removeCover, uploadCover } from '@/lib/coverApi'
import type { LecReading } from '@/lib/lec'

/** Portada de la lectura en su detalle: subir, cambiar, quitar y copiar el prompt para Gemini. */
export default function CoverPanel({ reading, onChange }: {
  reading: LecReading
  onChange: (coverPath: string | null) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState<'' | 'subiendo' | 'quitando'>('')
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [manualPrompt, setManualPrompt] = useState<string | null>(null)
  const hasCover = !!reading.cover_path

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setError('')
    const invalid = validateCoverFile(file)
    if (invalid) {
      setError(invalid)
      return
    }
    setBusy('subiendo')
    try {
      const blob = await toCoverBlob(file)
      onChange(await uploadCover(reading, blob))
    } catch (err) {
      console.error(err)
      const msg = err instanceof Error ? err.message : ''
      setError(/^(No pudimos|Tu navegador)/.test(msg) ? msg : 'No se pudo subir la portada. Inténtalo de nuevo.')
    } finally {
      setBusy('')
    }
  }

  async function onRemove() {
    if (!window.confirm('¿Quitar la portada? Se mostrará la portada provisional.')) return
    setError('')
    setBusy('quitando')
    try {
      await removeCover(reading)
      onChange(null)
    } catch (err) {
      console.error(err)
      setError('No se pudo quitar la portada. Inténtalo de nuevo.')
    } finally {
      setBusy('')
    }
  }

  async function onCopy() {
    const text = coverPrompt(reading.title, reading.subject)
    try {
      await navigator.clipboard.writeText(text)
      setManualPrompt(null)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      setManualPrompt(text)
    }
  }

  const btn = 'font-body text-sm px-3 py-2 rounded-lg border border-parchment-300 text-ink-700 bg-white hover:bg-parchment-100 disabled:opacity-50'

  return (
    <div className="flex flex-col sm:flex-row gap-4 items-start">
      <ReadingCover title={reading.title} subject={reading.subject} coverPath={reading.cover_path} size="lg" />
      <div className="space-y-2 max-w-xs">
        {!hasCover && <span className="inline-block font-body text-xs px-2 py-1 rounded-full bg-parchment-200 text-ink-700">Portada provisional</span>}
        <div className="flex flex-wrap gap-2">
          <input ref={inputRef} type="file" accept={COVER_ACCEPT} onChange={onFile} className="hidden" aria-hidden tabIndex={-1} />
          <button onClick={() => inputRef.current?.click()} disabled={!!busy} className={`${btn} bg-teal-600 border-teal-600 text-white hover:bg-teal-500`}>
            {busy === 'subiendo' ? 'Subiendo portada…' : hasCover ? 'Cambiar portada' : '⬆ Subir portada'}
          </button>
          {hasCover && (
            <button onClick={onRemove} disabled={!!busy} className={btn}>
              {busy === 'quitando' ? 'Quitando…' : 'Quitar portada'}
            </button>
          )}
          <button onClick={onCopy} className={btn}>📋 Copiar prompt para Gemini</button>
        </div>
        <p className="font-body text-xs text-ink-500">{COVER_STEPS}</p>
        <p aria-live="polite" className="font-body text-xs text-teal-700">{copied ? 'Prompt copiado' : ''}</p>
        {manualPrompt && <ManualPrompt text={manualPrompt} />}
        {error && <p role="alert" className="font-body text-sm text-crimson-500">{error}</p>}
      </div>
    </div>
  )
}

function ManualPrompt({ text }: { text: string }) {
  const ref = useRef<HTMLTextAreaElement>(null)
  useEffect(() => { ref.current?.select() }, [])
  return (
    <div className="space-y-1">
      <p className="font-body text-xs text-ink-700">Cópialo con Ctrl+C:</p>
      <textarea ref={ref} readOnly value={text} rows={5} aria-label="Prompt para Gemini"
        className="w-full font-body text-xs border border-parchment-300 rounded-lg p-2 bg-white text-ink-800" />
    </div>
  )
}
