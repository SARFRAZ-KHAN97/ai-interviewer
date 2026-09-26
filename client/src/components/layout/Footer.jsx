import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

const year = new Date().getFullYear()

export default function Footer() {
  const { user } = useAuth()

  return (
    <footer className="bg-slate-900 text-slate-400">
      <div className="h-1 w-full bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-500" />
      <div className="container-page grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div className="lg:pr-8">
          <Link to="/" className="flex w-fit items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 text-xs font-bold text-white">
              ST
            </span>
            <span className="bg-gradient-to-r from-indigo-300 to-violet-300 bg-clip-text text-lg font-semibold tracking-tight text-transparent">
              SkillTrace
            </span>
          </Link>
          <p className="mt-4 text-sm leading-relaxed text-slate-400">
            Voice-powered mock interviews that read your resume, ask real
            questions, and grade your answers.
          </p>
          <span className="badge mt-4 border border-indigo-400/30 bg-indigo-500/10 text-indigo-300">
            Powered by Gemini
          </span>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-white">Product</h3>
          <ul className="mt-4 space-y-2.5 text-sm">
            <li>
              <Link to="/" className="transition hover:text-indigo-300">
                Home
              </Link>
            </li>
            <li>
              <Link to="/interviews/new" className="transition hover:text-indigo-300">
                New interview
              </Link>
            </li>
            <li>
              <Link to="/interviews" className="transition hover:text-indigo-300">
                Interview history
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-white">Account</h3>
          <ul className="mt-4 space-y-2.5 text-sm">
            {user ? (
              <li>
                <Link to="/resumes" className="transition hover:text-indigo-300">
                  My resumes
                </Link>
              </li>
            ) : (
              <>
                <li>
                  <Link to="/login" className="transition hover:text-indigo-300">
                    Sign in
                  </Link>
                </li>
                <li>
                  <Link to="/register" className="transition hover:text-indigo-300">
                    Create account
                  </Link>
                </li>
              </>
            )}
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-white">
            Ready to practice?
          </h3>
          <p className="mt-4 text-sm leading-relaxed text-slate-400">
            Twenty minutes today beats an hour of cramming the night before.
          </p>
          <Link to={user ? '/interviews/new' : '/register'} className="btn btn-primary mt-4">
            {user ? 'Start an interview' : 'Get started free'}
          </Link>
        </div>
      </div>

      <div className="border-t border-slate-800">
        <div className="container-page flex flex-col items-center justify-between gap-2 py-4 text-xs text-slate-500 sm:flex-row">
          <p>© {year} SkillTrace. All rights reserved.</p>
          <p>Built with React, Express &amp; MongoDB</p>
        </div>
      </div>
    </footer>
  )
}
