import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { ROLES, useAuth } from '../../auth/AuthContext'

const inputClass =
  'w-full rounded-xl border border-border bg-input px-3.5 py-3 text-[0.95rem] text-heading outline-none placeholder:text-muted/80 transition focus:border-accent focus:ring-1 focus:ring-accent/30'
const labelClass = 'mb-2 block text-[0.8rem] font-medium tracking-wide text-heading/90'

export default function Login() {
  const { login, isAuthenticated, isSuperUser } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState(ROLES.USER)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (isAuthenticated) {
    return <Navigate to={isSuperUser ? '/super-user' : '/user'} replace />
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const user = await login({ email, password, role })
      if (user.role === ROLES.SUPER_USER) {
        navigate('/super-user', { replace: true })
      } else {
        navigate('/user', { replace: true })
      }
    } catch (err) {
      setError(err.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="grid min-h-svh place-items-center p-6">
      <div className="w-full max-w-[440px] rounded-3xl border border-border bg-surface/80 p-8 shadow-[0_24px_60px_rgba(0,0,0,0.55)] backdrop-blur-xl sm:p-10">
        <h1 className="font-display mb-3 text-[2.15rem] font-semibold leading-tight tracking-tight text-heading">
          Log in
        </h1>
        <p className="mb-8 text-[0.95rem] leading-relaxed text-body">
          Choose your role, then sign in with email and password.
        </p>

        <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
          <div>
            <span className={labelClass}>Login as</span>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setRole(ROLES.USER)}
                className={`min-h-[44px] rounded-xl border px-3 text-sm font-semibold transition ${
                  role === ROLES.USER
                    ? 'border-accent/70 bg-accent/20 text-accent-hover'
                    : 'border-white/10 bg-black/25 text-body hover:border-border-strong hover:text-heading'
                }`}
              >
                User
              </button>
              <button
                type="button"
                onClick={() => setRole(ROLES.SUPER_USER)}
                className={`min-h-[44px] rounded-xl border px-3 text-sm font-semibold transition ${
                  role === ROLES.SUPER_USER
                    ? 'border-accent/70 bg-accent/20 text-accent-hover'
                    : 'border-white/10 bg-black/25 text-body hover:border-border-strong hover:text-heading'
                }`}
              >
                Super User
              </button>
            </div>
          </div>

          <div>
            <label className={labelClass} htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className={labelClass} htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
              placeholder="Your password"
            />
          </div>

          {error ? (
            <p className="rounded-xl border border-danger/30 bg-danger/10 px-3.5 py-2.5 text-sm text-danger">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="mt-1 inline-flex min-h-[48px] items-center justify-center rounded-xl bg-accent px-4 text-[0.95rem] font-semibold text-black shadow-[0_10px_28px_rgba(255,255,255,0.06)] transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading
              ? 'Signing in…'
              : role === ROLES.SUPER_USER
                ? 'Log in as Super User'
                : 'Log in as User'}
          </button>
        </form>

        <Link
          to="/signup"
          className="mt-7 block text-center text-sm text-accent transition hover:text-accent-hover"
        >
          Need an account? <span className="font-semibold">Sign up</span>
        </Link>
      </div>
    </main>
  )
}
