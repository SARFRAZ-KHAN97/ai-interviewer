import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import Spinner from '../components/common/Spinner'
import VoiceSettingsModal from '../components/interview/VoiceSettingsModal'
import { buildIntroScript, buildPreviewText } from '../components/interview/introScript'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { useSpeechRecognition } from '../hooks/useSpeechRecognition'
import { useSpeechSynthesis } from '../hooks/useSpeechSynthesis'
import * as interviewService from '../services/interviewService'
import { emitWithAck, getSocket } from '../services/socket'
import { loadVoiceSettings, saveVoiceSettings } from '../services/voiceSettings'

const speechLangs = {
  en: 'en-US',
  es: 'es-ES',
  fr: 'fr-FR',
  de: 'de-DE',
  pt: 'pt-BR',
  it: 'it-IT',
  hi: 'hi-IN',
  ar: 'ar-SA',
  ja: 'ja-JP',
  zh: 'zh-CN',
}

const categoryLabels = {
  technical: 'Technical',
  behavioral: 'Behavioral',
  scenario: 'Scenario',
  general: 'General',
}

const formatTime = (seconds) =>
  `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`

export default function InterviewRoom() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()
  const { user } = useAuth()

  const [phase, setPhase] = useState('loading') // loading|active|reporting|failed|notfound|error
  const [interview, setInterview] = useState(null)
  const [question, setQuestion] = useState(null)
  const [lastQuestionId, setLastQuestionId] = useState(null)
  const [index, setIndex] = useState(0)
  const [total, setTotal] = useState(0)
  const [answer, setAnswer] = useState('')
  const [remaining, setRemaining] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [finishing, setFinishing] = useState(false)
  const [confirmEnd, setConfirmEnd] = useState(false)
  const [banner, setBanner] = useState('')
  const [connState, setConnState] = useState(() =>
    getSocket().connected ? 'connected' : 'connecting',
  )
  const [settings, setSettings] = useState(() => loadVoiceSettings())
  const [voiceOpen, setVoiceOpen] = useState(false)
  const [introDone, setIntroDone] = useState(false)
  const [speechNonce, setSpeechNonce] = useState(0)

  const phaseRef = useRef(phase)
  const startTimeRef = useRef(0)
  const spokenRef = useRef(null)
  const answerRef = useRef('')
  const settingsRef = useRef(settings)
  const previewRef = useRef(false)
  const ttsBusyRef = useRef(false)

  useEffect(() => {
    phaseRef.current = phase
  }, [phase])

  const routeFromDetail = useCallback(
    (iv) => {
      setInterview(iv)
      if (iv.status === 'reported' && iv.report) {
        navigate(`/reports/${iv.report}`, { replace: true })
      } else if (iv.status === 'failed') {
        setPhase('failed')
      } else if (iv.status === 'processing' || iv.status === 'completed') {
        setPhase('reporting')
      } else {
        setPhase('active')
      }
    },
    [navigate],
  )

  const loadInterview = useCallback(async () => {
    try {
      const data = await interviewService.get(id)
      routeFromDetail(data.interview)
    } catch (err) {
      setPhase(err.status === 404 ? 'notfound' : 'error')
      setBanner(err.message)
    }
  }, [id, routeFromDetail])

  useEffect(() => {
    let cancelled = false
    interviewService
      .get(id)
      .then((data) => {
        if (!cancelled) routeFromDetail(data.interview)
      })
      .catch((err) => {
        if (!cancelled) {
          setPhase(err.status === 404 ? 'notfound' : 'error')
          setBanner(err.message)
        }
      })
    return () => {
      cancelled = true
    }
  }, [id, routeFromDetail])

  const joinAndStart = useCallback(async () => {
    const join = await emitWithAck('interview:join', { interviewId: id })
    if (!join.success) {
      toast.error(join.error?.message || 'Could not join the interview')
      return
    }
    const start = await emitWithAck('interview:start', { interviewId: id })
    if (start.success) {
      setQuestion(start.data.question)
      setIndex(start.data.index)
      setTotal(start.data.total)
      setPhase('active')
    } else if (start.error?.code === 'INTERVIEW_ALREADY_FINISHED') {
      await loadInterview()
    } else {
      toast.error(start.error?.message || 'Could not start the interview')
    }
  }, [id, loadInterview, toast])

  useEffect(() => {
    if (phase !== 'active') return undefined
    let cancelled = false
    Promise.resolve().then(() => {
      if (!cancelled) joinAndStart()
    })
    return () => {
      cancelled = true
    }
  }, [phase, joinAndStart])

  useEffect(() => {
    const socket = getSocket()

    const onProcessing = (payload) => {
      if (payload?.interviewId === id) setPhase('reporting')
    }
    const onReady = (payload) => {
      if (payload?.interviewId === id) {
        navigate(`/reports/${payload.reportId}`, { replace: true })
      }
    }
    const onFailed = (payload) => {
      if (payload?.interviewId === id) setPhase('failed')
    }
    const onConnect = () => {
      setConnState('connected')
      if (phaseRef.current === 'active') joinAndStart()
    }
    const onDisconnect = () => setConnState('reconnecting')

    socket.on('report:processing', onProcessing)
    socket.on('report:ready', onReady)
    socket.on('report:failed', onFailed)
    socket.on('connect', onConnect)
    socket.on('disconnect', onDisconnect)

    return () => {
      socket.off('report:processing', onProcessing)
      socket.off('report:ready', onReady)
      socket.off('report:failed', onFailed)
      socket.off('connect', onConnect)
      socket.off('disconnect', onDisconnect)
      emitWithAck('interview:leave', { interviewId: id })
    }
  }, [id, navigate, joinAndStart])

  if (question && question.id !== lastQuestionId) {
    setLastQuestionId(question.id)
    setRemaining(question.timeLimitSeconds)
  }

  const speechLang = speechLangs[interview?.setup?.language] || 'en-US'

  const speech = useSpeechRecognition({
    lang: speechLang,
    onFinal: (chunk) => setAnswer((prev) => (prev ? `${prev} ${chunk}` : chunk)),
  })

  const {
    speak: speakText,
    speaking,
    voices: synthVoices,
    supported: ttsSupported,
    stop: stopSpeech,
  } = useSpeechSynthesis({
    lang: speechLang,
    voiceURI: settings.voiceURI,
    rate: settings.rate,
  })

  const speechRef = useRef(speech)
  const speakingRef = useRef(speaking)
  const voiceEnabled = settings.enabled && ttsSupported

  useEffect(() => {
    if (!question || phase !== 'active') return undefined
    if (speaking) {
      startTimeRef.current = 0
      return undefined
    }
    startTimeRef.current = Date.now()
    const timer = setInterval(() => {
      const left = question.timeLimitSeconds - Math.floor((Date.now() - startTimeRef.current) / 1000)
      setRemaining(Math.max(0, left))
    }, 1000)
    return () => clearInterval(timer)
  }, [question, phase, speaking])

  useEffect(() => {
    answerRef.current = answer
    settingsRef.current = settings
    speechRef.current = speech
    speakingRef.current = speaking
  })

  const maybeAutoListen = useCallback(() => {
    if (phaseRef.current !== 'active') return
    if (!settingsRef.current.enabled) return
    if (ttsBusyRef.current) return
    if (answerRef.current.trim()) return
    speechRef.current.start()
  }, [])

  const speakQuestion = useCallback(() => {
    if (!question) return
    ttsBusyRef.current = true
    speechRef.current.stop()
    speakText(question.text, {
      onEnd: () => {
        ttsBusyRef.current = false
        maybeAutoListen()
      },
    })
  }, [question, speakText, maybeAutoListen])

  const introScript = buildIntroScript({
    name: user?.name,
    targetRole: interview?.setup?.targetRole,
    questionCount: interview?.setup?.questionCount,
    language: interview?.setup?.language,
  })

  useEffect(() => {
    if (phase !== 'active' || !question || !voiceEnabled) return
    const key = `${speechNonce}:${question.id}`
    if (spokenRef.current === key) return
    spokenRef.current = key
    speechRef.current.stop()
    if (index === 1 && !introDone) {
      ttsBusyRef.current = true
      speakText(introScript, {
        onEnd: () => {
          ttsBusyRef.current = false
          setIntroDone(true)
          speakQuestion()
        },
      })
    } else {
      speakQuestion()
    }
  }, [
    phase,
    question,
    voiceEnabled,
    index,
    introDone,
    introScript,
    speakQuestion,
    speakText,
    speechNonce,
  ])

  useEffect(() => {
    if (phase !== 'active') stopSpeech()
  }, [phase, stopSpeech])

  useEffect(() => {
    if (phase !== 'active') speech.stop()
  }, [phase, speech])

  const handleSubmit = async () => {
    const text = answer.trim()
    if (!text || !question || submitting) return
    setSubmitting(true)
    const durationSeconds = startTimeRef.current
      ? Math.round((Date.now() - startTimeRef.current) / 1000)
      : 0

    const res = await emitWithAck('interview:answer', {
      interviewId: id,
      questionId: question.id,
      text,
      durationSeconds,
    })

    if (res.success) {
      const data = res.data
      setAnswer('')
      if (data.finished) {
        setPhase('reporting')
      } else {
        setQuestion(data.next)
        setIndex(data.index)
        setTotal(data.total)
      }
    } else {
      const code = res.error?.code
      if (code === 'SESSION_NOT_STARTED' || code === 'INVALID_QUESTION' || code === 'QUESTION_ALREADY_ANSWERED') {
        toast.info('Something changed — re-syncing your question…')
        await joinAndStart()
      } else if (code === 'INTERVIEW_ALREADY_FINISHED' || code === 'INTERVIEW_COMPLETED') {
        await loadInterview()
      } else {
        toast.error(res.error?.message || 'Could not send your answer')
      }
    }
    setSubmitting(false)
  }

  const handleFinish = async () => {
    setFinishing(true)
    const res = await emitWithAck('interview:finish', { interviewId: id })
    if (res.success) {
      setConfirmEnd(false)
      setPhase('reporting')
    } else {
      toast.error(res.error?.message || 'Could not end the interview')
      setConfirmEnd(false)
    }
    setFinishing(false)
  }

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault()
      handleSubmit()
    }
  }

  const handlePreviewVoice = (opts) => {
    previewRef.current = true
    const chosen = opts.voiceURI
      ? synthVoices.find((voice) => voice.voiceURI === opts.voiceURI)
      : null
    speakText(buildPreviewText(chosen ? chosen.lang : speechLang), opts)
  }

  const handleRepeatSpeech = () => {
    if (!voiceEnabled) return
    if (index === 1 && !introDone) {
      ttsBusyRef.current = true
      speechRef.current.stop()
      speakText(introScript, {
        onEnd: () => {
          ttsBusyRef.current = false
          setIntroDone(true)
          speakQuestion()
        },
      })
    } else {
      speakQuestion()
    }
  }

  const handleSkipSpeech = () => {
    const wasIntro = index === 1 && !introDone
    stopSpeech()
    ttsBusyRef.current = false
    if (wasIntro) {
      setIntroDone(true)
      speakQuestion()
    } else {
      maybeAutoListen()
    }
  }

  const handleSaveVoice = (next) => {
    const voiceChanged =
      next.enabled !== settings.enabled ||
      next.voiceURI !== settings.voiceURI ||
      next.rate !== settings.rate
    setSettings(next)
    saveVoiceSettings(next)
    setVoiceOpen(false)
    if (!next.enabled) {
      stopSpeech()
      previewRef.current = false
      return
    }
    if (previewRef.current) {
      stopSpeech()
      previewRef.current = false
    }
    if (voiceChanged && (speakingRef.current || ttsBusyRef.current)) {
      setSpeechNonce((n) => n + 1)
    }
  }

  const handleCloseVoice = () => {
    if (previewRef.current) {
      stopSpeech()
      previewRef.current = false
    }
    setVoiceOpen(false)
  }

  if (phase === 'loading' || phase === 'notfound' || phase === 'error') {
    return (
      <section className="container-page flex min-h-[60vh] flex-col items-center justify-center py-16 text-center">
        {phase === 'loading' ? (
          <div className="text-indigo-600">
            <Spinner className="h-8 w-8" />
          </div>
        ) : (
          <div className="card max-w-md p-8">
            <h1 className="text-lg font-semibold">
              {phase === 'notfound' ? 'Interview not found' : 'Something went wrong'}
            </h1>
            {banner && <p className="mt-2 text-sm text-slate-500">{banner}</p>}
            <Link to="/interviews" className="btn btn-secondary mt-5">
              Back to history
            </Link>
          </div>
        )}
      </section>
    )
  }

  if (phase === 'reporting' || phase === 'failed') {
    return (
      <section className="container-page flex min-h-[60vh] items-center justify-center py-16">
        {phase === 'reporting' ? (
          <div className="card w-full max-w-md p-10 text-center">
            <div className="mx-auto w-fit text-indigo-600">
              <Spinner className="h-10 w-10" />
            </div>
            <h1 className="mt-5 text-lg font-semibold">Generating your report</h1>
            <p className="mt-2 text-sm text-slate-500">
              Your answers are being scored — this usually takes under a minute.
              You can reopen this interview from History anytime.
            </p>
            <Link to="/interviews" className="btn btn-secondary mt-6">
              Back to history
            </Link>
          </div>
        ) : (
          <div className="card w-full max-w-md p-10 text-center">
            <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-rose-50 text-rose-500">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
                <path d="M12 8v5M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
              </svg>
            </span>
            <h1 className="mt-4 text-lg font-semibold">Report generation failed</h1>
            <p className="mt-2 text-sm text-slate-500">
              Your answers are saved — you can retry generation from the report page.
            </p>
            {interview?.report && (
              <Link to={`/reports/${interview.report}`} className="btn btn-primary mt-6 w-full">
                Open report page
              </Link>
            )}
            <Link
              to="/interviews"
              className={`btn btn-secondary ${interview?.report ? 'mt-3 w-full' : 'mt-6'}`}
            >
              Back to history
            </Link>
          </div>
        )}
      </section>
    )
  }

  const answered = Math.max(0, index - 1)
  const segments = total > 0 ? Array.from({ length: total }, (_, i) => i) : []
  const shownAnswer =
    answer + (speech.interim ? (answer ? ' ' : '') + speech.interim : '')
  const captionText =
    index === 1 && !introDone ? introScript : question?.text || ''
  const timeClass =
    remaining === 0
      ? 'bg-rose-50 text-rose-600'
      : remaining <= 10
        ? 'bg-amber-50 text-amber-600'
        : 'bg-slate-100 text-slate-600'
  const timePct =
    question && question.timeLimitSeconds > 0
      ? Math.max(0, Math.min(100, (remaining / question.timeLimitSeconds) * 100))
      : 100
  const timerBarClass =
    remaining === 0
      ? 'bg-rose-500'
      : remaining <= 10
        ? 'bg-amber-400'
        : 'bg-gradient-to-r from-indigo-500 to-violet-500'

  return (
    <section className="container-page max-w-3xl py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          to="/interviews"
          className="inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-900"
        >
          ← History
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <span className="badge border border-indigo-100 bg-indigo-50 text-indigo-600">
            {interview?.setup?.targetRole}
          </span>
          <span className="badge bg-slate-100 text-slate-600">
            {interview?.setup?.difficulty}
          </span>
          {connState === 'reconnecting' && (
            <span className="badge animate-pulse bg-amber-50 text-amber-600">
              Reconnecting…
            </span>
          )}
          {ttsSupported && (
            <button
              type="button"
              onClick={() => setVoiceOpen(true)}
              aria-label="Voice settings"
              title="Voice settings"
              className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 transition hover:border-indigo-300 hover:text-indigo-600"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1 1.55V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1-1.55 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.55-1H3a2 2 0 1 1 0-4h.09a1.7 1.7 0 0 0 1.55-1 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34h.01a1.7 1.7 0 0 0 1-1.55V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1 1.55h.01a1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87v.01a1.7 1.7 0 0 0 1.55 1H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.55 1z" />
              </svg>
            </button>
          )}
        </div>
      </div>

      <div className="mt-5">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-slate-700">
            Question {Math.min(index, total || index)} of {total || '—'}
          </span>
          <span className="text-xs font-medium text-slate-400">
            {answered} of {total || '—'} answered
          </span>
        </div>
        <div className="mt-2 flex gap-1" aria-hidden>
          {segments.length > 0 ? (
            segments.map((_, i) => (
              <span
                key={i}
                className={`h-2 flex-1 rounded-full transition-all duration-300 ${
                  i < answered
                    ? 'bg-gradient-to-r from-indigo-600 to-violet-600'
                    : i === answered
                      ? 'bg-indigo-300'
                      : 'bg-slate-200/80'
                }`}
              />
            ))
          ) : (
            <span className="h-2 w-full rounded-full bg-slate-200/80" />
          )}
        </div>
      </div>

      {!question ? (
        <div className="card mt-6 flex justify-center py-16 text-indigo-600">
          <Spinner className="h-8 w-8" />
        </div>
      ) : (
        <>
          <div className="card relative mt-6 overflow-hidden p-6 sm:p-8">
            <div className="absolute inset-x-0 top-0 h-1.5 bg-slate-100">
              <div
                className={`h-full transition-all duration-1000 ease-linear ${timerBarClass}`}
                style={{ width: `${timePct}%` }}
              />
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="badge bg-gradient-to-r from-indigo-600 to-violet-600 text-white">
                {categoryLabels[question.category] || question.category}
              </span>
              <span className={`badge ${timeClass}`}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 7v5l3 2" />
                </svg>
                {formatTime(remaining)}
              </span>
            </div>

            <h1 className="mt-5 text-lg font-medium leading-relaxed text-slate-900 sm:text-xl">
              {question.text}
            </h1>

            {remaining === 0 && (
              <p className="mt-3 text-xs font-medium text-rose-500">
                Time&apos;s up — submit when you&apos;re ready
              </p>
            )}

            <div className="mt-6 border-t border-slate-100 pt-5">
              {speaking ? (
                <div className="flex items-center gap-4 rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50 via-indigo-50/40 to-violet-50 px-4 py-3.5">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center gap-0.5 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 shadow-md shadow-indigo-600/25">
                    <span className="eq-bar h-4 w-1 rounded-full bg-white" />
                    <span className="eq-bar h-4 w-1 rounded-full bg-white [animation-delay:150ms]" />
                    <span className="eq-bar h-4 w-1 rounded-full bg-white [animation-delay:300ms]" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-indigo-700">
                      The interviewer is speaking…
                    </p>
                    {settings.captions && (
                      <p className="mt-0.5 line-clamp-4 text-sm leading-relaxed text-slate-600">
                        {captionText}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      onClick={handleRepeatSpeech}
                      className="btn btn-secondary h-9 rounded-xl px-3.5 text-xs"
                    >
                      Repeat
                    </button>
                    <button
                      type="button"
                      onClick={handleSkipSpeech}
                      className="btn btn-ghost h-9 rounded-xl px-3 text-xs"
                    >
                      Skip
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center text-center">
                  {speech.supported ? (
                    <button
                      type="button"
                      onClick={speech.toggle}
                      aria-label={speech.listening ? 'Stop microphone' : 'Start microphone'}
                      className={`relative flex h-14 w-14 items-center justify-center rounded-full border-2 transition ${
                        speech.listening
                          ? 'border-transparent bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-600/30'
                          : 'border-slate-200 bg-white text-slate-400 hover:border-indigo-300 hover:text-indigo-600'
                      }`}
                    >
                      {speech.listening && (
                        <>
                          <span className="absolute inset-0 animate-ping rounded-full bg-indigo-400/30" />
                          <span className="absolute -inset-1 animate-ping rounded-full bg-indigo-400/20 [animation-delay:150ms]" />
                        </>
                      )}
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="relative h-6 w-6">
                        <path d="M12 3a3 3 0 0 1 3 3v5a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3zM5 11a7 7 0 0 0 14 0M12 18v3M9 21h6" />
                      </svg>
                    </button>
                  ) : (
                    <span className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="h-6 w-6">
                        <path d="M12 3a3 3 0 0 1 3 3v5a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3zM5 11a7 7 0 0 0 14 0M12 18v3M9 21h6M3 3l18 18" />
                      </svg>
                    </span>
                  )}
                  <p className="mt-3 text-sm font-medium text-slate-600">
                    {speech.listening
                      ? 'Listening… speak naturally'
                      : speech.supported
                        ? 'Tap the mic to answer by voice, or type below'
                        : 'Answer by typing below'}
                  </p>
                  {!speech.supported && (
                    <p className="mt-1 text-xs text-slate-400">
                      Voice input works best in Chrome or Edge
                    </p>
                  )}
                  {voiceEnabled && (
                    <button
                      type="button"
                      onClick={handleRepeatSpeech}
                      className="btn btn-ghost mt-1 h-8 rounded-xl px-2.5 text-xs text-indigo-600"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="h-3.5 w-3.5">
                        <path d="M11 5 6 9H3v6h3l5 4V5zM15.5 8.5a5 5 0 0 1 0 7" />
                      </svg>
                      Hear again
                    </button>
                  )}
                </div>
              )}

              {speech.error && (
                <p className="mt-2 text-xs font-medium text-rose-500">{speech.error}</p>
              )}

              <textarea
                className="textarea mt-4 min-h-[140px] resize-y"
                rows={6}
                maxLength={5000}
                placeholder="Type your answer here…"
                value={shownAnswer}
                onChange={(event) => setAnswer(event.target.value)}
                onKeyDown={handleKeyDown}
                disabled={submitting}
              />

              <div className="mt-3 flex items-center justify-between gap-3">
                <span className="text-xs text-slate-400">
                  {shownAnswer.length >= 4500 ? `${shownAnswer.length}/5000 · ` : ''}
                  <kbd className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
                    Ctrl
                  </kbd>
                  <span className="px-1">+</span>
                  <kbd className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
                    Enter
                  </kbd>
                  {' '}
                  <span>to submit</span>
                </span>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={submitting || !answer.trim()}
                  className="btn btn-primary"
                >
                  {submitting ? (
                    <>
                      <Spinner className="h-4 w-4" />
                      Sending…
                    </>
                  ) : index >= total && total > 0 ? (
                    'Submit & finish'
                  ) : (
                    'Submit answer'
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            {confirmEnd ? (
              <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2">
                <span className="text-xs font-medium text-rose-700">
                  End now? Report uses your {answered} answered{' '}
                  {answered === 1 ? 'question' : 'questions'}.
                </span>
                <button
                  type="button"
                  className="btn btn-ghost h-8 px-2 text-xs"
                  onClick={() => setConfirmEnd(false)}
                  disabled={finishing}
                >
                  Keep going
                </button>
                <button
                  type="button"
                  className="btn btn-danger h-8 px-3 text-xs"
                  onClick={handleFinish}
                  disabled={finishing}
                >
                  {finishing ? 'Ending…' : 'End interview'}
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="btn btn-ghost text-xs text-slate-400 hover:text-rose-600"
                onClick={() => setConfirmEnd(true)}
              >
                End interview early
              </button>
            )}
          </div>
        </>
      )}

      {voiceOpen && (
        <VoiceSettingsModal
          settings={settings}
          voices={synthVoices}
          supported={ttsSupported}
          preferredLang={speechLang}
          onPreview={handlePreviewVoice}
          onSave={handleSaveVoice}
          onClose={handleCloseVoice}
        />
      )}
    </section>
  )
}
