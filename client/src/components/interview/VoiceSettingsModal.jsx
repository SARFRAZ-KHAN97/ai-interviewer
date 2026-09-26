import { useMemo, useState } from 'react'
import { sameLangPrimary } from '../../services/voiceSettings'

function Toggle({ id, checked, onChange, label, hint }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <label htmlFor={id} className="text-sm font-medium text-slate-700">
          {label}
        </label>
        {hint && <p className="mt-0.5 text-xs text-slate-400">{hint}</p>}
      </div>
      <button
        type="button"
        id={id}
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition ${
          checked ? 'bg-gradient-to-r from-indigo-600 to-violet-600' : 'bg-slate-300'
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
            checked ? 'left-[22px]' : 'left-0.5'
          }`}
        />
      </button>
    </div>
  )
}

export default function VoiceSettingsModal({
  settings,
  voices,
  supported,
  preferredLang = 'en-US',
  onPreview,
  onSave,
  onClose,
}) {
  const [draft, setDraft] = useState(() => ({ ...settings }))
  const [search, setSearch] = useState('')

  const selectedVoice = voices.find((voice) => voice.voiceURI === draft.voiceURI)
  const voiceMismatch = Boolean(
    draft.voiceURI &&
      selectedVoice &&
      !sameLangPrimary(selectedVoice.lang, preferredLang),
  )

  const voiceOptions = useMemo(() => {
    const query = search.trim().toLowerCase()
    const filtered = voices.filter(
      (voice) =>
        !query ||
        voice.name.toLowerCase().includes(query) ||
        (voice.lang || '').toLowerCase().includes(query),
    )
    const preferredPrefix = preferredLang.toLowerCase().replace('_', '-').split('-')[0]
    const groups = new Map()
    for (const voice of filtered) {
      const key = voice.lang || 'Other'
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key).push(voice)
    }
    const sorted = [...groups.entries()].sort(([a], [b]) => {
      const aPreferred = a.toLowerCase().replace('_', '-').startsWith(preferredPrefix) ? 0 : 1
      const bPreferred = b.toLowerCase().replace('_', '-').startsWith(preferredPrefix) ? 0 : 1
      if (aPreferred !== bPreferred) return aPreferred - bPreferred
      return a.localeCompare(b)
    })
    for (const [, list] of sorted) {
      list.sort((x, y) => x.name.localeCompare(y.name))
    }
    return sorted
  }, [voices, search, preferredLang])

  const update = (patch) => setDraft((prev) => ({ ...prev, ...patch }))

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Voice settings"
        className="card max-h-[85vh] w-full max-w-lg overflow-y-auto p-6"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Voice settings</h2>
            <p className="mt-1 text-sm text-slate-500">
              Choose how the interviewer speaks to you.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close voice settings"
            className="btn btn-ghost h-8 w-8 rounded-full px-0 text-slate-400"
          >
            ✕
          </button>
        </div>

        {!supported ? (
          <p className="mt-5 rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-500">
            Speech output isn&apos;t supported in this browser — questions will only
            appear as text. Chrome and Edge work best.
          </p>
        ) : (
          <div className="mt-5 space-y-5">
            <Toggle
              id="voice-enabled"
              checked={draft.enabled}
              onChange={(enabled) => update({ enabled })}
              label="Read questions aloud"
              hint="The interviewer speaks the intro and each question"
            />

            <div className={draft.enabled ? '' : 'pointer-events-none opacity-50'}>
              <label className="label" htmlFor="voice-select">
                Voice
              </label>
              <div className="flex gap-2">
                <select
                  id="voice-select"
                  className="input flex-1"
                  value={draft.voiceURI}
                  onChange={(event) => update({ voiceURI: event.target.value })}
                >
                  <option value="">Automatic — best match for this language</option>
                  {voiceOptions.map(([lang, list]) => (
                    <optgroup key={lang} label={lang}>
                      {list.map((voice) => (
                        <option key={voice.voiceURI} value={voice.voiceURI}>
                          {voice.name}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                <button
                  type="button"
                  className="btn btn-secondary shrink-0"
                  onClick={() =>
                    onPreview({ voiceURI: draft.voiceURI, rate: draft.rate })
                  }
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
                    <path d="M11 5 6 9H3v6h3l5 4V5zM15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" />
                  </svg>
                  Preview
                </button>
              </div>
              {voiceMismatch && (
                <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-700">
                  This voice doesn&apos;t match the interview language (
                  {preferredLang}) — a matching voice will be used automatically
                  for this interview.
                </p>
              )}
              <input
                type="search"
                className="input mt-2"
                placeholder="Search voices…"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />

              <div className="mt-4">
                <div className="flex items-center justify-between text-sm">
                  <label htmlFor="voice-rate" className="font-medium text-slate-700">
                    Speed
                  </label>
                  <span className="text-xs font-medium text-slate-500">
                    {draft.rate.toFixed(2)}×
                  </span>
                </div>
                <input
                  id="voice-rate"
                  type="range"
                  min={0.7}
                  max={1.3}
                  step={0.05}
                  value={draft.rate}
                  onChange={(event) => update({ rate: Number(event.target.value) })}
                  className="mt-2 w-full accent-indigo-600"
                />
              </div>

              <div className="mt-4 space-y-4 border-t border-slate-100 pt-4">
                <Toggle
                  id="voice-autolisten"
                  checked={draft.autoListen}
                  onChange={(autoListen) => update({ autoListen })}
                  label="Listen automatically"
                  hint="Start the microphone right after each question is read"
                />
                <Toggle
                  id="voice-captions"
                  checked={draft.captions}
                  onChange={(captions) => update({ captions })}
                  label="Show captions"
                  hint="Display the text while the interviewer is speaking"
                />
              </div>
            </div>

            <p className="text-xs text-slate-400">
              Voices come from your browser and operating system — install more in
              your system settings if you need them.
            </p>

            <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => onSave({ ...draft, rate: Number(draft.rate) })}
              >
                Save
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
