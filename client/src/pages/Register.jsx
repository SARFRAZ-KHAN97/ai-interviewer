import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import PasswordInput from '../components/auth/PasswordInput'
import { useAuth } from '../context/AuthContext'

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')

    if (name.trim().length < 2) {
      setError('Name must be at least 2 characters')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match')
      return
    }

    setPending(true)
    try {
      await register(name.trim(), email.trim(), password)
      navigate('/interviews', { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setPending(false)
    }
  }

  return (
    <section className="container-page flex justify-center py-14">
      <div className="card w-full max-w-md p-8">
        <div className="flex flex-col items-center text-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-sm font-bold text-white">
            AI
          </span>
          <h1 className="mt-4 text-xl font-semibold">Create your account</h1>
          <p className="mt-1 text-sm text-slate-500">
            One minute to set up — then start practicing
          </p>
        </div>

        {error && (
          <div
            role="alert"
            className="mt-5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700"
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="label" htmlFor="name">
              Name
            </label>
            <input
              id="name"
              type="text"
              required
              autoFocus
              autoComplete="name"
              placeholder="Jane Doe"
              className="input"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </div>

          <div>
            <label className="label" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              placeholder="you@example.com"
              className="input"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>

          <div>
            <label className="label" htmlFor="password">
              Password
            </label>
            <PasswordInput
              id="password"
              autoComplete="new-password"
              placeholder="At least 8 characters"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>

          <div>
            <label className="label" htmlFor="confirm">
              Confirm password
            </label>
            <PasswordInput
              id="confirm"
              autoComplete="new-password"
              placeholder="Repeat your password"
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
            />
          </div>

          <button type="submit" className="btn btn-primary w-full" disabled={pending}>
            {pending ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          Already have an account?{' '}
          <Link
            to="/login"
            className="font-medium text-indigo-600 hover:text-indigo-500"
          >
            Sign in
          </Link>
        </p>
      </div>
    </section>
  )
}
