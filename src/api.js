const BASE_URL = '/api'

// Session token is held in memory only - never hardcoded, never persisted.
let authToken = null

export function setAuthToken(token) {
  authToken = token
}

async function request(path, options = {}) {
  const headers = { ...(options.headers || {}) }
  if (options.body) headers['Content-Type'] = 'application/json'
  if (authToken) headers.Authorization = `Bearer ${authToken}`

  const response = await fetch(`${BASE_URL}${path}`, { ...options, headers })

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`)
  }

  if (response.status === 204) return null
  return response.json()
}

export function fetchTodos() {
  return request('/todos')
}

export function createTodo(todo) {
  return request('/todos', { method: 'POST', body: JSON.stringify(todo) })
}

export function updateTodo(id, patch) {
  return request(`/todos/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  })
}

export function deleteTodo(id) {
  return request(`/todos/${encodeURIComponent(id)}`, { method: 'DELETE' })
}
