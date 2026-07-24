import { clearSession, getAccessToken } from '../auth/tokenStorage'

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')

const AUTH_PUBLIC_PATHS = ['/auth/login', '/auth/signup', '/auth/refresh']

let redirectingToLogin = false

function isAuthPublicPath(path) {
  return AUTH_PUBLIC_PATHS.some((p) => path === p || path.startsWith(`${p}?`))
}

function redirectToLoginForExpiredSession() {
  if (redirectingToLogin) return
  redirectingToLogin = true
  clearSession()

  const { pathname, search } = window.location
  if (pathname === '/login') return

  const params = new URLSearchParams({ reason: 'expired' })
  const next = `${pathname}${search}`
  if (next && next !== '/') {
    params.set('next', next)
  }
  window.location.assign(`/login?${params.toString()}`)
}

export async function request(path, options = {}) {
  const headers = {
    ...(options.headers || {}),
  }

  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData
  if (!isFormData && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json'
  }

  const token = getAccessToken()
  if (token && !headers.Authorization) {
    headers.Authorization = `Bearer ${token}`
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  })

  if (response.status === 204) {
    if (!response.ok) {
      throw Object.assign(new Error('Request failed'), { status: response.status })
    }
    return null
  }

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    if (response.status === 401 && !isAuthPublicPath(path)) {
      redirectToLoginForExpiredSession()
    }
    const error = new Error(data.error || 'Request failed')
    error.status = response.status
    error.data = data
    throw error
  }

  return data
}
