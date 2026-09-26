import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 left-1/2 h-64 w-[40rem] -translate-x-1/2 rounded-full bg-gradient-to-r from-indigo-400/20 to-violet-400/20 blur-3xl"
      />
      <div className="container-page flex flex-col items-center py-24 text-center">
        <p className="text-gradient text-7xl font-bold tracking-tight sm:text-8xl">404</p>
        <h1 className="mt-4 text-xl font-semibold">This page skipped the interview</h1>
        <p className="mt-2 max-w-md text-sm leading-relaxed text-slate-500">
          The link may be broken or the page has moved — even our AI couldn&apos;t
          predict this one.
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Link to="/" className="btn btn-primary">
            Back home
          </Link>
          <Link to="/interviews" className="btn btn-secondary">
            History
          </Link>
          <Link to="/interviews/new" className="btn btn-ghost">
            New interview
          </Link>
        </div>
      </div>
    </section>
  )
}
