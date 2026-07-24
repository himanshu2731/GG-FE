import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { ROLES, useAuth } from '../../auth/AuthContext'
import Button from '../../components/Button'
import Container, { Alert, Card } from '../../components/Container'
import Input, { Label } from '../../components/Input'

const SESSION_EXPIRED_MESSAGE = 'Your session has expired. Please log in again.'

export default function Login() {
  const { login, isAuthenticated, isSuperUser } = useAuth()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState(ROLES.USER)
  const [error, setError] = useState(() =>
    searchParams.get('reason') === 'expired' ? SESSION_EXPIRED_MESSAGE : '',
  )
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (searchParams.get('reason') !== 'expired') return
    setError(SESSION_EXPIRED_MESSAGE)
    const next = new URLSearchParams(searchParams)
    next.delete('reason')
    setSearchParams(next, { replace: true })
  }, [searchParams, setSearchParams])

  if (isAuthenticated) {
    return <Navigate to={isSuperUser ? '/super-user' : '/user'} replace />
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const user = await login({ email, password, role })
      const next = searchParams.get('next')
      if (next && next.startsWith('/')) {
        navigate(next, { replace: true })
      } else if (user.role === ROLES.SUPER_USER) {
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
    <Container variant="auth">
      <Card variant="auth">
        <h1 className="font-display mb-3 text-[2.15rem] font-semibold leading-tight tracking-tight text-heading">
          Log in
        </h1>
        <p className="mb-8 text-[0.95rem] leading-relaxed text-body">
          Choose your role, then sign in with email and password.
        </p>

        <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
          <div>
            <Label size="auth">Login as</Label>
            <div className="grid grid-cols-2 gap-2.5">
              <Button
                type="button"
                variant="toggle"
                selected={role === ROLES.USER}
                onClick={() => setRole(ROLES.USER)}
              >
                User
              </Button>
              <Button
                type="button"
                variant="toggle"
                selected={role === ROLES.SUPER_USER}
                onClick={() => setRole(ROLES.SUPER_USER)}
              >
                Super User
              </Button>
            </div>
          </div>

          <Input
            label="Email"
            id="email"
            size="auth"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />

          <Input
            label="Password"
            id="password"
            size="auth"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Your password"
          />

          {error ? <Alert>{error}</Alert> : null}

          <Button type="submit" size="auth" fullWidth className="mt-1" disabled={loading}>
            {loading
              ? 'Signing in…'
              : role === ROLES.SUPER_USER
                ? 'Log in as Super User'
                : 'Log in as User'}
          </Button>
        </form>

        <Link
          to="/signup"
          className="mt-7 block text-center text-sm text-accent transition hover:text-accent-hover"
        >
          Need an account? <span className="font-semibold">Sign up</span>
        </Link>
      </Card>
    </Container>
  )
}
