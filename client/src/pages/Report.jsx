import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import Spinner from '../components/common/Spinner'
import { useToast } from '../context/ToastContext'
import * as interviewService from '../services/interviewService'
import * as reportService from '../services/reportService'

const categoryLabels = {
  technical: 'Technical',
  behavioral: 'Behavioral',
  scenario: 'Scenario',
  general: 'General',
}

const categoryClass = {
  technical: 'bg-indigo-50 text-indigo-600',
  behavioral: 'bg-violet-50 text-violet-600',
  scenario: 'bg-sky-50 text-sky-600',
  general: 'bg-slate-100 text-slate-600',
}

const scoreTone = (score) => {
  if (score >= 85) {
    return {
      label: 'Excellent',
      text: 'text-emerald-600',
      gauge: 'text-emerald-500',
      chip: 'bg-emerald-50 text-emerald-700',
      bar: 'bg-emerald-500',
    }
  }
  if (score >= 70) {
    return {
      label: 'Strong',
      text: 'text-indigo-600',
      gauge: 'text-indigo-500',
      chip: 'bg-indigo-50 text-indigo-700',
      bar: 'bg-indigo-500',
    }
  }
  if (score >= 55) {
    return {
      label: 'Developing',
      text: 'text-amber-500',
      gauge: 'text-amber-400',
      chip: 'bg-amber-50 text-amber-700',
      bar: 'bg-amber-400',
    }
  }
  return {
    label: 'Needs work',
    text: 'text-rose-500',
    gauge: 'text-rose-400',
    chip: 'bg-rose-50 text-rose-600',
    bar: 'bg-rose-400',
  }
}

const GAUGE_C = 2 * Math.PI * 52

export default function Report() {
  const { id } = useParams()
  const { toast } = useToast()

  const [phase, setPhase] = useState('loading') // loading|ready|processing|failed|notfound|error
  const [report, setReport] = useState(null)
  const [interview, setInterview] = useState(null)
  const [banner, setBanner] = useState('')
  const [gauge, setGauge] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [open, setOpen] = useState(() => new Set())
  const [retrying, setRetrying] = useState(false)

  useEffect(() => {
    let cancelled = false
    reportService
      .get(id)
      .then(({ report }) =>
        interviewService.get(report.interview).then(({ interview }) => ({ report, interview })),
      )
      .then(({ report, interview }) => {
        if (cancelled) return
        setReport(report)
        setInterview(interview)
        setPhase(
          report.status === 'ready'
            ? 'ready'
            : report.status === 'failed'
              ? 'failed'
              : 'processing',
        )
      })
      .catch((err) => {
        if (cancelled) return
        setBanner(err.message)
        setPhase(err.status === 404 ? 'notfound' : 'error')
      })
    return () => {
      cancelled = true
    }
  }, [id])

  useEffect(() => {
    if (phase !== 'ready' || !report) return undefined
    let cancelled = false
    Promise.resolve().then(() => {
      if (cancelled) return
      setGauge(report.overallScore || 0)
      setRevealed(true)
      const first = report.questionAnalysis?.[0]?.questionOrder ?? null
      setOpen(first === null ? new Set() : new Set([first]))
    })
    return () => {
      cancelled = true
    }
  }, [phase, report])

  useEffect(() => {
    if (phase !== 'processing') return undefined
    const timer = setInterval(() => {
      reportService
        .get(id)
        .then(({ report }) => {
          setReport(report)
          if (report.status === 'ready') setPhase('ready')
          else if (report.status === 'failed') setPhase('failed')
        })
        .catch(() => {})
    }, 4000)
    return () => clearInterval(timer)
  }, [phase, id])

  const handleRetry = async () => {
    if (!interview || retrying) return
    setRetrying(true)
    try {
      const { interview: iv } = await reportService.retryReport(interview.id)
      setInterview(iv)
      setPhase('processing')
      toast.success('Report generation restarted — this page updates automatically')
    } catch (err) {
      toast.error(err.message)
    }
    setRetrying(false)
  }

  const toggle = (order) => {
    setOpen((prev) => {
      const next = new Set(prev)
      if (next.has(order)) next.delete(order)
      else next.add(order)
      return next
    })
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
              {phase === 'notfound' ? 'Report not found' : 'Something went wrong'}
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

  if (phase === 'processing') {
    return (
      <section className="container-page flex min-h-[60vh] items-center justify-center py-16">
        <div className="card w-full max-w-md p-10 text-center">
          <div className="mx-auto w-fit text-indigo-600">
            <Spinner className="h-10 w-10" />
          </div>
          <h1 className="mt-5 text-lg font-semibold">Generating your report</h1>
          <p className="mt-2 text-sm text-slate-500">
            Your answers are being scored — usually under a minute. This page
            refreshes automatically, and your report will also be waiting in
            History anytime.
          </p>
          <Link to="/interviews" className="btn btn-secondary mt-6">
            Back to history
          </Link>
        </div>
      </section>
    )
  }

  if (phase === 'failed') {
    return (
      <section className="container-page flex min-h-[60vh] items-center justify-center py-16">
        <div className="card w-full max-w-md p-10 text-center">
          <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-rose-50 text-rose-500">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              className="h-5 w-5"
            >
              <path d="M12 8v5M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
            </svg>
          </span>
          <h1 className="mt-4 text-lg font-semibold">Report generation failed</h1>
          <p className="mt-2 text-sm text-slate-500">
            Your answers are saved. Retry now — it usually takes under a minute.
          </p>
          {report?.failureReason && (
            <p className="mt-3 break-words rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-400">
              {report.failureReason}
            </p>
          )}
          <button
            type="button"
            className="btn btn-primary mt-6 w-full"
            onClick={handleRetry}
            disabled={retrying}
          >
            {retrying ? (
              <>
                <Spinner className="h-4 w-4" />
                Retrying…
              </>
            ) : (
              'Retry report'
            )}
          </button>
          <Link to="/interviews" className="btn btn-secondary mt-3 w-full">
            Back to history
          </Link>
        </div>
      </section>
    )
  }

  const setup = interview.setup
  const questions = interview.questions ?? []
  const answered = interview.progress?.answered ?? 0
  const total = interview.progress?.total ?? questions.length
  const tone = scoreTone(report.overallScore ?? 0)
  const dateStr = new Date(report.createdAt).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  const durations = questions.filter((q) => q.answer).map((q) => q.answer.durationSeconds)
  const avgTime =
    durations.length > 0
      ? Math.round(durations.reduce((sum, value) => sum + value, 0) / durations.length)
      : null

  const analysisByOrder = new Map(report.questionAnalysis.map((a) => [a.questionOrder, a]))
  const rows = questions
    .map((question) => ({ question, analysis: analysisByOrder.get(question.order) }))
    .filter((row) => row.analysis)

  const expandAll = () => setOpen(new Set(rows.map((row) => row.question.order)))

  return (
    <section className="container-page max-w-4xl py-8">
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <Link
          to="/interviews"
          className="inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-900"
        >
          ← History
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <span className="badge bg-indigo-50 text-indigo-600">{setup.targetRole}</span>
          <span className="badge bg-slate-100 text-slate-600">{setup.difficulty}</span>
        </div>
      </div>

      <div className="card mt-4 overflow-hidden">
        <div className="border-b border-slate-100 bg-gradient-to-br from-indigo-50/70 via-white to-violet-50/60 px-6 py-8 sm:px-8">
          <div className="flex flex-col items-center gap-7 sm:flex-row">
            <div className="relative h-36 w-36 shrink-0">
              <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
                <circle
                  cx="60"
                  cy="60"
                  r="52"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="10"
                  className="text-slate-100"
                />
                <circle
                  cx="60"
                  cy="60"
                  r="52"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="10"
                  strokeLinecap="round"
                  className={`${tone.gauge} transition-[stroke-dashoffset] duration-1000 ease-out`}
                  strokeDasharray={GAUGE_C}
                  strokeDashoffset={GAUGE_C - (GAUGE_C * gauge) / 100}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`text-4xl font-bold ${tone.text}`}>{report.overallScore}</span>
                <span className="mt-0.5 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                  {tone.label}
                </span>
              </div>
            </div>

            <div className="min-w-0 flex-1 text-center sm:text-left">
              <p className="text-xs font-semibold uppercase tracking-wider text-indigo-500">
                Interview report
              </p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
                {setup.targetRole}
              </h1>
              <div className="mt-3 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                <span className={`badge ${tone.chip}`}>{tone.label}</span>
                <span className="badge bg-slate-100 text-slate-600">
                  {answered}/{total} answered
                </span>
                {avgTime !== null && (
                  <span className="badge bg-slate-100 text-slate-600">{avgTime}s avg</span>
                )}
                <span className="badge bg-slate-100 text-slate-500">{dateStr}</span>
                {report.model && (
                  <span className="badge bg-slate-100 text-slate-400">
                    {report.model}
                    {report.promptVersion ? ` v${report.promptVersion}` : ''}
                  </span>
                )}
              </div>
              {report.summary && (
                <p className="mt-4 border-l-2 border-indigo-400 bg-indigo-50/60 px-4 py-3 text-left text-sm leading-relaxed break-words text-slate-700">
                  {report.summary}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {report.dimensions.length > 0 && (
        <div className="card mt-4 p-6 sm:p-7">
          <h2 className="text-base font-semibold text-slate-900">Skill breakdown</h2>
          <div className="mt-5 space-y-5">
            {report.dimensions.map((dimension) => {
              const dTone = scoreTone(dimension.score)
              return (
                <div key={dimension.name}>
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-sm font-medium text-slate-700">{dimension.name}</span>
                    <span className={`text-sm font-semibold ${dTone.text}`}>{dimension.score}</span>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full ${dTone.bar} transition-all duration-700 ease-out`}
                      style={{ width: revealed ? `${dimension.score}%` : '0%' }}
                    />
                  </div>
                  {dimension.comment && (
                    <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
                      {dimension.comment}
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {(report.strengths.length > 0 || report.weaknesses.length > 0) && (
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {report.strengths.length > 0 && (
            <div className="card p-6 sm:p-7">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-500">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="h-4.5 w-4.5"
                >
                  <path d="m5 13 4 4L19 7" />
                </svg>
              </span>
              <h2 className="mt-3 text-base font-semibold text-slate-900">Strengths</h2>
              <ul className="mt-3 space-y-2.5">
                {report.strengths.map((item) => (
                  <li key={item} className="flex gap-2.5 text-sm leading-relaxed text-slate-600">
                    <span className="mt-0.5 shrink-0 font-semibold text-emerald-500">+</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {report.weaknesses.length > 0 && (
            <div className="card p-6 sm:p-7">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-50 text-rose-500">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="h-4.5 w-4.5"
                >
                  <path d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
                </svg>
              </span>
              <h2 className="mt-3 text-base font-semibold text-slate-900">Areas to improve</h2>
              <ul className="mt-3 space-y-2.5">
                {report.weaknesses.map((item) => (
                  <li key={item} className="flex gap-2.5 text-sm leading-relaxed text-slate-600">
                    <span className="mt-0.5 shrink-0 font-semibold text-rose-500">!</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {report.suggestions.length > 0 && (
        <div className="card mt-4 p-6 sm:p-7">
          <h2 className="text-base font-semibold text-slate-900">Suggestions</h2>
          <ol className="mt-4 space-y-3">
            {report.suggestions.map((item, index) => (
              <li key={item} className="flex gap-3 text-sm leading-relaxed text-slate-600">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-[11px] font-semibold text-indigo-600">
                  {index + 1}
                </span>
                {item}
              </li>
            ))}
          </ol>
        </div>
      )}

      {rows.length > 0 && (
        <div className="card mt-4 p-0">
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-6 py-5">
            <h2 className="text-base font-semibold text-slate-900">Question-by-question</h2>
            <button
              type="button"
              className="no-print text-xs font-medium text-indigo-600 hover:text-indigo-500"
              onClick={expandAll}
            >
              Expand all
            </button>
          </div>
          {rows.map(({ question, analysis }) => {
            const qTone = scoreTone(analysis.score)
            const isOpen = open.has(question.order)
            return (
              <div key={question.order} className="border-b border-slate-100 last:border-0">
                <button
                  type="button"
                  className="flex w-full items-center gap-3 px-6 py-4 text-left transition hover:bg-slate-50"
                  onClick={() => toggle(question.order)}
                  aria-expanded={isOpen}
                >
                  <span className="badge shrink-0 bg-slate-100 text-slate-600">
                    Q{question.order}
                  </span>
                  <span
                    className={`badge hidden shrink-0 sm:inline-flex ${categoryClass[question.category] || categoryClass.general}`}
                  >
                    {categoryLabels[question.category] || question.category}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-800">
                    {question.text}
                  </span>
                  <span className={`badge shrink-0 ${qTone.chip}`}>{analysis.score}</span>
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                  >
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </button>

                {isOpen && (
                  <div className="space-y-4 px-6 pb-6">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                        Your answer
                      </p>
                      {question.answer?.text ? (
                        <p className="mt-1.5 whitespace-pre-wrap break-words rounded-xl bg-slate-50 px-4 py-3 text-sm leading-relaxed text-slate-600">
                          {question.answer.text}
                        </p>
                      ) : (
                        <p className="mt-1.5 text-sm italic text-slate-400">
                          No answer recorded for this question.
                        </p>
                      )}
                    </div>

                    {(analysis.strengths.length > 0 || analysis.weaknesses.length > 0) && (
                      <div className="grid gap-4 sm:grid-cols-2">
                        {analysis.strengths.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-500">
                              What worked
                            </p>
                            <ul className="mt-1.5 space-y-1.5">
                              {analysis.strengths.map((item) => (
                                <li
                                  key={item}
                                  className="flex gap-2 text-sm leading-relaxed text-slate-600"
                                >
                                  <span className="shrink-0 font-semibold text-emerald-500">+</span>
                                  {item}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {analysis.weaknesses.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wider text-rose-500">
                              What to fix
                            </p>
                            <ul className="mt-1.5 space-y-1.5">
                              {analysis.weaknesses.map((item) => (
                                <li
                                  key={item}
                                  className="flex gap-2 text-sm leading-relaxed text-slate-600"
                                >
                                  <span className="shrink-0 font-semibold text-rose-500">!</span>
                                  {item}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}

                    {analysis.suggestion && (
                      <p className="rounded-xl border-l-2 border-indigo-400 bg-indigo-50/60 px-4 py-3 text-sm leading-relaxed text-slate-700">
                        {analysis.suggestion}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <div className="no-print mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link to="/interviews/new" className="btn btn-primary">
          New interview
        </Link>
        <Link to="/interviews" className="btn btn-secondary">
          Browse history
        </Link>
        <button type="button" className="btn btn-ghost" onClick={() => window.print()}>
          Print / Save as PDF
        </button>
      </div>
    </section>
  )
}
