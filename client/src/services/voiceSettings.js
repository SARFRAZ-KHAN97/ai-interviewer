const STORAGE_KEY = 'aiiv.voice'

export const defaultVoiceSettings = {
  enabled: true,
  voiceURI: '',
  rate: 1,
  autoListen: true,
  captions: true,
}

export function loadVoiceSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...defaultVoiceSettings }
    const parsed = JSON.parse(raw)
    return { ...defaultVoiceSettings, ...parsed }
  } catch {
    return { ...defaultVoiceSettings }
  }
}

export function saveVoiceSettings(settings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  } catch {
    // storage unavailable (private mode) — settings stay in memory
  }
}

export function findVoice(voices, voiceURI) {
  if (!voiceURI) return null
  return voices.find((voice) => voice.voiceURI === voiceURI) || null
}

const primaryOf = (code) =>
  String(code || '').toLowerCase().replace('_', '-').split('-')[0]

export function sameLangPrimary(a, b) {
  const pa = primaryOf(a)
  const pb = primaryOf(b)
  return Boolean(pa && pb && pa === pb)
}

export function pickBestVoice(voices, langPrefix = 'en') {
  const lang = (langPrefix || 'en').toLowerCase().replace('_', '-')
  const primary = primaryOf(lang)
  const matching = voices.filter(
    (voice) => primaryOf(voice.lang) === primary,
  )
  if (matching.length === 0) return null
  if (primary === 'en') {
    const googleUkFemale = matching.find((voice) =>
      /google uk english female/i.test(voice.name),
    )
    if (googleUkFemale) return googleUkFemale
  }
  return (
    matching.find((voice) => /natural|neural|premium|enhanced/i.test(voice.name)) ||
    matching.find((voice) => voice.default) ||
    matching.find((voice) => voice.localService) ||
    matching[0]
  )
}
