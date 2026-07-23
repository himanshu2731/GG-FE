import { Navigate } from 'react-router-dom'
import { ROLES, useAuth } from '../../auth/AuthContext'

/** Root route: send people to login or their role dashboard (no intermediate home). */
export default function Home() {
  const { isAuthenticated, user } = useAuth()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (user?.role === ROLES.SUPER_USER) {
    return <Navigate to="/super-user" replace />
  }

  return <Navigate to="/user" replace />
}
