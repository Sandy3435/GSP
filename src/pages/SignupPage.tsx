import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Logo from '../components/Logo'

export default function SignupPage() {
  const { user, signup } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [adminCode, setAdminCode] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (user) return <Navigate to="/" replace />

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    setSubmitting(true)
    const res = await signup({ name, email, password, adminCode })
    setSubmitting(false)
    if (res.ok) navigate('/')
    else setError(res.error ?? 'Signup failed.')
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-surface px-margin py-space-xl">
      <div className="w-full max-w-sm space-y-space-lg">
        <div className="flex flex-col items-center gap-space-sm text-center">
          <Logo size="lg" withWordmark />
          <h1 className="text-headline-lg-mobile font-bold tracking-tight text-primary">
            Join the Commons
          </h1>
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            Create your free account to start matching opportunities.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-space-md rounded-2xl bg-surface-container-lowest p-space-lg shadow-md"
        >
          <div className="flex flex-col gap-1">
            <label className="font-label-xs text-label-xs font-bold uppercase tracking-wider text-on-surface-variant">
              Full name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Maya Chen"
              className="h-11 w-full rounded-xl bg-surface-container-low px-3.5 font-body-sm text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-secondary/40"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="font-label-xs text-label-xs font-bold uppercase tracking-wider text-on-surface-variant">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="h-11 w-full rounded-xl bg-surface-container-low px-3.5 font-body-sm text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-secondary/40"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1">
              <label className="font-label-xs text-label-xs font-bold uppercase tracking-wider text-on-surface-variant">
                Password
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••"
                className="h-11 w-full rounded-xl bg-surface-container-low px-3.5 font-body-sm text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-secondary/40"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="font-label-xs text-label-xs font-bold uppercase tracking-wider text-on-surface-variant">
                Confirm
              </label>
              <input
                type="password"
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="••••••"
                className="h-11 w-full rounded-xl bg-surface-container-low px-3.5 font-body-sm text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-secondary/40"
              />
            </div>
          </div>

          <details className="rounded-lg bg-surface-container-low p-2">
            <summary className="cursor-pointer font-label-xs text-label-xs font-semibold text-on-surface-variant">
              Admin access (optional)
            </summary>
            <input
              type="text"
              value={adminCode}
              onChange={(e) => setAdminCode(e.target.value)}
              placeholder="Admin code"
              className="mt-2 h-10 w-full rounded-lg bg-surface-container-lowest px-3 font-body-sm text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-secondary/40"
            />
          </details>

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
                Creating account…
              </>
            ) : (
              <>
                <span>Create Account</span>
                <span className="material-symbols-outlined text-[18px]">
                  arrow_forward
                </span>
              </>
            )}
          </button>

          <p className="text-center font-label-sm text-label-sm text-on-surface-variant">
            Already have an account?{' '}
            <Link to="/login" className="font-bold text-secondary hover:underline">
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
