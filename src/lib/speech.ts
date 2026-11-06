import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Lectura en voz de la app con las voces del navegador (speechSynthesis).
 * El texto se divide en oraciones porque algunas voces se cortan con textos largos.
 */

export const speechSupported = typeof window !== 'undefined' && 'speechSynthesis' in window

function pickVoice(lang: string): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices()
  const prefs = lang === 'en' ? ['en-US', 'en-GB', 'en'] : ['es-MX', 'es-US', 'es-419', 'es']
  for (const p of prefs) {
    const v = voices.find(v => v.lang.replace('_', '-').toLowerCase().startsWith(p.toLowerCase()))
    if (v) return v
  }
  return null
}

function sentences(text: string): string[] {
  return text
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?…:;])\s+/)
    .map(s => s.trim())
    .filter(Boolean)
}

export function useSpeech(lang: string) {
  const [speaking, setSpeaking] = useState(false)
  const runId = useRef(0)

  const stop = useCallback(() => {
    runId.current += 1
    if (speechSupported) window.speechSynthesis.cancel()
    setSpeaking(false)
  }, [])

  useEffect(() => () => { if (speechSupported) window.speechSynthesis.cancel() }, [])

  const speak = useCallback((text: string, onStart?: () => void) => {
    if (!speechSupported) return
    window.speechSynthesis.cancel()
    const id = ++runId.current
    const parts = sentences(text)
    const voice = pickVoice(lang)
    let i = 0
    setSpeaking(true)
    onStart?.()
    const next = () => {
      if (id !== runId.current) return
      if (i >= parts.length) { setSpeaking(false); return }
      const u = new SpeechSynthesisUtterance(parts[i++])
      u.lang = lang === 'en' ? 'en-US' : 'es-MX'
      if (voice) u.voice = voice
      u.rate = 0.9
      u.onend = next
      u.onerror = () => { if (id === runId.current) setSpeaking(false) }
      window.speechSynthesis.speak(u)
    }
    next()
  }, [lang])

  return { speak, stop, speaking }
}
