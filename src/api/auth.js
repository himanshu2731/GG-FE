import { request } from './client'

export function signup(body) {
  return request('/auth/signup', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export function login(body) {
  return request('/auth/login', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export function refresh(refreshToken) {
  return request('/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({ refresh_token: refreshToken }),
  })
}
