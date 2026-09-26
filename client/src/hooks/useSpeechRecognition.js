import { useCallback, useEffect, useRef, useState } from 'react'

export function useSpeechRecognition({ lang, onFinal }) {
  const [listening, setListening] = useState(false)
  const [interim, setInterim] = useState('')
  const [error, setError] = useState('')

  const recRef = useRef(null)
  const wantRef = useRef(false)
  const onFinalRef = useRef(onFinal)
  const langRef = useRef(lang)

  useEffect(() => {
    onFinalRef.current = onFinal
    langRef.current = lang
  }, [onFinal, lang])

  const supported =
    typeof window !== 'undefined' &&
    Boolean(window.SpeechRecognition || window.webkitSpeechRecognition)

  const stop = useCallback(() => {
    wantRef.current = false
    setListening(false)
    setInterim('')
    try {
      recRef.current?.abort?.()
    } catch {
      // already stopped
    }
    recRef.current = null
  }, [])

  useEffect(() => stop, [stop])

  const start = useCallback(() => {
    if (!supported || wantRef.current) return
    const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition
    const rec = new Ctor()
    rec.continuous = true
    rec.interimResults = true
    rec.lang = langRef.current

    rec.onresult = (event) => {
      let finalText = ''
      let interimText = ''
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i]
        if (result.isFinal) finalText += result[0].transcript
        else interimText += result[0].transcript
      }
      setInterim(interimText)
      if (finalText.trim()) onFinalRef.current(finalText.trim())
    }

    rec.onerror = (event) => {
      if (event.error === 'no-speech') return
      // aborted/canceled means we stopped it ourselves (e.g. to speak the next question)
      if (event.error === 'aborted' || event.error === 'canceled') return
      wantRef.current = false
      setListening(false)
      setError(
        event.error === 'not-allowed'
          ? 'Microphone permission denied — you can type instead'
          : 'Voice input unavailable — you can type instead',
      )
    }

    rec.onend = () => {
      setInterim('')
      if (wantRef.current) {
        try {
          rec.start()
        } catch {
          wantRef.current = false
          setListening(false)
        }
      } else {
        setListening(false)
      }
    }

    recRef.current = rec
    try {
      rec.start()
      wantRef.current = true
      setListening(true)
      setError('')
    } catch {
      wantRef.current = false
      setListening(false)
      setError('Voice input unavailable — you can type instead')
    }
  }, [supported])

  const toggle = useCallback(() => {
    if (wantRef.current) stop()
    else start()
  }, [start, stop])

  return { supported, listening, interim, error, start, toggle, stop }
}
