import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { ROLES, useAuth } from '../../auth/AuthContext'

const inputClass =
  'w-full rounded-md border border-border bg-input px-3 py-2.5 text-heading outline-none placeholder:text-muted focus:border-accent'
const labelClass = 'mb-1.5 block text-sm font-medium text-heading'

export default function Signup() {
  const { signup, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState(ROLES.USER)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (isAuthenticated) {
    return <Navigate to="/" replace />
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    setLoading(true)
    try {
      await signup({ name, email, password, role })
      if (role === ROLES.SUPER_USER) {
        navigate('/super-user', { replace: true })
      } else {
        navigate('/user', { replace: true })
      }
    } catch (err) {
      setError(err.message || 'Signup failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="grid min-h-svh place-items-center p-6">
      <div className="w-full max-w-[420px] rounded-[10px] border border-border bg-gradient-to-b from-surface to-[#10141c] p-8 shadow-[0_18px_40px_rgba(0,0,0,0.45)]">
        <h1 className="mb-2.5 text-[1.75rem] font-semibold text-heading">Sign up</h1>
        <p className="mb-6 text-body">Create an account to start signing documents.</p>

        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <div>
            <label className={labelClass} htmlFor="name">
              Full name
            </label>
            <input
              id="name"
              type="text"
              autoComplete="name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClass}
              placeholder="Jane Doe"
            />
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
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
              placeholder="At least 8 characters"
            />
          </div>

          <div>
            <span className={labelClass}>Register as</span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setRole(ROLES.USER)}
                className={`min-h-[42px] rounded-md border px-3 text-sm font-semibold ${
                  role === ROLES.USER
                    ? 'border-accent bg-accent/15 text-accent'
                    : 'border-border text-body hover:border-border-strong'
                }`}
              >
                User
              </button>
              <button
                type="button"
                onClick={() => setRole(ROLES.SUPER_USER)}
                className={`min-h-[42px] rounded-md border px-3 text-sm font-semibold ${
                  role === ROLES.SUPER_USER
                    ? 'border-accent bg-accent/15 text-accent'
                    : 'border-border text-body hover:border-border-strong'
                }`}
              >
                Super User
              </button>
            </div>
          </div>

          {error ? (
            <p className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="mt-1 inline-flex min-h-[44px] items-center justify-center rounded-md bg-accent px-4 font-semibold text-[#04110f] hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <Link to="/login" className="mt-5 block text-accent hover:text-accent-hover">
          Already have an account? Log in
        </Link>
        <Link to="/" className="mt-3 block text-muted hover:text-body">
          Back home
        </Link>
      </div>
    </main>
  )
}
