import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Spinner from '../components/common/Spinner'
import { useToast } from '../context/ToastContext'
import * as interviewService from '../services/interviewService'
import * as resumeService from '../services/resumeService'

const difficulties = [
  {
    value: 'easy',
    label: 'Easy',
    dot: 'bg-emerald-500',
    active: 'border-emerald-500 bg-emerald-50 text-emerald-700 ring-2 ring-emerald-500/20',
  },
  {
    value: 'medium',
    label: 'Medium',
    dot: 'bg-amber-500',
    active: 'border-amber-500 bg-amber-50 text-amber-700 ring-2 ring-amber-500/20',
  },
  {
    value: 'hard',
    label: 'Hard',
    dot: 'bg-rose-500',
    active: 'border-rose-500 bg-rose-50 text-rose-700 ring-2 ring-rose-500/20',
  },
]

const timeOptions = [30, 45, 60, 90, 120, 180]

const languages = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Spanish' },
  { value: 'fr', label: 'French' },
  { value: 'de', label: 'German' },
  { value: 'pt', label: 'Portuguese' },
  { value: 'it', label: 'Italian' },
  { value: 'hi', label: 'Hindi' },
  { value: 'ar', label: 'Arabic' },
  { value: 'ja', label: 'Japanese' },
  { value: 'zh', label: 'Chinese' },
]

export default function InterviewNew() {
  const navigate = useNavigate()
  const { toast } = useToast()

  const [resumes, setResumes] = useState([])
  const [resumesLoading, setResumesLoading] = useState(true)
  const [resumeId, setResumeId] = useState('')

  const [targetRole, setTargetRole] = useState('')
  const [difficulty, setDifficulty] = useState('medium')
  const [questionCount, setQuestionCount] = useState(5)
  const [timePerQuestionSeconds, setTime] = useState(60)
  const [language, setLanguage] = useState('en')

  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  useEffect(() => {
    let cancelled = false
    resumeService
      .list()
      .then((data) => {
        if (cancelled) return
        setResumes(data.resumes)
        if (data.resumes.length > 0) setResumeId(data.resumes[0].id)
      })
      .catch((err) => {
        if (!cancelled) setError(err.message)
      })
      .finally(() => {
        if (!cancelled) setResumesLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')

    if (!resumeId) {
      setError('Choose a resume first')
      return
    }
    if (targetRole.trim().length < 2) {
      setError('Target role must be at least 2 characters')
      return
    }

    setPending(true)
    try {
      const data = await interviewService.create({
        resumeId,
        setup: {
          targetRole: targetRole.trim(),
          difficulty,
          questionCount,
          timePerQuestionSeconds,
          language,
        },
      })
      navigate(`/interviews/${data.interview.id}`)
    } catch (err) {
      toast.error(err.message)
      setPending(false)
    }
  }

  const chosenResume = resumes.find((resume) => resume.id === resumeId)
  const difficultyLabel = difficulties.find((option) => option.value === difficulty)?.label
  const languageLabel = languages.find((option) => option.value === language)?.label
  const estimateMinutes = Math.max(
    1,
    Math.round((questionCount * timePerQuestionSeconds) / 60),
  )

  return (
    <section className="container-page py-10">
      <div className="mx-auto max-w-4xl">
        <header className="relative overflow-hidden">
          <div
            aria-hidden
            className="pointer-events-none absolute -top-24 right-0 h-56 w-80 rounded-full bg-gradient-to-br from-indigo-400/20 to-violet-400/20 blur-3xl"
          />
          <span className="badge border border-indigo-100 bg-indigo-50 text-indigo-600">
            New interview
          </span>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight sm:text-3xl">
            Set up your <span className="text-gradient">mock interview</span>
          </h1>
          <p className="mt-2 max-w-xl text-sm text-slate-500">
            Pick a resume and we&apos;ll generate tailored questions for the role.
          </p>
        </header>

        <form
          onSubmit={handleSubmit}
          className="mt-8 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_19rem]"
        >
          <div className="space-y-6">
            <div className="card p-6">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600 text-white">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-4.5 w-4.5"
                  >
                    <path d="M7 3h7l5 5v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zM14 3v5h5M9 13h6M9 17h4" />
                  </svg>
                </span>
                <div className="min-w-0">
                  <h2 className="text-sm font-semibold text-slate-900">Resume</h2>
                  <p className="text-xs text-slate-400">
                    The source of your interview questions
                  </p>
                </div>
                {!resumesLoading && resumes.length > 0 && (
                  <span className="badge ml-auto shrink-0 bg-indigo-50 text-indigo-600">
                    {resumes.length} uploaded
                  </span>
                )}
              </div>

              {resumesLoading ? (
                <div className="mt-4 space-y-2">
                  <div className="h-14 animate-pulse rounded-lg bg-slate-100" />
                  <div className="h-14 animate-pulse rounded-lg bg-slate-100" />
                </div>
              ) : resumes.length === 0 ? (
                <div className="mt-4 rounded-xl border-2 border-dashed border-slate-200 px-4 py-8 text-center">
                  <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-5 w-5"
                    >
                      <path d="M7 3h7l5 5v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zM14 3v5h5" />
                    </svg>
                  </span>
                  <p className="mt-3 text-sm font-medium text-slate-600">
                    You need a resume before starting an interview.
                  </p>
                  <Link to="/resumes" className="btn btn-secondary mt-4 h-9">
                    Upload a resume
                  </Link>
                </div>
              ) : (
                <div className="mt-4 space-y-2">
                  {resumes.map((resume) => (
                    <label
                      key={resume.id}
                      className={`flex cursor-pointer items-center justify-between gap-3 rounded-xl border px-4 py-3 transition ${
                        resumeId === resume.id
                          ? 'border-indigo-500 bg-indigo-50/60 ring-2 ring-indigo-500/20'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <span className="flex min-w-0 items-center gap-3">
                        <input
                          type="radio"
                          name="resume"
                          className="accent-indigo-600"
                          checked={resumeId === resume.id}
                          onChange={() => setResumeId(resume.id)}
                        />
                        <span
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition ${
                            resumeId === resume.id
                              ? 'bg-indigo-100 text-indigo-600'
                              : 'bg-slate-100 text-slate-400'
                          }`}
                        >
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="h-4.5 w-4.5"
                          >
                            <path d="M7 3h7l5 5v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zM14 3v5h5" />
                          </svg>
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium text-slate-900">
                            {resume.fileName}
                          </span>
                          <span className="block text-xs text-slate-400">
                            {resume.skills.length} skills detected
                          </span>
                        </span>
                      </span>
                      <span className="flex shrink-0 items-center gap-2">
                        {resumeId === resume.id && (
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden
                            className="h-5 w-5 text-indigo-600"
                          >
                            <path d="M8.5 12.5l2.5 2.5 4.5-5.5" />
                          </svg>
                        )}
                        <span className="badge bg-slate-100 text-slate-500 uppercase">
                          {resume.fileType}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="card space-y-6 p-6">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600 text-white">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-4.5 w-4.5"
                  >
                    <path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h10M18 18h2" />
                    <circle cx="16" cy="6" r="2" />
                    <circle cx="10" cy="12" r="2" />
                    <circle cx="16" cy="18" r="2" />
                  </svg>
                </span>
                <div className="min-w-0">
                  <h2 className="text-sm font-semibold text-slate-900">Setup</h2>
                  <p className="text-xs text-slate-400">
                    Shape the difficulty, pace, and language
                  </p>
                </div>
              </div>

              <div>
                <label className="label" htmlFor="targetRole">
                  Target role
                </label>
                <div className="relative">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                  >
                    <path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z" />
                    <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />
                  </svg>
                  <input
                    id="targetRole"
                    type="text"
                    required
                    maxLength={80}
                    placeholder="e.g. Frontend Developer"
                    className="input pl-9"
                    value={targetRole}
                    onChange={(event) => setTargetRole(event.target.value)}
                  />
                </div>
              </div>

              <div>
                <span className="label">Difficulty</span>
                <div className="grid grid-cols-3 gap-2">
                  {difficulties.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setDifficulty(option.value)}
                      className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition ${
                        difficulty === option.value
                          ? option.active
                          : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-800'
                      }`}
                    >
                      <span
                        aria-hidden
                        className={`h-2 w-2 rounded-full ${option.dot}`}
                      />
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label className="label mb-0" htmlFor="questionCount">
                    Questions
                  </label>
                  <span className="text-2xl font-semibold leading-none text-gradient">
                    {questionCount}
                  </span>
                </div>
                <input
                  id="questionCount"
                  type="range"
                  min="1"
                  max="20"
                  step="1"
                  className="mt-3 w-full accent-indigo-600"
                  value={questionCount}
                  onChange={(event) => setQuestionCount(Number(event.target.value))}
                />
                <div className="mt-1 flex justify-between text-xs text-slate-400">
                  <span>1</span>
                  <span>10</span>
                  <span>20</span>
                </div>
              </div>

              <div>
                <span className="label">Time per question</span>
                <div className="grid grid-cols-3 gap-2">
                  {timeOptions.map((seconds) => (
                    <button
                      key={seconds}
                      type="button"
                      onClick={() => setTime(seconds)}
                      className={`rounded-lg border px-2 py-2 text-sm font-medium transition ${
                        timePerQuestionSeconds === seconds
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-700 ring-2 ring-indigo-500/20'
                          : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-800'
                      }`}
                    >
                      {seconds}s
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="label" htmlFor="language">
                  Language
                </label>
                <select
                  id="language"
                  className="input"
                  value={language}
                  onChange={(event) => setLanguage(event.target.value)}
                >
                  {languages.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <aside className="lg:sticky lg:top-24">
            <div className="card p-6">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600 text-white">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-4.5 w-4.5"
                  >
                    <path d="M4 20V10M10 20V4M16 20v-6M3 20h18" />
                  </svg>
                </span>
                <h2 className="text-sm font-semibold text-slate-900">Summary</h2>
              </div>

              <dl className="mt-5 space-y-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <dt className="shrink-0 text-slate-400">Resume</dt>
                  <dd className="min-w-0 truncate font-medium text-slate-700">
                    {chosenResume ? chosenResume.fileName : '—'}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="shrink-0 text-slate-400">Role</dt>
                  <dd className="min-w-0 truncate font-medium text-slate-700">
                    {targetRole.trim() || '—'}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="shrink-0 text-slate-400">Difficulty</dt>
                  <dd className="font-medium text-slate-700">{difficultyLabel}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="shrink-0 text-slate-400">Questions</dt>
                  <dd className="font-medium text-slate-700">{questionCount}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="shrink-0 text-slate-400">Time / question</dt>
                  <dd className="font-medium text-slate-700">
                    {timePerQuestionSeconds}s
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="shrink-0 text-slate-400">Language</dt>
                  <dd className="font-medium text-slate-700">{languageLabel}</dd>
                </div>
                <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
                  <dt className="shrink-0 text-slate-400">Answering time</dt>
                  <dd className="font-semibold text-indigo-600">
                    ≈ {estimateMinutes} min
                  </dd>
                </div>
              </dl>

              {error && (
                <div
                  role="alert"
                  className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700"
                >
                  {error}
                </div>
              )}

              <button
                type="submit"
                className="btn btn-primary mt-5 w-full"
                disabled={pending || resumesLoading}
              >
                {pending ? (
                  <>
                    <Spinner className="h-4 w-4" />
                    Generating {questionCount} questions — this can take up to a minute…
                  </>
                ) : (
                  <>
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-4 w-4"
                    >
                      <path d="M12 3l1.9 4.6L18.5 9.5 13.9 11.4 12 16l-1.9-4.6L5.5 9.5l4.6-1.9z" />
                    </svg>
                    Start interview ({questionCount} questions)
                  </>
                )}
              </button>

              <p className="mt-3 text-center text-xs text-slate-400">
                Questions are generated by Gemini from your resume.
              </p>
            </div>
          </aside>
        </form>
      </div>
    </section>
  )
}
