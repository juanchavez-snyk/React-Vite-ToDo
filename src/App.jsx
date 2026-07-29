import { useEffect, useState } from 'react'
import TodoItem from './components/TodoItem.jsx'
import AddTodo from './components/AddTodo.jsx'
import SharedNote from './components/SharedNote.jsx'
import { fetchTodos, createTodo, updateTodo, deleteTodo } from './api.js'

const FILTERS = ['all', 'active', 'done']

export default function App() {
  const [todos, setTodos] = useState([])
  const [filter, setFilter] = useState('all')
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchTodos()
      .then(setTodos)
      .catch((e) => setError(e.message))
  }, [])

  async function handleAdd(title, notes) {
    const created = await createTodo({ title, notes })
    setTodos((prev) => [...prev, created])
  }

  async function handleToggle(todo) {
    const saved = await updateTodo(todo.id, { done: !todo.done })
    setTodos((prev) => prev.map((t) => (t.id === saved.id ? saved : t)))
  }

  async function handleDelete(id) {
    await deleteTodo(id)
    setTodos((prev) => prev.filter((t) => t.id !== id))
  }

  const visible = todos.filter((t) => {
    if (filter === 'active') return !t.done
    if (filter === 'done') return t.done
    return true
  })

  const remaining = todos.filter((t) => !t.done).length

  return (
    <main className="app">
      <header>
        <h1>Todo</h1>
        <p className="sub">
          {remaining} item{remaining === 1 ? '' : 's'} left
        </p>
      </header>

      <SharedNote />

      <AddTodo onAdd={handleAdd} />

      <nav className="filters">
        {FILTERS.map((f) => (
          <button
            key={f}
            className={filter === f ? 'active' : ''}
            onClick={() => setFilter(f)}
          >
            {f}
          </button>
        ))}
      </nav>

      {error && <p className="error">API unreachable: {error}</p>}

      <ul className="list">
        {visible.map((todo) => (
          <TodoItem
            key={todo.id}
            todo={todo}
            onToggle={() => handleToggle(todo)}
            onDelete={() => handleDelete(todo.id)}
          />
        ))}
      </ul>

      {!visible.length && !error && <p className="empty">Nothing here yet.</p>}
    </main>
  )
}
