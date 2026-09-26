import { useEffect, useRef, useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'

const links = [
  { to: '/', label: 'Home', end: true },
  { to: '/resumes', label: 'Resumes' },
  { to: '/interviews', label: 'History' },
  { to: '/interviews/new', label: 'New interview' },
]

const linkClass = ({ isActive }) =>
  `rounded-lg px-3 py-2 text-sm font-medium transition ${
    isActive
      ? 'bg-indigo-50 text-indigo-600'
      : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
  }`

const mobileLinkClass = ({ isActive }) =>
  `block rounded-lg px-3 py-2.5 text-sm font-medium transition ${
    isActive
      ? 'bg-indigo-50 text-indigo-600'
      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
  }`

export default function Navbar() {
  const { user, loading, logout } = useAuth()
  const { toast } = useToast()
  const [menuOpen, setMenuOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const profileRef = useRef(null)

  useEffect(() => {
    if (!profileOpen) return undefined
    const onPointerDown = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setProfileOpen(false)
      }
    }
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setProfileOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [profileOpen])

  const handleLogout = async () => {
    setMenuOpen(false)
    setProfileOpen(false)
    await logout()
    toast.success('Signed out')
  }

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/60 bg-white/70 backdrop-blur-md">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Link to="/" className="flex shrink-0 items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600 text-xs font-bold text-white">
            ST
          </span>
          <span className="text-gradient text-lg font-semibold tracking-tight">
            SkillTrace
          </span>
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          {user &&
            links.map((link) => (
              <NavLink key={link.to} to={link.to} end={link.end} className={linkClass}>
                {link.label}
              </NavLink>
            ))}

          {loading ? (
            <div className="h-9 w-28 animate-pulse rounded-lg bg-slate-100" />
          ) : user ? (
            <div className="relative ml-2" ref={profileRef}>
              <button
                type="button"
                onClick={() => setProfileOpen((open) => !open)}
                aria-expanded={profileOpen}
                aria-haspopup="menu"
                className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2.5 transition hover:bg-slate-100"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-indigo-600 to-violet-600 text-xs font-semibold text-white">
                  {user.name.charAt(0).toUpperCase()}
                </span>
                <span className="hidden text-sm font-medium text-slate-700 lg:block">
                  {user.name}
                </span>
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  className={`h-4 w-4 text-slate-400 transition-transform ${
                    profileOpen ? 'rotate-180' : ''
                  }`}
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>

              {profileOpen && (
                <div
                  role="menu"
                  className="absolute right-0 top-full z-50 mt-2 w-60 rounded-xl border border-slate-200/80 bg-white p-1.5 shadow-xl"
                >
                  <div className="px-3 py-2">
                    <p className="truncate text-sm font-semibold text-slate-800">
                      {user.name}
                    </p>
                    {user.email && (
                      <p className="truncate text-xs text-slate-400">{user.email}</p>
                    )}
                  </div>
                  <div className="mx-1 my-1 h-px bg-slate-100" />
                  <button
                    type="button"
                    role="menuitem"
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-rose-600 transition hover:bg-rose-50"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      className="h-4 w-4"
                    >
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
                    </svg>
                    Sign out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="ml-2 flex items-center gap-2">
              <Link to="/login" className="btn btn-ghost h-9">
                Sign in
              </Link>
              <Link to="/register" className="btn btn-primary h-9">
                Get started
              </Link>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          aria-expanded={menuOpen}
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          className="btn btn-ghost h-9 px-2 md:hidden"
        >
          {menuOpen ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          )}
        </button>
      </div>

      {menuOpen && (
        <div className="absolute inset-x-0 top-16 border-b border-slate-200/60 bg-white px-4 py-4 shadow-lg md:hidden">
          {user && (
            <nav className="flex flex-col gap-1">
              {links.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.end}
                  className={mobileLinkClass}
                  onClick={() => setMenuOpen(false)}
                >
                  {link.label}
                </NavLink>
              ))}
            </nav>
          )}

          <div className={`border-slate-100 pt-3 ${user ? 'mt-2 border-t' : ''}`}>
            {loading ? (
              <div className="h-9 w-28 animate-pulse rounded-lg bg-slate-100" />
            ) : user ? (
              <div className="flex items-center justify-between gap-3">
                <span className="flex min-w-0 items-center gap-2 text-sm font-medium text-slate-700">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-600 to-violet-600 text-xs font-semibold text-white">
                    {user.name.charAt(0).toUpperCase()}
                  </span>
                  <span className="truncate">{user.name}</span>
                </span>
                <button type="button" onClick={handleLogout} className="btn btn-ghost h-9 shrink-0">
                  Sign out
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Link
                  to="/login"
                  className="btn btn-secondary flex-1"
                  onClick={() => setMenuOpen(false)}
                >
                  Sign in
                </Link>
                <Link
                  to="/register"
                  className="btn btn-primary flex-1"
                  onClick={() => setMenuOpen(false)}
                >
                  Get started
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
