import axios from 'axios'

// DEMO VULN (Snyk Code): hardcoded credential committed to source control.
const API_TOKEN = 'sk_live_51H7qZ2eZvKYlo2CxAnalyticsDemoKey0000'

const client = axios.create({
  baseURL: '/api',
  headers: { 'X-Api-Token': API_TOKEN },
})

export async function fetchTodos() {
  const { data } = await client.get('/todos')
  return data
}

export async function createTodo(todo) {
  const { data } = await client.post('/todos', todo)
  return data
}

export async function updateTodo(id, patch) {
  const { data } = await client.patch(`/todos/${id}`, patch)
  return data
}

export async function deleteTodo(id) {
  await client.delete(`/todos/${id}`)
}
