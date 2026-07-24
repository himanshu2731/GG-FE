import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { ROLES, useAuth } from '../../auth/AuthContext'
import Button from '../../components/Button'
import Container, { Alert, Card } from '../../components/Container'
import Input, { Label } from '../../components/Input'

export default function Signup() {
  const { signup, isAuthenticated, isSuperUser } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState('')
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
    <Container variant="auth">
      <Card variant="auth">
        <h1 className="font-display mb-3 text-[2.15rem] font-semibold leading-tight tracking-tight text-heading">
          Sign up
        </h1>
        <p className="mb-8 text-[0.95rem] leading-relaxed text-body">
          Create an account to start signing documents.
        </p>

        <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
          <Input
            label="Full name"
            id="name"
            size="auth"
            type="text"
            autoComplete="name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Jane Doe"
          />

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
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 characters"
          />

          <div>
            <Label size="auth">Register as</Label>
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

          {error ? <Alert>{error}</Alert> : null}

          <Button type="submit" size="auth" fullWidth className="mt-1" disabled={loading}>
            {loading ? 'Creating account…' : 'Create account'}
          </Button>
        </form>

        <Link
          to="/login"
          className="mt-7 block text-center text-sm text-accent transition hover:text-accent-hover"
        >
          Already have an account? <span className="font-semibold">Log in</span>
        </Link>
      </Card>
    </Container>
  )
}
