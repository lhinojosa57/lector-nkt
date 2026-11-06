import { speechSupported, useSpeech } from '@/lib/speech'

/** Botón "Escuchar": la app lee el texto en voz alta. */
export default function SpeakButton({ text, lang, label = 'Escuchar', onUse }: {
  text: string
  lang: string
  label?: string
  onUse?: () => void
}) {
  const { speak, stop, speaking } = useSpeech(lang)
  if (!speechSupported) return null
  return (
    <button
      type="button"
      onClick={() => (speaking ? stop() : speak(text, onUse))}
      aria-pressed={speaking}
      className="font-body text-xs px-3 py-1.5 rounded-lg border border-parchment-300 text-ink-700 bg-white hover:bg-parchment-100 inline-flex items-center gap-1"
    >
      <span aria-hidden>{speaking ? '⏹' : '🔊'}</span>
      {speaking ? 'Detener' : label}
    </button>
  )
}
