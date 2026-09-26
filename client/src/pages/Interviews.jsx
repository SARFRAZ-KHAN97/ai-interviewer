import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Spinner from '../components/common/Spinner'
import * as interviewService from '../services/interviewService'
import * as resumeService from '../services/resumeService'

const statusMeta = {
  created: { label: 'Not started', cls: 'bg-slate-100 text-slate-600' },
  in_progress: { label: 'In progress', cls: 'bg-indigo-50 text-indigo-600' },
  completed: { label: 'Completed', cls: 'bg-sky-50 text-sky-600' },
  processing: { label: 'Generating report', cls: 'bg-amber-50 text-amber-600' },
  reported: { label: 'Report ready', cls: 'bg-emerald-50 text-emerald-600' },
  failed: { label: 'Report failed', cls: 'bg-rose-50 text-rose-600' },
}

const difficultyMeta = {
  easy: 'bg-emerald-50 text-emerald-600',
  medium: 'bg-amber-50 text-amber-600',
  hard: 'bg-rose-50 text-rose-600',
}

const actionLabels = {
  created: 'Start',
  in_progress: 'Continue',
  completed: 'Open',
  processing: 'Open',
  reported: 'View report',
  failed: 'Details',
}

const formatDate = (iso) =>
  new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

export default function Interviews() {
  const [interviews, setInterviews] = useState([])
  const [resumeNames, setResumeNames] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    Promise.all([interviewService.list(), resumeService.list()])
      .then(([interviewData, resumeData]) => {
        if (cancelled) return
        setInterviews(interviewData.interviews)
        setResumeNames(
          Object.fromEntries(resumeData.resumes.map((resume) => [resume.id, resume.fileName])),
        )
      })
      .catch((err) => {
        if (!cancelled) setError(err.message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <section className="container-page py-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Interviews</h1>
          <p className="mt-1 text-sm text-slate-500">
            Your past and in-progress mock interviews.
          </p>
        </div>
        <Link to="/interviews/new" className="btn btn-primary">
          New interview
        </Link>
      </div>

      {error && (
        <div
          role="alert"
          className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700"
        >
          {error}
        </div>
      )}

      <div className="mt-6">
        {loading ? (
          <div className="flex justify-center py-16 text-indigo-600">
            <Spinner className="h-8 w-8" />
          </div>
        ) : interviews.length === 0 ? (
          <div className="card flex flex-col items-center px-6 py-14 text-center">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5"
              >
                <path d="M8 10h8M8 14h5M21 12a9 9 0 1 1-3.6-7.2M21 4v5h-5" />
              </svg>
            </span>
            <h2 className="mt-4 font-semibold">No interviews yet</h2>
            <p className="mt-1 max-w-sm text-sm text-slate-500">
              Start your first AI mock interview — questions are generated from
              your resume.
            </p>
            <Link to="/interviews/new" className="btn btn-primary mt-5">
              Start your first interview
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {interviews.map((interview) => {
              const meta = statusMeta[interview.status] || statusMeta.created
              const { answered, total } = interview.progress
              const pct = total > 0 ? Math.round((answered / total) * 100) : 0
              const resumeName = resumeNames[interview.resume]

              return (
                <Link
                  key={interview.id}
                  to={`/interviews/${interview.id}`}
                  className="card block p-5 transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`badge ${meta.cls} ${
                          interview.status === 'processing' ? 'animate-pulse' : ''
                        }`}
                      >
                        {meta.label}
                      </span>
                      <span
                        className={`badge ${
                          difficultyMeta[interview.setup.difficulty] || difficultyMeta.medium
                        }`}
                      >
                        {interview.setup.difficulty}
                      </span>
                      <span className="text-xs text-slate-400">
                        {formatDate(interview.createdAt)}
                      </span>
                    </div>
                    <span className="text-sm font-medium text-indigo-600">
                      {actionLabels[interview.status] || 'Open'} →
                    </span>
                  </div>

                  <h2 className="mt-3 font-semibold text-slate-900">
                    {interview.setup.targetRole}
                  </h2>
                  <p className="mt-1 text-xs text-slate-400">
                    {resumeName || 'Resume'} · {total} questions ·{' '}
                    {interview.setup.timePerQuestionSeconds}s each
                  </p>

                  <div className="mt-4 flex items-center gap-3">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-indigo-600 to-violet-600 transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium text-slate-500">
                      {answered}/{total} answered
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}
