import { useCallback, useEffect, useRef, useState } from 'react'
import { findVoice, pickBestVoice, sameLangPrimary } from '../services/voiceSettings'

const clampRate = (rate) => Math.min(1.5, Math.max(0.5, Number(rate) || 1))

export function useSpeechSynthesis({ lang = 'en-US', voiceURI = '', rate = 1 } = {}) {
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window

  const [voices, setVoices] = useState([])
  const [speaking, setSpeaking] = useState(false)

  const voicesRef = useRef([])
  const optsRef = useRef({ lang, voiceURI, rate })
  const tokenRef = useRef(0)
  const watchdogRef = useRef(null)

  useEffect(() => {
    optsRef.current = { lang, voiceURI, rate }
  }, [lang, voiceURI, rate])

  const clearWatchdog = useCallback(() => {
    if (watchdogRef.current) {
      clearInterval(watchdogRef.current)
      watchdogRef.current = null
    }
  }, [])

  const stop = useCallback(() => {
    tokenRef.current += 1
    clearWatchdog()
    setSpeaking(false)
    try {
      window.speechSynthesis?.cancel()
    } catch {
      // synthesis already idle
    }
  }, [clearWatchdog])

  useEffect(() => {
    if (!supported) return undefined
    const synth = window.speechSynthesis
    const load = () => {
      const list = synth.getVoices()
      voicesRef.current = list
      setVoices(list)
    }
    load()
    synth.addEventListener('voiceschanged', load)
    return () => {
      synth.removeEventListener('voiceschanged', load)
      tokenRef.current += 1
      clearWatchdog()
      synth.cancel()
    }
  }, [supported, clearWatchdog])

  const speak = useCallback(
    (text, { onEnd, voiceURI: overrideURI, rate: overrideRate, lang: overrideLang } = {}) => {
      if (!supported || !text) {
        onEnd?.()
        return
      }
      const synth = window.speechSynthesis
      if (voicesRef.current.length === 0) {
        const fresh = synth.getVoices()
        if (fresh.length) voicesRef.current = fresh
      }
      tokenRef.current += 1
      const token = tokenRef.current
      clearWatchdog()
      try {
        synth.cancel()
      } catch {
        // synthesis already idle
      }

      const opts = optsRef.current
      const uri = overrideURI !== undefined ? overrideURI : opts.voiceURI
      const targetLang = overrideLang || opts.lang
      const utterance = new SpeechSynthesisUtterance(text)
      const found = findVoice(voicesRef.current, uri)
      let voice
      if (overrideURI) {
        // explicit per-call choice (voice preview) — always honored
        voice = found || pickBestVoice(voicesRef.current, targetLang)
      } else if (found && sameLangPrimary(found.lang, targetLang)) {
        // saved preference, language fits the interview
        voice = found
      } else {
        // no saved voice, or it doesn't speak this language — auto-match
        voice = pickBestVoice(voicesRef.current, targetLang)
      }
      if (voice) utterance.voice = voice
      utterance.lang = voice?.lang || targetLang
      utterance.rate = clampRate(overrideRate !== undefined ? overrideRate : opts.rate)

      let settled = false
      const settle = () => {
        if (settled) return
        settled = true
        if (tokenRef.current !== token) return
        clearWatchdog()
        setSpeaking(false)
        onEnd?.()
      }

      utterance.onend = settle
      utterance.onerror = settle

      setSpeaking(true)
      // cancel() is async in some browsers — give it a beat before speaking
      window.setTimeout(() => {
        if (tokenRef.current !== token) return
        synth.speak(utterance)
        // Chrome stops long utterances after ~15s unless nudged
        watchdogRef.current = setInterval(() => {
          if (tokenRef.current !== token) {
            clearWatchdog()
            return
          }
          if (synth.speaking && !synth.paused) synth.resume()
        }, 8000)
      }, 80)
    },
    [supported, clearWatchdog],
  )

  return { supported, speaking, voices, speak, stop }
}
