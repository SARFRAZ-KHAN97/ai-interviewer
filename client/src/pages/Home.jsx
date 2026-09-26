import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const features = [
  {
    title: 'Upload your resume',
    text: 'PDF or DOCX parsed on the server — your experience becomes the interview context.',
    icon: (
      <path
        d="M7 3h7l5 5v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zM14 3v5h5M9 13h6M9 17h4"
      />
    ),
  },
  {
    title: 'Voice-led interviews',
    text: 'Hear each question read aloud in your voice of choice — then answer out loud or type.',
    icon: (
      <path d="M12 3a3 3 0 0 1 3 3v5a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3zM5 11a7 7 0 0 0 14 0M12 18v3M9 21h6" />
    ),
  },
  {
    title: 'Detailed report',
    text: 'Score, dimension breakdown, per-question analysis, and concrete suggestions.',
    icon: <path d="M4 20V10M10 20V4M16 20v-6M3 20h18" />,
  },
]

const steps = [
  {
    n: '1',
    title: 'Upload your resume',
    text: 'A PDF or DOCX is parsed on the server — your real experience becomes the interview context.',
  },
  {
    n: '2',
    title: 'Answer out loud',
    text: 'Questions are read aloud and answered by voice or typing, just like a live screen.',
  },
  {
    n: '3',
    title: 'Get your report',
    text: 'Instant scores, per-question feedback, strengths, and concrete tips to improve.',
  },
]

export default function Home() {
  const { user } = useAuth()

  return (
    <>
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-40 left-1/2 h-72 w-[46rem] -translate-x-1/2 rounded-full bg-gradient-to-r from-indigo-400/25 to-violet-400/25 blur-3xl"
        />
        <div className="container-page py-20 text-center sm:py-28">
          <span className="badge border border-indigo-100 bg-indigo-50 text-indigo-600">
            Voice-powered mock interviews
          </span>
          <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl">
            Land your next role with{' '}
            <span className="text-gradient">real interview practice</span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl leading-relaxed text-slate-500">
            Upload your resume and answer AI-generated questions out loud — then
            get a report on your strengths, gaps, and how to improve.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {user ? (
              <>
                <Link to="/interviews/new" className="btn btn-primary">
                  Start a new interview
                </Link>
                <Link to="/interviews" className="btn btn-secondary">
                  View history
                </Link>
              </>
            ) : (
              <>
                <Link to="/interviews/new" className="btn btn-primary">
                  Start practicing
                </Link>
                <Link to="/register" className="btn btn-secondary">
                  Create account
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      <section className="container-page pb-20">
        <div className="grid gap-5 sm:grid-cols-3">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="card p-6 transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600 text-white">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-5 w-5"
                >
                  {feature.icon}
                </svg>
              </span>
              <h2 className="mt-4 font-semibold">{feature.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-500">
                {feature.text}
              </p>
            </div>
          ))}
        </div>
      </section>
      <section className="border-t border-slate-200/70 bg-white/60">
        <div className="container-page py-20">
          <div className="mx-auto max-w-2xl text-center">
            <span className="badge border border-indigo-100 bg-indigo-50 text-indigo-600">
              How it works
            </span>
            <h2 className="mt-4 text-3xl font-bold tracking-tight">
              Three steps to a better interview
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-500 sm:text-base">
              No scheduling, no awkward small talk — just focused practice
              whenever you have twenty minutes.
            </p>
          </div>
          <ol className="mt-12 grid gap-5 sm:grid-cols-3">
            {steps.map((step) => (
              <li key={step.n} className="card p-6">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-indigo-600 to-violet-600 text-sm font-semibold text-white">
                  {step.n}
                </span>
                <h3 className="mt-4 font-semibold">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">
                  {step.text}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </>
  )
}
