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

export function getDocument(id) {
  return request(`/documents/${id}`)
}

export function uploadDocument(formData) {
  return request('/documents/upload', {
    method: 'POST',
    body: formData,
  })
}

export function updateDocument(id, payload) {
  return request(`/documents/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

export function deleteDocument(id) {
  return request(`/documents/${id}`, {
    method: 'DELETE',
  })
}

export function userSignDocument(id, signatureBlob) {
  const body = new FormData()
  body.append('signature', signatureBlob, 'signature.png')
  return request(`/documents/${id}/user-sign`, {
    method: 'POST',
    body,
  })
}
