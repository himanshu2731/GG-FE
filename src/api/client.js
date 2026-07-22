import { getAccessToken } from '../auth/tokenStorage'

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')

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
    const error = new Error(data.error || 'Request failed')
    error.status = response.status
    error.data = data
    throw error
  }

  return data
}
