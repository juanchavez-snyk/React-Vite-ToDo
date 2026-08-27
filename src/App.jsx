import { useEffect, useState } from 'react'
import TodoItem from './components/TodoItem.jsx'
import AddTodo from './components/AddTodo.jsx'
import SharedNote from './components/SharedNote.jsx'
import { fetchTodos, createTodo, updateTodo, deleteTodo } from './api.js'
import { downloadIcs } from './calendar.js'
import { summarize } from './stats.js'

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

  const visible = todos.filter((item) => {
    if (filter === 'active') return !item.done
    if (filter === 'done') return item.done
    return true
  })

  const remaining = todos.filter((item) => !item.done).length

  // Uses lodash 3 APIs that lodash 4 removed — see src/stats.js.
  const stats = summarize(todos)

  return (
    <main className="app">
      <header>
        <h1>Todo</h1>
        <p className="sub">
          {remaining} item{remaining === 1 ? '' : 's'} left
        </p>
        {stats.tags.length > 0 && (
          <p className="tags">
            tags: {stats.tags.join(', ')}
            {stats.hasUrgent ? ' ⚠' : ''}
          </p>
        )}
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
        <button className="export" onClick={() => downloadIcs(todos)}>
          export .ics
        </button>
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
