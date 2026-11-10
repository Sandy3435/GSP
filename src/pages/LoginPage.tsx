import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Logo from '../components/Logo'

export default function LoginPage() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (user) return <Navigate to="/" replace />

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    const res = login(email, password)
    setSubmitting(false)
    if (res.ok) navigate('/')
    else setError(res.error ?? 'Login failed.')
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-surface px-margin py-space-xl">
      <div className="w-full max-w-sm space-y-space-lg">
        <div className="flex flex-col items-center gap-space-sm text-center">
          <Logo size="lg" withWordmark />
          <h1 className="text-headline-lg-mobile font-bold tracking-tight text-primary">
            Welcome back
          </h1>
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            Sign in to continue your college journey.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-space-md rounded-2xl bg-surface-container-lowest p-space-lg shadow-md"
        >
          <div className="flex flex-col gap-1">
            <label
              htmlFor="email"
              className="font-label-xs text-label-xs font-bold uppercase tracking-wider text-on-surface-variant"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="h-11 w-full rounded-xl bg-surface-container-low px-3.5 font-body-sm text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-secondary/40"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label
              htmlFor="password"
              className="font-label-xs text-label-xs font-bold uppercase tracking-wider text-on-surface-variant"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="h-11 w-full rounded-xl bg-surface-container-low px-3.5 font-body-sm text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-secondary/40"
            />
          </div>

          {error && (
            <div className="rounded-lg bg-error-container px-3 py-2 font-label-sm text-label-sm text-on-error-container">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary-container font-label-md text-label-md font-bold text-on-primary shadow-sm transition-all hover:opacity-95 active:scale-[0.98] disabled:opacity-60"
          >
            {submitting ? (
              <>
                <span className="material-symbols-outlined animate-spin text-[18px]">
                  progress_activity
                </span>
                Signing in…
              </>
            ) : (
              <>
                <span>Sign In</span>
                <span className="material-symbols-outlined text-[18px]">
                  arrow_forward
                </span>
              </>
            )}
          </button>

          <p className="text-center font-label-sm text-label-sm text-on-surface-variant">
            New here?{' '}
            <Link
              to="/signup"
              className="font-bold text-secondary hover:underline"
            >
              Create an account
            </Link>
          </p>
        </form>

        <p className="text-center font-label-xs text-label-xs text-on-surface-variant/70">
          Demo: sign up first, then log in. Admin access requires code
          GSP-ADMIN-2026.
        </p>
      </div>
    </div>
  )
}
