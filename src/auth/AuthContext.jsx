import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import * as authApi from '../api/auth'
import { clearSession, getUser, setSession } from './tokenStorage'

export const ROLES = {
  USER: 'USER',
  SUPER_USER: 'SUPER_USER',
}

const AuthContext = createContext(null)

function mapAuthResponse(data) {
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    user: data.user,
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => getUser())

  const applySession = useCallback((data) => {
    const session = mapAuthResponse(data)
    setSession(session)
    setUser(session.user)
    return session.user
  }, [])

  const signup = useCallback(
    async (payload) => {
      const data = await authApi.signup(payload)
      return applySession(data)
    },
    [applySession],
  )

  const login = useCallback(
    async ({ email, password, role }) => {
      const data = await authApi.login({ email, password })

      if (data.user?.role !== role) {
        clearSession()
        const accountRole = data.user?.role === ROLES.SUPER_USER ? 'Super User' : 'User'
        const selectedRole = role === ROLES.SUPER_USER ? 'Super User' : 'User'
        throw new Error(
          `This account is a ${accountRole}. Please log in as ${accountRole}, not ${selectedRole}.`,
        )
      }

      return applySession(data)
    },
    [applySession],
  )

  const logout = useCallback(() => {
    clearSession()
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isSuperUser: user?.role === ROLES.SUPER_USER,
      isUser: user?.role === ROLES.USER,
      signup,
      login,
      logout,
    }),
    [user, signup, login, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return ctx
}
