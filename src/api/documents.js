import { request } from './client'

export function listUsers() {
  return request('/users')
}

export function listDocuments(params = {}) {
  const query = new URLSearchParams()
  if (params.status) query.set('status', params.status)
  if (params.page) query.set('page', String(params.page))
  if (params.limit) query.set('limit', String(params.limit))
  const qs = query.toString()
  return request(`/documents${qs ? `?${qs}` : ''}`)
}

export function uploadDocument(formData) {
  return request('/documents/upload', {
    method: 'POST',
    body: formData,
  })
}
